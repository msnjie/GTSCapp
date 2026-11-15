import {NextResponse} from 'next/server';
import {pool} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 let scheduledTrips=0;
 let stagedTrips=0;
 try{const r=await pool.query('SELECT count(*) FILTER (WHERE active=true AND departure_at>now())::int AS active_count, count(*) FILTER (WHERE active=false AND departure_at>now())::int AS staged_count FROM public.trips');scheduledTrips=r.rows[0].active_count;stagedTrips=r.rows[0].staged_count;}catch{return NextResponse.json({ready:false,reason:'database_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
 return NextResponse.json({
  faresApproved:true,
  activeUpcomingTrips:scheduledTrips,
  stagedUpcomingTrips:stagedTrips,
  bookingsEnabled:process.env.BOOKINGS_ENABLED==='true',
  paymentsEnabled:process.env.PAYMENTS_ENABLED==='true',
  mode:process.env.MODEMPAY_MODE==='sandbox'?'sandbox':'not_sandbox',
  livePaymentsAvailable:false,
  sandboxTestHoldsAvailable:process.env.MODEMPAY_MODE==='sandbox'&&process.env.PAYMENTS_ENABLED==='false'&&process.env.BOOKINGS_ENABLED==='true'&&scheduledTrips>0,
  ready:false, // Payment reconciliation and launch controls are not complete, regardless of staged inventory.
  nextStep:'Verify operational schedule and pickup points; reconcile payment vs seat hold before activating sale'
 },{headers:{'Cache-Control':'no-store'}});
}
