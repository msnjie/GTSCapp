import 'server-only';
import {createHash,createHmac,timingSafeEqual,scryptSync,randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
const COOKIE='gtsc_admin_session';
const SESSION_SECONDS=8*60*60;
function key(){const v=process.env.GTSC_ADMIN_SESSION_SECRET||'';return v.length>=48?v:null;}
function signature(value:string){const secret=key();return secret?createHmac('sha256',secret).update(value).digest('hex'):'';}
function safeEqual(a:string,b:string){const ab=Buffer.from(a),bb=Buffer.from(b);return ab.length===bb.length&&timingSafeEqual(ab,bb);}
export function configured(){return Boolean(key()&&process.env.GTSC_ADMIN_PASSWORD_HASH);}
export function checkPassword(password:string){
 const hash=process.env.GTSC_ADMIN_PASSWORD_HASH||'';
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
export function makeSession(){
 const exp=Date.now()+SESSION_SECONDS*1000;
 const nonce=randomBytes(16).toString('hex');
 const payload=exp+'.'+nonce;
 return payload+'.'+signature(payload);
}
export function verifySession(token:string|undefined){
 if(!key()||!token||token.length>300)return false;
 const parts=token.split('.');
 if(parts.length!==3||!/^\d{13}$/.test(parts[0])||!/^[0-9a-f]{32}$/.test(parts[1])||!/^[0-9a-f]{64}$/.test(parts[2]))return false;
 const expires=Number(parts[0]);
 if(!Number.isFinite(expires)||expires<Date.now()||expires>Date.now()+SESSION_SECONDS*1000+60000)return false;
 return safeEqual(signature(parts[0]+'.'+parts[1]),parts[2]);
}
export async function adminAuthorized(){
 const c=await cookies();
 return verifySession(c.get(COOKIE)?.value);
}
export async function setSession(){
 const c=await cookies();
 c.set(COOKIE,makeSession(),{httpOnly:true,secure:true,sameSite:'strict',maxAge:SESSION_SECONDS,path:'/'});
}
export async function clearSession(){
 const c=await cookies();c.set(COOKIE,'',{httpOnly:true,secure:true,sameSite:'strict',maxAge:0,path:'/'});
}
