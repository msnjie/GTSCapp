'use client';
import {useEffect,useState} from 'react';
import {REFERENCE_FARES,referenceFare,fareLabel} from '../lib/reference-fares';
const SERVICES={
 'Express':['Banjul','Serrekunda','Brikama','Soma','Kundang','Brikama-Ba','Janjan Burreh','Bansang','Bakadaji','Basse'],
 'Normal':['Banjul','Faraba Banta','Bulock','Kalaji','Soma','Jareng','Kudang','Jahali','Basse'],
 'International (Dakar)':['Banjul','Dakar, Senegal'],
 'International (Bissau)':['Banjul','Bissau, Guinea-Bissau'],
 'Urban':['Banjul','Kartong','Giboroh','Kafuta','Brikama','Mandinaring','Tabokoto','Lamin']
} as const;
type Service=keyof typeof SERVICES;
type Trip={id:string;origin:string;destination:string;departure_at:string;capacity:number;fare_bututs:number};
export default function BookingDemo(){
 const [service,setService]=useState<Service>('Express');
 const stops:readonly string[]=SERVICES[service];
 const [origin,setOrigin]=useState('Banjul');
 const [destination,setDestination]=useState('Basse');
 const [date,setDate]=useState('');
 const [trips,setTrips]=useState<Trip[]>([]);
 const [selectedTrip,setSelectedTrip]=useState<Trip|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [unavailable,setUnavailable]=useState<number[]>([]);
 const [seat,setSeat]=useState<number|null>(null);
 const [demoMode,setDemoMode]=useState(false);
 const [customerName,setCustomerName]=useState('');
 const [customerPhone,setCustomerPhone]=useState('');
 const [holding,setHolding]=useState(false);
 const [sampleCheckout,setSampleCheckout]=useState(false);
 const [holdReceipt,setHoldReceipt]=useState('');
 const [bookingEnabled,setBookingEnabled]=useState(false);
 const destinations=service==='International (Dakar)'?stops.filter(stop=>stop!==origin):service==='Urban'&&origin==='Banjul'?stops.slice(1):stops.slice(Math.max(0,stops.indexOf(origin)+1));
 const historicalFare=referenceFare(service,origin,destination);
 const capacity=demoMode?40:selectedTrip?.capacity??0;
 async function search(){
  setBusy(true);setDemoMode(false);setSelectedTrip(null);setSeat(null);setHoldReceipt('');setMessage('');
  try{
   const resp=await fetch('/api/trips?'+new URLSearchParams({origin,destination,date}),{cache:'no-store'});
   const data=await resp.json();
   if(!resp.ok)throw new Error(data.error||'Unable to search');
   setTrips(data.trips||[]);setBookingEnabled(Boolean(data.bookingEnabled));
   setMessage(data.trips?.length?'Choose a departure below.':(data.notice||'No verified departures published for this selection.'));
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to search');}
  finally{setBusy(false);}
 }
 useEffect(()=>{
  if(!selectedTrip)return;
  let cancelled=false;
  async function load(){
   try{const r=await fetch('/api/seats?'+new URLSearchParams({tripId:selectedTrip!.id}),{cache:'no-store'});const d=await r.json();if(!cancelled)setUnavailable(r.ok?d.unavailableSeats:[]);}
   catch{if(!cancelled)setUnavailable([]);}
  }
  load();return()=>{cancelled=true};
 },[selectedTrip]);
 function chooseService(s:Service){setService(s);setOrigin('Banjul');setDestination(s==='International (Dakar)'?'Dakar, Senegal':s==='International (Bissau)'?'Bissau, Guinea-Bissau':s==='Urban'?'Kartong':'Basse');setSelectedTrip(null);setSeat(null);setTrips([]);setDemoMode(false);setSampleCheckout(false);setMessage('');}
 function beginDemo(){setDemoMode(true);setSelectedTrip(null);setSeat(null);setUnavailable([3,8,14,26]);setHoldReceipt('');setSampleCheckout(false);setMessage('Sample bus seat map — example seats only, not GTSC live inventory.');}
 async function hold(){
  if(!selectedTrip||!bookingEnabled||!seat||!customerName.trim()||!customerPhone.trim())return;
  setHolding(true);setMessage('');setHoldReceipt('');
  try{
   const resp=await fetch('/api/holds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tripId:selectedTrip.id,seatNumber:seat,customerName,customerPhone})});
   const d=await resp.json();if(!resp.ok)throw new Error(d.error||'Reservation unsuccessful');
   setHoldReceipt('Temporary seat hold '+d.reservationId+' expires '+new Date(d.expiresAt).toLocaleTimeString()+'. This is NOT a ticket. Payment is disabled.');
   setUnavailable(x=>[...x,seat]);
   setSeat(null);
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to hold seat');}
  finally{setHolding(false);}
 }
 return <main style={{maxWidth:800,margin:'0 auto',color:'#12372d'}}>
   <header style={{background:'#064c3b',color:'white',padding:24,borderRadius:16,marginBottom:20}}>
     <div style={{fontSize:12,letterSpacing:2}}>GAMBIA TRANSPORT SERVICE COMPANY</div><h1 style={{margin:'8px 0'}}>GTSC Bus Booking</h1>
     <p style={{margin:0}}>Search journeys and explore seat selection</p>
     <p style={{fontSize:13,marginBottom:0,color:'#d4f4e3'}}>Development demonstration — not an official ticketing service. No payments or tickets available.</p>
   </header>
   <section style={panel}>
    <h2 style={heading}>Find your journey</h2>
    <div style={fields}>
     <label style={field}>Bus service<select value={service} onChange={e=>chooseService(e.target.value as Service)} style={control}><option value="Express">Express</option><option value="Normal">Normal</option><option value="International (Dakar)">International (Dakar)</option><option value="International (Bissau)">International (Bissau)</option><option value="Urban">Urban</option></select></label>
     <label style={field}>Departure<select value={origin} onChange={e=>{const from=e.target.value;setOrigin(from);setDestination(service==='International (Dakar)'?(from==='Banjul'?'Dakar, Senegal':'Banjul'):(stops.slice(stops.indexOf(from)+1)[0]||''));setSelectedTrip(null)}} style={control}>{(service==='International (Dakar)'?stops:stops.slice(0,-1)).map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <label style={field}>Destination<select value={destination} onChange={e=>setDestination(e.target.value)} style={control}>{destinations.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <label style={field}>Travel date<input type="date" style={control} value={date} min={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)}/></label>
    </div>
    <p style={{fontSize:12,color:'#596e64'}}>Fare figures below are reference-only: historical GTSC listings, a reported Dakar Dem Dikk partner fare, and an unverified Bissau estimate. They are not confirmed GTSC checkout prices. Stops, schedules and pickup points require verification; international travel may require documents.</p>
    <div style={{background:'#fff8df',padding:'12px 14px',borderRadius:9,marginBottom:14}}><strong>Reference fare (not payable): </strong>{historicalFare?fareLabel(historicalFare):'No origin-specific fare provided'}{historicalFare&&<span style={{display:'block',fontSize:12,marginTop:4}}>{historicalFare.note||'Historical fare sheet; current fare unverified'}</span>}</div>
    <button style={button} disabled={!date||!destination||busy} onClick={search}>{busy?'Searching…':'Search verified departures'}</button>
    <button style={{...button,background:'#e6f0e9',color:'#064c3b',marginLeft:8}} onClick={beginDemo}>Preview sample seat map</button>
   </section>
   {message&&<p role="status" style={{background:'#fef8e7',padding:14,borderRadius:10}}>{message}</p>}
   {trips.length>0&&<section style={panel}><h2 style={heading}>Available departures</h2>{trips.map(t=><button key={t.id} style={{...button,marginRight:8,marginBottom:8,background:selectedTrip?.id===t.id?'#064c3b':'#507c65'}} onClick={()=>{setSelectedTrip(t);setDemoMode(false);setSeat(null);}}>{new Date(t.departure_at).toLocaleString()} — GMD {(t.fare_bututs/100).toFixed(2)}</button>)}</section>}
   {(demoMode||selectedTrip)&&<section style={panel}>
    <h2 style={heading}>{demoMode?'Sample 40-seat layout':'Choose your seat'}</h2>
    <p style={{fontSize:13,color:'#64796d'}}>Grey seats are unavailable. Select one seat. {demoMode?'This preview is local to your browser; it does not reserve a seat.':'Availability can change until the hold is confirmed.'}</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(5, minmax(40px, 1fr))',gap:9,maxWidth:360,margin:'18px auto'}}>
      {Array.from({length:Math.ceil(capacity/4)},(_,r)=>[r*4+1,r*4+2,0,r*4+3,r*4+4]).flat().map((num,i)=>num===0||num>capacity?<span key={'gap'+i}/>:<button key={num} onClick={()=>{setSeat(num);setSampleCheckout(false)}} disabled={unavailable.includes(num)} aria-label={'Seat '+num} aria-pressed={seat===num} style={{height:48,borderRadius:9,border:'1px solid #a1b9aa',fontWeight:700,background:unavailable.includes(num)?'#c6ceca':seat===num?'#0e6b4b':'#e7f3eb',color:unavailable.includes(num)?'#738077':seat===num?'white':'#17543f',cursor:unavailable.includes(num)?'not-allowed':'pointer'}}>{num}</button>)}
    </div>
    <p style={{textAlign:'center'}}>Selected seat: <strong>{seat||'None'}</strong></p>
    {selectedTrip&&bookingEnabled&&<div style={fields}>
      <label style={field}>Passenger name<input style={control} value={customerName} maxLength={120} onChange={e=>setCustomerName(e.target.value)}/></label>
      <label style={field}>Phone number<input style={control} value={customerPhone} maxLength={30} onChange={e=>setCustomerPhone(e.target.value)}/></label>
      <button style={button} disabled={!seat||!customerName.trim()||!customerPhone.trim()||holding} onClick={hold}>{holding?'Holding…':'Hold selected seat for 10 minutes'}</button>
    </div>}
    {demoMode&&<div style={{textAlign:'center'}}><p style={{fontWeight:600}}>Demonstration only — no reservation created.</p><button style={button} disabled={!seat} onClick={()=>setSampleCheckout(true)}>Preview booking summary</button>{sampleCheckout&&seat&&<div style={{background:'#edf7ef',padding:16,borderRadius:10,marginTop:12,textAlign:'left'}}><h3 style={{marginTop:0}}>Sample booking summary</h3><p><strong>Journey:</strong> {origin} → {destination}</p><p><strong>Service:</strong> {service}</p><p><strong>Travel date:</strong> {date||'Not selected'}</p><p><strong>Seat:</strong> {seat}</p><p><strong>Reference fare (not payable):</strong> {historicalFare?fareLabel(historicalFare):'Unavailable'} — not a confirmed current ticket price</p><p><strong>Payment:</strong> Disabled (sandbox setup)</p><p style={{fontSize:13}}>This is not a reservation, payment receipt or valid travel ticket. No QR code has been issued.</p></div>}</div>}
    {holdReceipt&&<p role="status">{holdReceipt}</p>}
   </section>}
   <section style={panel}><h2 style={heading}>Reference fare guide</h2><p style={{fontSize:13,color:'#596e64'}}>For comparison only. The international Dakar figure is a reported January 2026 Dakar Dem Dikk partner fare, not a verified GTSC fare. All regular, express and urban amounts are from an older GTSC fare sheet. No amount here is used for payment.</p>{(['international','regular','express','urban'] as const).map(group=><details key={group} style={{borderTop:'1px solid #dce6dd',padding:'12px 0'}}><summary style={{cursor:'pointer',fontWeight:700,textTransform:'capitalize'}}>{group} ({REFERENCE_FARES[group].length} listed fares)</summary><div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%',marginTop:12}}><thead><tr><th style={{textAlign:'left',padding:8}}>Destination</th><th style={{textAlign:'right',padding:8}}>Reference fare</th></tr></thead><tbody>{REFERENCE_FARES[group].map(item=><tr key={item.destination}><td style={{padding:8,borderTop:'1px solid #ecf0eb'}}>{item.destination}{item.note&&<span style={{display:'block',fontSize:12,color:'#697a6d'}}>{item.note}</span>}</td><td style={{padding:8,borderTop:'1px solid #ecf0eb',textAlign:'right',whiteSpace:'nowrap'}}>{fareLabel(item)}</td></tr>)}</tbody></table></div></details>)}<p style={{fontSize:12}}>Historical regular route Basse anomaly: D20 also appears in the source alongside D220. D20 has not been adopted as a fare in this prototype.</p></section>
   <footer style={{fontSize:12,color:'#65796b',marginTop:25}}>GTSC booking prototype · Live bookings and Modem Pay checkout are disabled until fares, schedules and security tests are approved.</footer>
  </main>;
}
const panel:React.CSSProperties={background:'white',padding:22,borderRadius:16,marginBottom:18,boxShadow:'0 3px 18px rgba(0,0,0,.06)'};
const heading:React.CSSProperties={fontSize:21,margin:'0 0 18px'};
const fields:React.CSSProperties={display:'flex',flexWrap:'wrap',gap:14,marginBottom:14};
const field:React.CSSProperties={display:'flex',flexDirection:'column',gap:6,flex:'1 1 215px',fontWeight:600,fontSize:14};
const control:React.CSSProperties={padding:'11px 12px',border:'1px solid #becdc4',borderRadius:8,fontSize:16,background:'#fff',color:'#173d30'};
const button:React.CSSProperties={padding:'12px 16px',border:0,borderRadius:9,background:'#086847',color:'white',fontWeight:700,cursor:'pointer'};
