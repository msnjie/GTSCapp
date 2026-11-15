'use client';
import {useEffect,useState} from 'react';
type Ticket={ticketId:string;reference:string;service:string;origin:string;destination:string;departureAt:string;seatNumber:number;fareBututs:number;issuedAt:string;paymentStatus:string;label:string};
type Result={status:string;ticket:Ticket|null;error?:string};
export default function SandboxTicketPage(){
 const [result,setResult]=useState<Result|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  const token=new URLSearchParams(window.location.search).get('token');
  if(!token){setError('Missing private test ticket link');return;}
  let alive=true;let count=0;
  const check=async()=>{
   try{
    const r=await fetch('/api/sandbox-ticket?token='+encodeURIComponent(token),{cache:'no-store'});
    const d=await r.json();
    if(!r.ok)throw Error(d.error||'Unable to check ticket');
    if(alive)setResult(d);
    if(d.status!=='waiting_for_test_payment')return;
   }catch(e){if(alive)setError(e instanceof Error?e.message:'Unable to check ticket');}
   if(alive&&count++<9)window.setTimeout(check,5000);
  };void check();
  return()=>{alive=false};
 },[]);
 const t=result?.ticket;
 return <main style={{maxWidth:640,margin:'30px auto',padding:24,fontFamily:'system-ui',color:'#23284b'}}>
 <div style={{padding:24,border:'4px solid #b52438',borderTop:'9px solid #30399a',borderRadius:14,background:'#fff',boxShadow:'0 8px 28px rgba(46,52,134,.12)'}}>
 <div style={{height:5,display:'flex',gap:6,marginBottom:20}} aria-hidden="true"><span style={{background:'#ed4b5a',flex:1,borderRadius:6}}/><span style={{background:'#30399a',flex:1,borderRadius:6}}/><span style={{background:'#267c49',flex:1,borderRadius:6}}/></div><h1 style={{color:'#b52438',textAlign:'center',marginBottom:4}}>SANDBOX TEST TICKET</h1>
 <p style={{fontSize:22,fontWeight:800,textAlign:'center',color:'#b52438'}}>NOT VALID FOR TRAVEL</p>
 <p style={{textAlign:'center'}}>Modem Pay sandbox: simulated payments only. No real money collected.</p>
 {error&&<p role="alert">{error}</p>}
 {!t&&!error&&<p role="status">{result?.status==='waiting_for_test_payment'?'Waiting for verified test payment. This page checks again automatically.':'There is no issued test ticket for this hold.'}</p>}
 {t&&<div style={{lineHeight:1.9}}>
 <p><strong>Service:</strong> {t.service}</p>
 <p><strong>Route:</strong> {t.origin} → {t.destination}</p>
 <p><strong>Departure:</strong> {new Date(t.departureAt).toLocaleString('en-GB',{timeZone:'Africa/Banjul'})}</p>
 <p><strong>Seat:</strong> {t.seatNumber}</p>
 <p><strong>Simulated fare:</strong> D{(t.fareBututs/100).toFixed(2)}</p>
 <p><strong>Test payment:</strong> {t.paymentStatus}</p>
 <p style={{overflowWrap:'anywhere'}}><strong>Test ticket ID:</strong> {t.ticketId}</p>
 <p style={{overflowWrap:'anywhere'}}><strong>Reservation reference:</strong> {t.reference}</p>
 <p style={{fontWeight:800,color:'#b52438'}}>THIS IS A TEST DOCUMENT ONLY. IT CANNOT BE USED TO BOARD A BUS.</p>
 <button onClick={()=>window.print()} style={{padding:12,borderRadius:8,background:'#323d96',color:'white',border:0,fontWeight:700}}>Print test ticket</button>
 </div>}
 </div>
 <p><a href="/">Return to GTSC sandbox booking</a></p>
 </main>;
}
