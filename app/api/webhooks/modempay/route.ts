import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {pool} from '../../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const json=(body:object,status:number)=>NextResponse.json(body,{status,headers});

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
 try{
  const result=await pool.query('INSERT INTO public.payment_events(event_id) VALUES($1) ON CONFLICT (event_id) DO NOTHING RETURNING event_id',[id]);
  return json({received:true,duplicate:result.rowCount===0,ticketIssued:false},200);
 }catch{return json({error:'Unable to persist event; retry later'},503);}
}
