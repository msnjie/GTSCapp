import 'server-only';
import {createHash,createHmac,timingSafeEqual,scryptSync,randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {pool} from './db';
const COOKIE='gtsc_admin_session';
const SESSION_SECONDS=8*60*60;
function key(){const v=process.env.GTSC_ADMIN_SESSION_SECRET||'';return v.length>=48?v:null;}
function signature(value:string){const secret=key();return secret?createHmac('sha256',secret).update(value).digest('hex'):'';}
function safeEqual(a:string,b:string){const ab=Buffer.from(a),bb=Buffer.from(b);return ab.length===bb.length&&timingSafeEqual(ab,bb);}
export function configured(){return Boolean(key()&&process.env.GTSC_ADMIN_PASSWORD_HASH);}
export async function getAdminCredential(){
 const result=await pool.query('SELECT password_hash,session_version FROM public.admin_credentials WHERE id=1');
 if(result.rowCount!==1)throw new Error('Admin credential record missing');
 return result.rows[0] as {password_hash:string|null;session_version:number};
}
export function checkPassword(password:string,storedHash:string){
 const hash=storedHash;
 const [salt,digest]=hash.split(':');
 if(!salt||!digest||!/^[0-9a-f]{32}$/.test(salt)||!/^[0-9a-f]{64}$/.test(digest)||password.length>200)return false;
 const candidate=scryptSync(password,Buffer.from(salt,'hex'),32,{N:16384,r:8,p:1}).toString('hex');
 return safeEqual(candidate,digest);
}
export function ipDigest(request:Request){
 const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,150);
 return createHash('sha256').update((key()||'unconfigured')+':'+ip).digest('hex');
}
export function originAllowed(request:Request){
 const origin=request.headers.get('origin');
 const canonical='https://gtsc-bus-booking.vercel.app';
 return Boolean(origin&&origin===canonical);
}
export function hashPassword(password:string){
 const salt=randomBytes(16);
 const digest=scryptSync(password,salt,32,{N:16384,r:8,p:1});
 return salt.toString('hex')+':'+digest.toString('hex');
}
export function makeSession(version:number){
 const exp=Date.now()+SESSION_SECONDS*1000;
 const nonce=randomBytes(16).toString('hex');
 const payload=exp+'.'+nonce+'.'+version;
 return payload+'.'+signature(payload);
}
export async function verifySession(token:string|undefined){
 if(!key()||!token||token.length>300)return false;
 const parts=token.split('.');
 if(parts.length!==4||!/^\d{13}$/.test(parts[0])||!/^[0-9a-f]{32}$/.test(parts[1])||!/^\d{1,8}$/.test(parts[2])||!/^[0-9a-f]{64}$/.test(parts[3]))return false;
 const expires=Number(parts[0]);
 if(!Number.isFinite(expires)||expires<Date.now()||expires>Date.now()+SESSION_SECONDS*1000+60000)return false;
 if(!safeEqual(signature(parts[0]+'.'+parts[1]+'.'+parts[2]),parts[3]))return false;
 try{const credential=await getAdminCredential();return Number(parts[2])===credential.session_version;}
 catch{return false;}
}
export async function adminAuthorized(){
 const c=await cookies();
 return await verifySession(c.get(COOKIE)?.value);
}
export async function setSession(version:number){
 const c=await cookies();
 c.set(COOKIE,makeSession(version),{httpOnly:true,secure:true,sameSite:'strict',maxAge:SESSION_SECONDS,path:'/'});
}

export async function clearSession(){
 const c=await cookies();c.set(COOKIE,'',{httpOnly:true,secure:true,sameSite:'strict',maxAge:0,path:'/'});
}
