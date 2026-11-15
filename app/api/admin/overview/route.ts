import {NextResponse} from 'next/server';
import {adminAuthorized} from '../../../../lib/admin-auth';
import {pool} from '../../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 const headers={'Cache-Control':'no-store'};
 if(!await adminAuthorized())return NextResponse.json({error:'Unauthorized'},{status:401,headers});
 try{
  const [stats,requests,trips,holds,audits]=await Promise.all([
   pool.query(`SELECT
    (SELECT count(*)::int FROM public.booking_requests WHERE status='pending_review') AS pending_requests,
    (SELECT count(*)::int FROM public.booking_requests) AS total_requests,
    (SELECT count(*)::int FROM public.reservations WHERE status='held' AND hold_expires_at>now()) AS active_holds,
    (SELECT count(*)::int FROM public.reservations WHERE status='test_confirmed') AS test_confirmed,
    (SELECT count(*)::int FROM public.sandbox_test_tickets) AS test_tickets,
    (SELECT count(*)::int FROM public.trips WHERE active=true AND departure_at>now()) AS upcoming_departures,
    (SELECT count(*)::int FROM public.sandbox_payment_audit) AS payment_events`),
   pool.query(`SELECT id,passenger_name,service,origin,destination,preferred_date,preferred_time,
     preferred_seat,contact_phone,contact_email,status,created_at
     FROM public.booking_requests ORDER BY created_at DESC LIMIT 100`),
   pool.query(`SELECT t.id,t.origin,t.destination,t.departure_at,t.capacity,t.fare_bututs,
     st.service_name,
     (SELECT count(*)::int FROM public.reservations r WHERE r.trip_id=t.id AND
       (r.status IN ('confirmed','test_confirmed') OR (r.status='held' AND r.hold_expires_at>now()))) AS occupied
     FROM public.trips t LEFT JOIN public.service_timetables st ON st.code=t.service_code
     WHERE t.active=true AND t.departure_at>now()
     ORDER BY t.departure_at ASC LIMIT 120`),
   pool.query(`SELECT r.id,r.customer_name,r.customer_phone,r.customer_email,r.seat_number,
     r.amount_bututs,r.status,r.created_at,r.hold_expires_at,t.origin,t.destination,t.departure_at
     FROM public.reservations r JOIN public.trips t ON t.id=r.trip_id
     ORDER BY r.created_at DESC LIMIT 75`),
   pool.query(`SELECT event_type,match_status,amount_bututs,currency,created_at
     FROM public.sandbox_payment_audit ORDER BY created_at DESC LIMIT 50`)
  ]);
  return NextResponse.json({stats:stats.rows[0],requests:requests.rows,
    trips:trips.rows,holds:holds.rows,audits:audits.rows,
    environment:{mode:process.env.MODEMPAY_MODE==='sandbox'?'sandbox':'unknown',
      realPaymentsEnabled:process.env.PAYMENTS_ENABLED==='true'}},{headers});
 }catch{return NextResponse.json({error:'Unable to load dashboard'},{status:503,headers});}
}
