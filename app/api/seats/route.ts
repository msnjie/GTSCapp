import {NextResponse} from 'next/server';
import {pool} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(process.env.BOOKINGS_ENABLED!=='true')return NextResponse.json({error:'Live seat inventory is not enabled'},{status:503});
 const id=new URL(request.url).searchParams.get('tripId');
 if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({error:'Invalid trip'},{status:400});
 try{
 const trip=await pool.query('SELECT capacity FROM public.trips WHERE id=$1 AND active=true AND departure_at>now()',[id]);
 if(!trip.rows.length)return NextResponse.json({error:'Trip unavailable'},{status:404});
 const occupied=await pool.query(`SELECT seat_number FROM public.reservations WHERE trip_id=$1
   AND (status='confirmed' OR (status='held' AND hold_expires_at>now()))`,[id]);
 return NextResponse.json({capacity:trip.rows[0].capacity,unavailableSeats:occupied.rows.map(x=>x.seat_number)},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Seat availability temporarily unavailable'},{status:503});}
}
