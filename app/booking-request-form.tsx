'use client';
import {useState} from 'react';
export default function BookingRequestForm({service,origin,destination,date}:{service:string;origin:string;destination:string;date:string}){
 const [phone,setPhone]=useState('');const [email,setEmail]=useState('');
 const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');const [ref,setRef]=useState('');
 const [website,setWebsite]=useState('');
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage('');setRef('');
  try{
   const resp=await fetch('/api/booking-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service,origin,destination,date,phone:phone.trim(),email:email.trim(),consent,website})});
   const data=await resp.json();
   if(!resp.ok)throw Error(data.error||'Could not submit');
   setRef(data.requestId);setMessage(data.notice);
  }catch(error){setMessage(error instanceof Error?error.message:'Could not submit request');}
  finally{setBusy(false);}
 }
 return <section style={{background:'#fff',padding:22,borderRadius:16,marginBottom:18}}>
  <h2 style={{fontSize:21}}>Request a booking — all destinations</h2>
  <p style={{fontSize:13}}>For services without available online seats, submit a request for staff review. This is not a confirmed booking or payment.</p>
  <p><strong>{service}</strong>: {origin} → {destination}, {date||'choose a date above'}</p>
  <form onSubmit={submit} style={{display:'grid',gap:12}}>
   <label>Contact or WhatsApp number (+220…)<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+2203663800" pattern="\\+[1-9][0-9]{7,14}" style={input}/></label>
   <label>Email (optional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={input}/></label>
   <label style={{display:'flex',gap:9,fontSize:13}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/> I consent to GTSC contacting me about this request. No seat or departure is confirmed and no payment is collected.</label>
   <div style={{position:'absolute',left:'-10000px'}} aria-hidden="true"><input tabIndex={-1} value={website} onChange={e=>setWebsite(e.target.value)}/></div>
   <button type="submit" disabled={!consent||!date||!destination||busy} style={{background:'#086847',color:'#fff',border:0,borderRadius:9,padding:12,fontWeight:700}}>{busy?'Submitting…':'Submit pending booking request'}</button>
  </form>
  {message&&<div role="status" style={{padding:12,background:'#edf7ef',marginTop:12,borderRadius:8}}>{message}{ref&&<p><strong>Request reference: {ref}</strong></p>}</div>}
  <p style={{fontSize:12}}>Sandbox only. Details are stored privately for staff review; email and WhatsApp messages are not sent automatically.</p>
 </section>;
}
const input:React.CSSProperties={display:'block',width:'100%',boxSizing:'border-box',fontSize:16,padding:10,borderRadius:8,border:'1px solid #becdc4'};
