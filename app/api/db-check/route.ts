import {NextResponse} from 'next/server';
import {pool} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
function category(error:unknown):string {
 const e=error as {code?:string; message?:string};
 const code=String(e?.code??'');
 if(['28P01','28000'].includes(code))return 'authentication_failed';
 if(['ENOTFOUND','EAI_AGAIN'].includes(code))return 'hostname_unreachable';
 if(['ETIMEDOUT','ECONNREFUSED','ENETUNREACH','EHOSTUNREACH'].includes(code))return 'network_unreachable';
 if(['SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT'].includes(code))return 'tls_certificate_error';
 if(code==='3D000')return 'database_not_found';
 if((e?.message??'').toLowerCase().includes('password'))return 'authentication_failed';
 return 'unknown_failure';
}
export async function GET(){
 const raw=process.env.DATABASE_URL;
 if(!raw)return NextResponse.json({database:'not_configured'},{status:503,headers});
 try {
  const u=new URL(raw);
  if(!['postgres:','postgresql:'].includes(u.protocol))return NextResponse.json({database:'invalid_connection_string',reason:'invalid_scheme'},{status:503,headers});
  if(!u.hostname)return NextResponse.json({database:'invalid_connection_string',reason:'missing_hostname'},{status:503,headers});
  if(!u.username)return NextResponse.json({database:'invalid_connection_string',reason:'missing_username'},{status:503,headers});
  if(!u.password)return NextResponse.json({database:'invalid_connection_string',reason:'missing_password'},{status:503,headers});
  if(u.password==='[YOUR-PASSWORD]'||u.password==='YOUR_PASSWORD')return NextResponse.json({database:'invalid_connection_string',reason:'password_placeholder'},{status:503,headers});
  if(!u.hostname.endsWith('.pooler.supabase.com'))return NextResponse.json({database:'invalid_connection_string',reason:'unexpected_hostname'},{status:503,headers});
 }catch{return NextResponse.json({database:'invalid_connection_string',reason:'malformed_url'},{status:503,headers});}
 try{
  const result=await pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reservations') AS has_reservations");
  const ok=Boolean(result.rows[0]?.has_reservations);
  return NextResponse.json({database:ok?'connected':'schema_missing'},{status:ok?200:503,headers});
 }catch(e){
  const reason=category(e);
  console.warn('GTSC database diagnostic category:',reason);
  return NextResponse.json({database:'connection_failed',reason},{status:503,headers});
 }
}
