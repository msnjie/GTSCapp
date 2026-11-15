import {NextResponse} from 'next/server';
import {z} from 'zod';
import {adminAuthorized,originAllowed} from '../../../../lib/admin-auth';
import {pool} from '../../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const schema=z.object({id:z.string().uuid(),status:z.enum(['pending_review','contacted','cancelled','closed'])}).strict();
export async function POST(req:Request){
 const headers={'Cache-Control':'no-store'};
 if(!originAllowed(req))return NextResponse.json({error:'Invalid request origin'},{status:403,headers});
 if(!await adminAuthorized())return NextResponse.json({error:'Unauthorized'},{status:401,headers});
 if(Number(req.headers.get('content-length')||0)>1000)return NextResponse.json({error:'Request too large'},{status:413,headers});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid request status'},{status:400,headers});
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const original=await c.query('SELECT status FROM public.booking_requests WHERE id=$1 FOR UPDATE',[parsed.data.id]);
  if(!original.rowCount){await c.query('ROLLBACK');return NextResponse.json({error:'Request not found'},{status:404,headers});}
  const prev=original.rows[0].status;
  if(prev===parsed.data.status){await c.query('COMMIT');return NextResponse.json({status:prev},{headers});}
  if(['closed','cancelled'].includes(prev)){
   await c.query('ROLLBACK');return NextResponse.json({error:'Closed requests cannot be reopened'},{status:409,headers});
  }
  await c.query('UPDATE public.booking_requests SET status=$2 WHERE id=$1',[parsed.data.id,parsed.data.status]);
  await c.query(`INSERT INTO public.admin_request_events(request_id,previous_status,new_status)
      VALUES($1,$2,$3)`,[parsed.data.id,prev,parsed.data.status]);
  await c.query('COMMIT');
  return NextResponse.json({status:parsed.data.status,seatReserved:false,ticketIssued:false},{headers});
 }catch{await c.query('ROLLBACK').catch(()=>{});return NextResponse.json({error:'Request update unavailable'},{status:503,headers});}
 finally{c.release();}
}
