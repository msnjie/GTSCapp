import {NextResponse} from 'next/server';
import {z} from 'zod';
import {pool} from '../../../lib/db';
import {createSandboxPaymentIntent,SandboxCheckoutError} from '../../../lib/modempay';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const body=z.object({reservationId:z.string().uuid()});
const headers={'Cache-Control':'no-store'};
function json(data:Record<string,unknown>,status:number){return NextResponse.json(data,{status,headers});}
export async function POST(req:Request){
 // Independent sandbox checkout control; never enable production transactions.
 if(process.env.MODEMPAY_MODE!=='sandbox'||process.env.PAYMENTS_ENABLED!=='false'
    ||process.env.BOOKINGS_ENABLED!=='true'||process.env.SANDBOX_CHECKOUT_ENABLED!=='true')
  return json({error:'Sandbox checkout is not enabled'},503);
 const parsed=body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return json({error:'Invalid seat hold'},400);
 const id=parsed.data.reservationId;
 try{
  const reservation=await pool.query(`SELECT r.id,r.amount_bututs,r.hold_expires_at,
      t.departure_at,t.active,t.fare_bututs
      FROM public.reservations r JOIN public.trips t ON t.id=r.trip_id
      WHERE r.id=$1 AND r.status='held' AND r.hold_expires_at>now()
      AND t.active=true AND t.departure_at>now()`,[id]);
  if(reservation.rowCount!==1)return json({error:'Seat hold has expired. Select a new test seat.'},409);
  const seat=reservation.rows[0];
  if(!Number.isSafeInteger(seat.amount_bututs)||seat.amount_bututs<=0
     ||seat.amount_bututs!==seat.fare_bututs)
   return json({error:'Trip fare is unavailable'},409);
  // Claim the only allowed checkout attempt before calling Modem Pay.
  // Never call the provider a second time for the same hold.
  const claim=await pool.query(`INSERT INTO public.sandbox_checkout_attempts(reservation_id,state)
     VALUES($1,'creating') ON CONFLICT(reservation_id) DO NOTHING
     RETURNING reservation_id`,[id]);
  if(claim.rowCount!==1){
   const existing=await pool.query(`SELECT state,checkout_url
     FROM public.sandbox_checkout_attempts WHERE reservation_id=$1`,[id]);
   if(existing.rows[0]?.state==='created'&&typeof existing.rows[0].checkout_url==='string')
    return json({checkoutUrl:existing.rows[0].checkout_url,environment:'sandbox',
      expiresAt:seat.hold_expires_at,ticketIssued:false,confirmed:false},200);
   return json({error:'Checkout is already being prepared or needs a new test hold'},409);
  }
  const origin='https://gtsc-bus-booking.vercel.app';
  try{
   const intent=await createSandboxPaymentIntent({
    amountBututs:seat.amount_bututs,reservationId:id,
    returnUrl:origin+'/payment/pending',
    cancelUrl:origin+'/payment/cancelled'
   });
   await pool.query(`UPDATE public.sandbox_checkout_attempts
     SET state='created',checkout_url=$2,provider_intent_expires_at=$3,updated_at=now()
     WHERE reservation_id=$1`,[id,intent.paymentLink,intent.expiresAt]);
   return json({checkoutUrl:intent.paymentLink,environment:'sandbox',
     expiresAt:seat.hold_expires_at,ticketIssued:false,confirmed:false},200);
  }catch(error){
   const reason=error instanceof SandboxCheckoutError?error.code:'PROVIDER_RESPONSE';
   console.warn('GTSC sandbox checkout failure',reason);
   await pool.query(`UPDATE public.sandbox_checkout_attempts
     SET state='failed',updated_at=now() WHERE reservation_id=$1 AND state='creating'`,[id]).catch(()=>{});
   return json({error:'Test payment link could not be created. Start with a new seat hold.',diagnostic:reason},503);
  }
 }catch{return json({error:'Sandbox checkout temporarily unavailable'},503);}
}
