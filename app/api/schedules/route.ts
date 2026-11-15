import {NextResponse} from 'next/server';
import {pool} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const r=await pool.query(`SELECT code,service_name,origin,destination,
     to_char(departure_local,'HH24:MI') AS departure_time,
     frequency_label,fare_bututs,capacity,intermediate_fares,boarding_note,note
     FROM public.service_timetables ORDER BY
       CASE WHEN code LIKE 'nuwari_%' OR code LIKE 'super_%' OR code LIKE 'normal_%' OR code LIKE 'kunting_%' OR code LIKE 'mankamang_%' OR code LIKE 'basse_%' THEN 1
            WHEN code LIKE 'dakar_%' OR code LIKE 'kaolack_%' OR code LIKE 'tivaouane_%' OR code LIKE 'bissau_%' THEN 2 ELSE 3 END,
       departure_local NULLS LAST,code`);
  return NextResponse.json({schedules:r.rows,verifiedForSale:false,timezone:'Africa/Banjul',notice:'40-seat capacity recorded for every listed service. Services without verified departure times and fares remain request-only; 40 seats does not indicate confirmed trip availability.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Timetables temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
