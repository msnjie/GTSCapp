import {NextResponse} from 'next/server';
import {pool} from '../../../../lib/db';
import {checkPassword,configured,ipDigest,originAllowed,setSession} from '../../../../lib/admin-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function POST(req:Request){
 if(!configured())return NextResponse.json({error:'Admin access not configured'},{status:503,headers});
 if(!originAllowed(req))return NextResponse.json({error:'Invalid request origin'},{status:403,headers});
 if(Number(req.headers.get('content-length')||0)>1024)return NextResponse.json({error:'Invalid login request'},{status:413,headers});
 const p=await req.json().catch(()=>null);
 if(!p||typeof p.password!=='string'||p.password.length>200||p.password.length<8)
  return NextResponse.json({error:'Invalid credentials'},{status:401,headers});
 const hash=ipDigest(req);
 try{
  const recent=await pool.query(`SELECT count(*)::int AS n FROM public.admin_login_attempts
    WHERE ip_hash=$1 AND succeeded=false
      AND created_at>now()-interval '15 minutes'`,[hash]);
  if(Number(recent.rows[0]?.n)>=12)
   return NextResponse.json({error:'Too many login attempts. Try again later.'},{status:429,headers});
  const ok=checkPassword(p.password);
  await pool.query('INSERT INTO public.admin_login_attempts(ip_hash,succeeded) VALUES($1,$2)',[hash,ok]);
  if(!ok)return NextResponse.json({error:'Invalid credentials'},{status:401,headers});
  await setSession();
  return NextResponse.json({authenticated:true},{headers});
 }catch{return NextResponse.json({error:'Admin login temporarily unavailable'},{status:503,headers});}
}
