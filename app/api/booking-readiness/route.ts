import {NextResponse} from 'next/server';
import {pool} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 let scheduledTrips=0;
 try{const r=await pool.query('SELECT count(*)::int AS count FROM public.trips WHERE active=true AND departure_at>now()');scheduledTrips=r.rows[0].count;}catch{return NextResponse.json({ready:false,reason:'database_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
 return NextResponse.json({
  faresApproved:true,
  activeUpcomingTrips:scheduledTrips,
  bookingsEnabled:process.env.BOOKINGS_ENABLED==='true',
  paymentsEnabled:process.env.PAYMENTS_ENABLED==='true',
  mode:process.env.MODEMPAY_MODE==='sandbox'?'sandbox':'not_sandbox',
  livePaymentsAvailable:false,
  ready:scheduledTrips>0&&process.env.BOOKINGS_ENABLED==='true',
  nextStep:scheduledTrips===0?'Publish GTSC-approved departure times, routes, capacities and pickup points':'Complete payment/seat-hold reconciliation and production merchant verification'
 },{headers:{'Cache-Control':'no-store'}});
}
