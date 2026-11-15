import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {pool} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const token=new URL(req.url).searchParams.get('token')||'';
 const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))
  return NextResponse.json({error:'Invalid private ticket link'},{status:400,headers});
 if(process.env.MODEMPAY_MODE!=='sandbox'||process.env.PAYMENTS_ENABLED!=='false')
  return NextResponse.json({error:'Sandbox ticket lookup disabled'},{status:503,headers});
 const digest=createHash('sha256').update(token).digest('hex');
 try{
 const r=await pool.query(`SELECT a.reservation_id,r.status AS reservation_status,r.hold_expires_at,
   t.origin,t.destination,t.departure_at,t.capacity,r.seat_number,r.amount_bututs,
   st.service_name,tt.id AS ticket_id,tt.issued_at,tt.provider_charge_id
   FROM public.sandbox_ticket_access a
   JOIN public.reservations r ON r.id=a.reservation_id
   JOIN public.trips t ON t.id=r.trip_id
   LEFT JOIN public.service_timetables st ON st.code=t.service_code
   LEFT JOIN public.sandbox_test_tickets tt ON tt.reservation_id=r.id
   WHERE a.access_hash=$1`,[digest]);
 if(!r.rowCount)return NextResponse.json({error:'Test ticket reference not found'},{status:404,headers});
 const x=r.rows[0];
 const paid=x.reservation_status==='test_confirmed'&&Boolean(x.ticket_id);
 return NextResponse.json({environment:'sandbox',validForTravel:false,realPaymentCollected:false,
   status:paid?'test_ticket_issued':x.reservation_status==='held'&&new Date(x.hold_expires_at)>new Date()?'waiting_for_test_payment':'hold_expired_or_unavailable',
   ticket:paid?{ticketId:x.ticket_id,reference:x.reservation_id,
    service:x.service_name,origin:x.origin,destination:x.destination,
    departureAt:x.departure_at,seatNumber:x.seat_number,
    fareBututs:x.amount_bututs,issuedAt:x.issued_at,
    paymentStatus:'TEST PAYMENT SIMULATED',label:'SANDBOX - NOT VALID FOR TRAVEL'}:null
 },{headers});
 }catch{return NextResponse.json({error:'Ticket lookup unavailable'},{status:503,headers});}
}
