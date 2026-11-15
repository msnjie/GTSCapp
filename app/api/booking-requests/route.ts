import {NextResponse} from 'next/server';
import {z} from 'zod';
import {pool} from '../../../lib/db';
import {allowedRequestRoute} from '../../../lib/routes';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const schema=z.object({
 passengerName:z.string().trim().min(2).max(100),
 service:z.string().min(2).max(100),
 origin:z.string().min(2).max(120),
 destination:z.string().min(2).max(120),
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 phone:z.string().regex(/^\+[1-9]\d{7,14}$/),
 email:z.union([z.string().email().max(254),z.literal('')]).optional().default(''),
 preferredTime:z.string().max(30).optional().default(''),
 preferredSeat:z.number().int().min(1).max(40).nullable().optional().default(null),
 consent:z.literal(true),
 website:z.string().max(100).optional().default('')
}).strict();
export async function POST(req:Request){
 if(process.env.MODEMPAY_MODE!=='sandbox'||process.env.PAYMENTS_ENABLED!=='false')
  return NextResponse.json({error:'Booking requests are currently unavailable'},{status:503,headers});
 if(Number(req.headers.get('content-length')||0)>4096)return NextResponse.json({error:'Request too large'},{status:413,headers});
 const text=await req.text().catch(()=>null);
 if(!text||Buffer.byteLength(text)>4096)return NextResponse.json({error:'Invalid request'},{status:400,headers});
 let body:unknown;
 try{body=JSON.parse(text);}catch{return NextResponse.json({error:'Invalid JSON'},{status:400,headers});}
 const parsed=schema.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:'Enter passenger name, a phone number in international format, a future date and consent to contact. Email is optional.'},{status:400,headers});
 const v=parsed.data;
 if(v.website)return NextResponse.json({requestReceived:true,status:'pending_review',ticketIssued:false,paymentCollected:false},{status:202,headers});
 if(!allowedRequestRoute(v.service,v.origin,v.destination))
  return NextResponse.json({error:'This service does not operate the selected route in the supplied route list.'},{status:400,headers});
 const requestedDate=new Date(v.date+'T00:00:00Z');
 if(!Number.isFinite(requestedDate.getTime())||requestedDate.toISOString().slice(0,10)!==v.date)
  return NextResponse.json({error:'Invalid date'},{status:400,headers});
 const today=new Date().toISOString().slice(0,10);
 const max=new Date(Date.now()+60*86400000).toISOString().slice(0,10);
 if(v.date<today||v.date>max)
  return NextResponse.json({error:'Choose a date within the next 60 days'},{status:400,headers});
 const phone=v.phone.replace(/\s/g,'');
 try{
  // Basic per-contact throttle and duplicate request protection.
  const volume=await pool.query("SELECT count(*)::int AS n FROM public.booking_requests WHERE contact_phone=$1 AND created_at>now()-interval '24 hours'",[phone]);
  if(volume.rows[0]?.n>=3)return NextResponse.json({error:'Request limit reached for this contact. Please speak with the booking desk.'},{status:429,headers});
  const saved=await pool.query(`INSERT INTO public.booking_requests
     (service,origin,destination,preferred_date,preferred_time,contact_phone,contact_email,preferred_seat,passenger_name,contact_consent)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
     ON CONFLICT DO NOTHING RETURNING id`,
     [v.service,v.origin,v.destination,v.date,v.preferredTime||null,phone,v.email||null,v.preferredSeat,v.passengerName]);
  if(saved.rowCount!==1)return NextResponse.json({error:'A matching pending request already exists for this contact and date.'},{status:409,headers});
  return NextResponse.json({
   requestId:saved.rows[0].id,status:'pending_review',requestReceived:true,
   seatReserved:false,preferredSeat:v.preferredSeat,paymentCollected:false,ticketIssued:false,
   notice:'Online booking request received. Your preferred seat (if supplied) is NOT reserved; GTSC must confirm the departure, fare and seat. No money has been collected.'
  },{status:201,headers});
 }catch{return NextResponse.json({error:'Unable to submit request. Please contact the booking desk.'},{status:503,headers});}
}
