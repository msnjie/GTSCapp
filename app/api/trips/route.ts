import {NextResponse} from 'next/server';
import {pool} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const url=new URL(request.url);
 const origin=(url.searchParams.get('origin')||'').trim();
 const destination=(url.searchParams.get('destination')||'').trim();
 const date=url.searchParams.get('date')||'';
 const service=url.searchParams.get('service')||'';
 const allowedServices=['Nuwari Express','Super Express','Express','Normal','International (Dakar)','International (Bissau)','International (Kaolack)','International (Tivaouane)','Up-country','North Bank','Urban'];
 if(origin.length>120||destination.length>120||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!allowedServices.includes(service)){
  return NextResponse.json({error:'Select valid departure, destination and date'},{status:400,headers:{'Cache-Control':'no-store'}});
 }
 if(!['Nuwari Express','Super Express','International (Dakar)'].includes(service))return NextResponse.json({trips:[],bookingEnabled:false,notice:'This destination is open for booking enquiries, but online seat holds require a confirmed departure, fare and shared seat inventory. Use the WhatsApp enquiry link.'},{headers:{'Cache-Control':'no-store'}});
 if(process.env.MODEMPAY_MODE!=='sandbox'||process.env.PAYMENTS_ENABLED!=='false'||process.env.BOOKINGS_ENABLED!=='true')return NextResponse.json({trips:[],bookingEnabled:false,notice:'Fares approved for the app; scheduled departures have not yet been published'},{headers:{'Cache-Control':'no-store'}});
 try{
  const result=await pool.query(`SELECT t.id,t.origin,t.destination,t.departure_at,t.capacity,t.fare_bututs,t.service_code,st.service_name
    FROM public.trips t JOIN public.service_timetables st ON st.code=t.service_code
    WHERE t.active=true AND t.origin=$1 AND t.destination=$2 AND st.service_name=$4
    AND t.departure_at >= $3::date AND t.departure_at < ($3::date+interval '1 day')
    AND t.departure_at>now() ORDER BY t.departure_at LIMIT 30`,[origin,destination,date,service==='International (Dakar)'?'Dakar International':service]);
  return NextResponse.json({trips:result.rows,bookingEnabled:true,sandbox:true,notice:'Sandbox test only: holds expire in 10 minutes. No confirmed bookings or tickets.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Schedule service temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
