import {NextResponse} from 'next/server';
import {z} from 'zod';
import {pool} from '../../../../lib/db';
import {adminAuthorized,checkPassword,hashPassword,clearSession,originAllowed} from '../../../../lib/admin-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const schema=z.object({
 currentPassword:z.string().min(8).max(200),
 newPassword:z.string().min(14).max(200),
 confirmPassword:z.string().min(14).max(200)
}).strict();
export async function POST(req:Request){
 if(!originAllowed(req))return NextResponse.json({error:'Invalid request origin'},{status:403,headers});
 if(!await adminAuthorized())return NextResponse.json({error:'Sign in again before changing password'},{status:401,headers});
 if(Number(req.headers.get('content-length')||0)>1500)return NextResponse.json({error:'Request too large'},{status:413,headers});
 const body=schema.safeParse(await req.json().catch(()=>null));
 if(!body.success)return NextResponse.json({error:'Enter your current password and a new password of at least 14 characters'},{status:400,headers});
 const {currentPassword,newPassword,confirmPassword}=body.data;
 if(newPassword!==confirmPassword)return NextResponse.json({error:'The new passwords do not match'},{status:400,headers});
 if(!/[A-Za-z]/.test(newPassword)||!/[0-9]/.test(newPassword))
  return NextResponse.json({error:'Use at least one letter and one number in the new password'},{status:400,headers});
 if(newPassword===currentPassword)return NextResponse.json({error:'Choose a different password'},{status:400,headers});
 const client=await pool.connect().catch(()=>null);
 if(!client)return NextResponse.json({error:'Password change unavailable'},{status:503,headers});
 let stage:'begin'|'read'|'verify'|'hash'|'update'|'commit'='begin';
 let committed=false;
 try{
  await client.query('BEGIN');
  stage='read';
  const record=await client.query('SELECT password_hash,session_version FROM public.admin_credentials WHERE id=1 FOR UPDATE');
  if(record.rowCount!==1)throw new Error('Missing credential record');
  const existing=record.rows[0].password_hash||process.env.GTSC_ADMIN_PASSWORD_HASH||'';
  stage='verify';
  if(!checkPassword(currentPassword,existing)){
   await client.query('ROLLBACK');
   return NextResponse.json({error:'Current password is incorrect'},{status:403,headers});
  }
  stage='hash';
  const updated=hashPassword(newPassword);
  stage='update';
  await client.query(`UPDATE public.admin_credentials SET password_hash=$1,
    session_version=session_version+1,updated_at=now() WHERE id=1`,[updated]);
  stage='commit';
  await client.query('COMMIT');
  committed=true;
  await clearSession().catch(()=>{});
  return NextResponse.json({changed:true,signInAgain:true},{headers});
 }catch(error){
  if(!committed)await client.query('ROLLBACK').catch(()=>{});
  console.error('GTSC admin password change failed at stage',stage,error instanceof Error?error.name:'UnknownError');
  return NextResponse.json({error:committed?'Password saved. Please sign in again.':'Unable to save new password. Please retry or contact the administrator.',diagnostic:stage},{status:committed?200:503,headers});
 }finally{client.release();}
}
