import {NextResponse} from 'next/server';
import {pool} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const url=new URL(request.url);
 const origin=(url.searchParams.get('origin')||'').trim();
 const destination=(url.searchParams.get('destination')||'').trim();
 const date=url.searchParams.get('date')||'';
 if(origin.length>120||destination.length>120||!/^\d{4}-\d{2}-\d{2}$/.test(date)){
  return NextResponse.json({error:'Select valid departure, destination and date'},{status:400,headers:{'Cache-Control':'no-store'}});
 }
 if(process.env.BOOKINGS_ENABLED!=='true')return NextResponse.json({trips:[],bookingEnabled:false,notice:'Fares approved for the app; scheduled departures have not yet been published'},{headers:{'Cache-Control':'no-store'}});
 try{
  const result=await pool.query(`SELECT id,origin,destination,departure_at,capacity,fare_bututs
    FROM public.trips WHERE active=true AND origin=$1 AND destination=$2
    AND departure_at >= $3::date AND departure_at < ($3::date+interval '1 day')
    AND departure_at>now() ORDER BY departure_at LIMIT 30`,[origin,destination,date]);
  return NextResponse.json({trips:result.rows,bookingEnabled:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Schedule service temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
