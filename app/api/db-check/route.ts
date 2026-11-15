import {NextResponse} from 'next/server';
import {pool} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 if(!process.env.DATABASE_URL) return NextResponse.json({database:'not_configured'},{status:503,headers:{'Cache-Control':'no-store'}});
 try{
  const result=await pool.query("SELECT current_database() AS name, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reservations') AS has_reservations");
  return NextResponse.json({database:result.rows[0].has_reservations?'connected':'schema_missing'},{status:result.rows[0].has_reservations?200:503,headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({database:'connection_failed'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
