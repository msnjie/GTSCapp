import {NextResponse} from 'next/server';
import {z} from 'zod';
import {pool} from '../../../lib/db';
export const runtime='nodejs';
const bodySchema=z.object({tripId:z.string().uuid(),seatNumber:z.number().int().positive()});
export async function POST(req:Request){
 if(process.env.MODEMPAY_MODE!=='sandbox'||process.env.PAYMENTS_ENABLED!=='false'||process.env.BOOKINGS_ENABLED!=='true')return NextResponse.json({error:'Bookings disabled until GTSC fares and schedules are verified'},{status:503});
 const parsed=bodySchema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Invalid booking request'},{status:400});
 const {tripId,seatNumber}=parsed.data;const client=await pool.connect();
 try{await client.query('BEGIN');const trip=await client.query('SELECT capacity,fare_bututs FROM trips WHERE id=$1 AND active=true FOR SHARE',[tripId]);if(!trip.rowCount||seatNumber>trip.rows[0].capacity){await client.query('ROLLBACK');return NextResponse.json({error:'Trip or seat unavailable'},{status:404});}
 await client.query('SELECT pg_advisory_xact_lock(hashtext($1),$2)',[tripId,seatNumber]);
 const occupied=await client.query("SELECT 1 FROM reservations WHERE trip_id=$1 AND seat_number=$2 AND (status='confirmed' OR (status='held' AND hold_expires_at>now())) LIMIT 1",[tripId,seatNumber]);
 if(occupied.rowCount){await client.query('ROLLBACK');return NextResponse.json({error:'Seat already held or booked'},{status:409});}
 const saved=await client.query("INSERT INTO reservations(trip_id,seat_number,customer_name,customer_phone,status,hold_expires_at,amount_bututs) VALUES($1,$2,$3,$4,'held',now()+interval '10 minutes',$5) RETURNING id,hold_expires_at",[tripId,seatNumber,'SANDBOX TEST PASSENGER','0000000',trip.rows[0].fare_bututs]);await client.query('COMMIT');return NextResponse.json({reservationId:saved.rows[0].id,expiresAt:saved.rows[0].hold_expires_at,sandbox:true,confirmed:false,ticketIssued:false},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch{await client.query('ROLLBACK').catch(()=>{});return NextResponse.json({error:'Reservation failed'},{status:500});}finally{client.release();}
}
