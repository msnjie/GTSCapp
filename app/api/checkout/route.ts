import {NextResponse} from 'next/server';
import {z} from 'zod';
import {pool} from '../../../lib/db';
import {createSandboxPaymentIntent} from '../../../lib/modempay';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const body=z.object({reservationId:z.string().uuid()});
const headers={'Cache-Control':'no-store'};
export async function POST(req:Request){
 // Live charges are never available through the sandbox adapter.
 if(process.env.MODEMPAY_MODE!=='sandbox')return NextResponse.json({error:'Live payment integration has not been audited or enabled'},{status:503,headers});
 if(process.env.PAYMENTS_ENABLED!=='true'||process.env.BOOKINGS_ENABLED!=='true')return NextResponse.json({error:'Checkout not available until approved departures and end-to-end tests are configured'},{status:503,headers});
 const data=body.safeParse(await req.json().catch(()=>null));
 if(!data.success)return NextResponse.json({error:'Invalid reservation'},{status:400,headers});
 try{
  const result=await pool.query(`SELECT r.id,r.amount_bututs,r.hold_expires_at,t.departure_at
     FROM public.reservations r JOIN public.trips t ON t.id=r.trip_id
     WHERE r.id=$1 AND r.status='held' AND r.hold_expires_at>now()
     AND t.active=true AND t.departure_at>now()`,[data.data.reservationId]);
  if(!result.rows.length)return NextResponse.json({error:'Seat hold has expired or trip is unavailable'},{status:409,headers});
  const reservation=result.rows[0];
  // Checkout is intentionally still held behind a separate go-live gate:
  // a payment can outlast a 10-minute seat hold. That race must be resolved
  // before customers may be charged.
  if(process.env.CHECKOUT_RACE_GUARD_VERIFIED!=='true')return NextResponse.json({error:'Checkout is awaiting payment/seat-hold reconciliation tests'},{status:503,headers});
  const appOrigin='https://gtsc-bus-booking.vercel.app';
  const created=await createSandboxPaymentIntent({
   amountBututs:reservation.amount_bututs,
   reservationId:reservation.id,
   returnUrl:appOrigin+'/payment/pending',
   cancelUrl:appOrigin+'/payment/cancelled'
  });
  return NextResponse.json({checkoutUrl:created.paymentLink,environment:'sandbox',ticketIssued:false},{headers});
 }catch{
  return NextResponse.json({error:'Checkout currently unavailable'},{status:503,headers});
 }
}
