import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {pool} from '../../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const json=(body:Record<string,unknown>,status:number)=>{
 // Log only static response categories. Never log webhook headers, bodies, signatures or secrets.
 const category=typeof body.error==='string'?body.error:status===200?'Accepted':'Other';
 console.info('GTSC webhook delivery',JSON.stringify({status,category}));
 return NextResponse.json(body,{status,headers});
};

// Sandbox-only ingestion. This intentionally NEVER confirms a reservation or
// issues a ticket. Live event processing requires a separately reviewed flow.
export async function POST(req:Request){
 if(process.env.MODEMPAY_MODE!=='sandbox')return json({error:'Sandbox webhook only'},503);
 const secret=process.env.MODEMPAY_WEBHOOK_SECRET;
 if(!secret)return json({error:'Webhook is not configured'},503);
 const sig=req.headers.get('x-modem-signature');
 if(!sig||!/^[a-f0-9]{128}$/i.test(sig))return json({error:'Invalid signature'},401);
 const maxBytes=128*1024;
 const length=Number(req.headers.get('content-length')||0);
 if(length>maxBytes)return json({error:'Payload too large'},413);
 let body:string;
 try{
  body=await req.text();
  if(Buffer.byteLength(body,'utf8')>maxBytes)return json({error:'Payload too large'},413);
 }catch{return json({error:'Invalid body'},400);}
 const actual=Buffer.from(sig.toLowerCase(),'hex');
 const expected=createHmac('sha512',secret).update(body,'utf8').digest();
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return json({error:'Invalid signature'},401);
 let event:unknown;
 try{event=JSON.parse(body);}catch{return json({error:'Invalid JSON'},400);}
 if(!event||typeof event!=='object')return json({error:'Invalid event'},400);
 const data=event as Record<string,unknown>;
 const payload=data.payload;
 if(typeof data.event!=='string'||!payload||typeof payload!=='object')return json({error:'Invalid event'},400);
 const p=payload as Record<string,unknown>;
 if(p.test_mode!==true)return json({error:'Only sandbox events accepted'},403);
 // A provider's charge identifier is stable across redelivery. Compound event
 // type + charge ID avoids collisions between different event types.
 const chargeId=p.id;
 if(typeof chargeId!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(chargeId)||data.event.length>100)return json({error:'Invalid event ID'},400);
 const id=data.event+':'+chargeId;
 const rawMetadata=p.metadata;
 const metadata=rawMetadata&&typeof rawMetadata==='object'&&!Array.isArray(rawMetadata)
  ?rawMetadata as Record<string,unknown>:{};
 const candidate=metadata.reservation_id;
 const reservationId=typeof candidate==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)?candidate:null;
 // Modem Pay amounts are GMD decimal units, whereas GTSC stores integer bututs.
 const amount=typeof p.amount==='number'&&Number.isFinite(p.amount)&&p.amount>=0&&Number.isSafeInteger(Math.round(p.amount*100))
  ?Math.round(p.amount*100):null;
 const currency=typeof p.currency==='string'?p.currency.toUpperCase().slice(0,8):null;
 const client=await pool.connect().catch(()=>null);
 if(!client)return json({error:'Unable to persist event; retry later'},503);
 try{
  await client.query('BEGIN');
  const inserted=await client.query('INSERT INTO public.payment_events(event_id) VALUES($1) ON CONFLICT (event_id) DO NOTHING RETURNING event_id',[id]);
  if(inserted.rowCount===0){await client.query('COMMIT');return json({received:true,duplicate:true,ticketIssued:false},200);}
  let matchStatus='other_event';
  let ticketIssued=false;
  if(data.event==='charge.succeeded'){
   matchStatus='unlinked';
   if(reservationId){
    const candidate=await client.query('SELECT trip_id,seat_number FROM public.reservations WHERE id=$1',[reservationId]);
    if(!candidate.rowCount)matchStatus='reservation_missing';
    else{
     const tripId=candidate.rows[0].trip_id;
     const seatNumber=candidate.rows[0].seat_number;
     await client.query('SELECT pg_advisory_xact_lock(hashtext($1),$2)',[tripId,seatNumber]);
     const result=await client.query(`SELECT r.id,r.trip_id,r.seat_number,r.amount_bututs,
       r.status,r.hold_expires_at,t.fare_bututs,t.departure_at,t.active
       FROM public.reservations r JOIN public.trips t ON t.id=r.trip_id
       WHERE r.id=$1 FOR UPDATE OF r`,[reservationId]);
     if(!result.rowCount)matchStatus='reservation_missing';
     else{
      const r=result.rows[0];
      if(r.status==='test_confirmed')matchStatus='test_ticket_duplicate';
      else if(currency!=='GMD'||amount===null||amount!==r.amount_bututs||r.amount_bututs!==r.fare_bututs)matchStatus='amount_mismatch';
      else if(r.status!=='held')matchStatus='status_invalid';
      else if(new Date(r.hold_expires_at).getTime()<=Date.now()||new Date(r.departure_at).getTime()<=Date.now()||r.active!==true)matchStatus='hold_expired';
      else if(process.env.SANDBOX_TEST_TICKETS_ENABLED!=='true'||process.env.PAYMENTS_ENABLED!=='false')matchStatus='test_tickets_disabled';
      else{
       const attempt=await client.query("SELECT state,created_at FROM public.sandbox_checkout_attempts WHERE reservation_id=$1",[reservationId]);
       if(attempt.rows[0]?.state!=='created')matchStatus='checkout_missing';
       else{
        const blocked=await client.query(`SELECT 1 FROM public.reservations WHERE trip_id=$1 AND seat_number=$2
          AND id<>$3 AND (status IN ('confirmed','test_confirmed') OR (status='held' AND hold_expires_at>now())) LIMIT 1`,
          [r.trip_id,r.seat_number,r.id]);
        if(blocked.rowCount)matchStatus='seat_taken';
        else{
         const updated=await client.query(`UPDATE public.reservations SET status='test_confirmed',provider_payment_id=$2
           WHERE id=$1 AND status='held' AND hold_expires_at>now() RETURNING id`,[r.id,chargeId]);
         if(updated.rowCount===1){
          const issued=await client.query(`INSERT INTO public.sandbox_test_tickets
           (reservation_id,trip_id,seat_number,provider_charge_id,amount_bututs)
           VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,
           [r.id,r.trip_id,r.seat_number,chargeId,amount]);
          if(issued.rowCount!==1)throw new Error('Ticket uniqueness conflict');
          matchStatus='test_ticket_issued';ticketIssued=true;
         }else matchStatus='hold_expired';
        }
       }
      }
     }
    }
   }
  }
  await client.query(`INSERT INTO public.sandbox_payment_audit
   (event_id,reservation_id,payment_id,event_type,amount_bututs,currency,match_status)
   VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (event_id) DO NOTHING`,
   [id,reservationId,chargeId,data.event,amount,currency,matchStatus]);
  await client.query('COMMIT');
  return json({received:true,duplicate:false,sandbox:true,testTicketIssued:ticketIssued},200);
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return json({error:'Unable to persist event; retry later'},503);
 }finally{client.release();}
}
