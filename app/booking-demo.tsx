'use client';
import {useEffect,useState} from 'react';
import {REFERENCE_FARES,referenceFare,fareLabel} from '../lib/reference-fares';
import Timetable from './timetable';
import BookingRequestForm from './booking-request-form';
import {ALL_GTSC_LOCATIONS} from '../lib/routes';
const SERVICES={
 'All locations (departure request)':ALL_GTSC_LOCATIONS,
 'Nuwari Express':['Kanifing','Basse'],
 'Super Express':['Kanifing','Brikama','Soma','Brikama Ba','Janjanbureh','Bansang','Bakadaji','Basse'],
 'Express':['Banjul','Serrekunda','Brikama','Soma','Kundang','Brikama-Ba','Janjan Burreh','Bansang','Bakadaji','Basse'],
 'Normal':['Kanifing','Faraba Banta','Bulock','Kabokor','Bajagar','Sangajor','Kalaji','Wurokang','Kolior','Soma','Jalang Bereh','Wellingara Ba','Pakaliba','Jareng','Kudang','Jahali','Nurtabeh','Banjulinding','Sare Modu','Sare Bakary','Sare Sambel','Basse'],
 'International (Dakar)':['Kanifing','Dakar, Senegal','Banjul'],
 'International (Bissau)':['Kanifing','Bissau, Guinea-Bissau'],
 'International (Kaolack)':['Kanifing','Kaolack, Senegal'],
 'International (Tivaouane)':['Kanifing','Tivaouane, Senegal'],
 'Up-country':['Kanifing','Kunting','Mankamang Kunda','Koina','Kudang'],
 'North Bank':['Essau','Farafenni','Kaur','Wassu','Panchang'],
 'Urban':['Banjul','Serrekunda','Kanifing','Brikama','Kartong','Giboroh','Kafuta','Mandinaring','Tabokoto','Lamin']
} as const;
type Service=keyof typeof SERVICES;
type Trip={id:string;origin:string;destination:string;departure_at:string;capacity:number;fare_bututs:number};
export default function BookingDemo(){
 const [service,setService]=useState<Service>('Nuwari Express');
 const stops:readonly string[]=SERVICES[service];
 const [origin,setOrigin]=useState('Kanifing');
 const [destination,setDestination]=useState('Basse');
 const [date,setDate]=useState(()=>new Date(Date.now()+86400000).toISOString().slice(0,10));
 const [trips,setTrips]=useState<Trip[]>([]);
 const [selectedTrip,setSelectedTrip]=useState<Trip|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [unavailable,setUnavailable]=useState<number[]>([]);
 const [seat,setSeat]=useState<number|null>(null);
 const [demoMode,setDemoMode]=useState(false);
 const [holding,setHolding]=useState(false);
 const [passengerName,setPassengerName]=useState('');
 const [passengerPhone,setPassengerPhone]=useState('');
 const [passengerEmail,setPassengerEmail]=useState('');
 const [sampleCheckout,setSampleCheckout]=useState(false);
 const [holdReceipt,setHoldReceipt]=useState('');
 const [bookingEnabled,setBookingEnabled]=useState(false);
 const [checkoutReservationId,setCheckoutReservationId]=useState('');
 const [ticketAccessToken,setTicketAccessToken]=useState('');
 const [checkoutBusy,setCheckoutBusy]=useState(false);
 const [checkoutUrl,setCheckoutUrl]=useState('');
 const [checkoutError,setCheckoutError]=useState('');
 const destinations=service==='All locations (departure request)'?stops.filter(stop=>stop!==origin):service==='International (Dakar)'?(origin==='Dakar, Senegal'?['Banjul']:['Dakar, Senegal']):(['Urban','Up-country','North Bank'].includes(service)?stops.filter(stop=>stop!==origin):stops.slice(Math.max(0,stops.indexOf(origin)+1)));
 const contactMessage='GTSC SANDBOX BOOKING ENQUIRY (NOT A PAID BOOKING). Service: '+service+'. From: '+origin+'. To: '+destination+'. Preferred date: '+(date||'not selected')+'. Please confirm departure, availability and fare. No payment has been made.';
 const contactHref='https://wa.me/2203663800?text='+encodeURIComponent(contactMessage);
 const historicalFare=referenceFare(service,origin,destination);
 const capacity=demoMode?40:selectedTrip?.capacity??0;
 const passengerDetailsValid=Boolean(passengerName.trim().length>=2&&/^\+[1-9]\d{7,14}$/.test(passengerPhone.trim())&&(!passengerEmail.trim()||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passengerEmail.trim())));
 async function search(){
  if(!passengerDetailsValid){setMessage('Enter your full name and international phone number in the passenger details section. Email is optional.');return;}
  setBusy(true);setDemoMode(false);setSelectedTrip(null);setSeat(null);setHoldReceipt('');setCheckoutReservationId('');setTicketAccessToken('');setCheckoutUrl('');setCheckoutError('');setMessage('');
  try{
   const resp=await fetch('/api/trips?'+new URLSearchParams({origin,destination,date,service}),{cache:'no-store'});
   const data=await resp.json();
   if(!resp.ok)throw new Error(data.error||'Unable to search');
   setTrips(data.trips||[]);setBookingEnabled(Boolean(data.bookingEnabled));
   setMessage(data.trips?.length?'Choose a departure below.':(data.notice||'No test departures available for this route or date. Please use the booking enquiry link for service confirmation.'));
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
 function chooseService(s:Service){
  setService(s);
  const from=s==='All locations (departure request)'?'Banjul':s==='International (Dakar)'||s==='Nuwari Express'||s==='Super Express'||s.startsWith('International (')||s==='Up-country'||s==='Normal'?'Kanifing':s==='North Bank'?'Essau':'Banjul';
  const list:readonly string[]=SERVICES[s];
  setOrigin(from);
  setDestination(s==='All locations (departure request)'?'Kanifing':s==='International (Dakar)'?'Dakar, Senegal':s==='Super Express'||s==='Nuwari Express'||s==='Normal'||s==='Express'?'Basse':list.find(x=>x!==from)||'');
  setSelectedTrip(null);setSeat(null);setTrips([]);setDemoMode(false);setSampleCheckout(false);
  setCheckoutReservationId('');setCheckoutUrl('');setCheckoutError('');setHoldReceipt('');setMessage('');
 }
 function beginDemo(){setDemoMode(true);setSelectedTrip(null);setSeat(null);setUnavailable([3,8,14,26]);setHoldReceipt('');setCheckoutReservationId('');setCheckoutUrl('');setCheckoutError('');setSampleCheckout(false);setMessage('Sample bus seat map — example seats only, not GTSC live inventory.');}
 async function beginSandboxCheckout(){
  if(!checkoutReservationId||checkoutBusy)return;
  setCheckoutBusy(true);setCheckoutError('');setCheckoutUrl('');
  try{
   const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reservationId:checkoutReservationId})});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||'Sandbox checkout is unavailable');
   const link=new URL(d.checkoutUrl);
   if(link.protocol!=='https:'||link.hostname!=='test.checkout.modempay.com')throw new Error('Unexpected test checkout address');
   setCheckoutUrl(link.toString());
  }catch(e){setCheckoutError(e instanceof Error?e.message:'Could not open sandbox checkout');}
  finally{setCheckoutBusy(false);}
 }
 async function hold(){
  if(!selectedTrip||!bookingEnabled||!seat||!passengerName.trim()||!/^\+[1-9]\d{7,14}$/.test(passengerPhone.trim()))return;
  setHolding(true);setMessage('');setHoldReceipt('');
  try{
   const resp=await fetch('/api/holds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tripId:selectedTrip.id,seatNumber:seat,passengerName:passengerName.trim(),phone:passengerPhone.trim(),email:passengerEmail.trim()})});
   const d=await resp.json();if(!resp.ok)throw new Error(d.error||'Reservation unsuccessful');
   setCheckoutReservationId(d.reservationId);
   setTicketAccessToken(typeof d.accessToken==='string'?d.accessToken:'');
   setCheckoutUrl('');setCheckoutError('');
   setHoldReceipt('Sandbox test seat hold '+d.reservationId+' expires '+new Date(d.expiresAt).toLocaleTimeString()+'. It is NOT a confirmed booking or valid travel ticket. No money was collected. Successful simulated payment before expiry can issue a test ticket.');
   setUnavailable(x=>[...x,seat]);
   setSeat(null);
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to hold seat');}
  finally{setHolding(false);}
 }
 return <main style={{maxWidth:840,margin:'0 auto',color:'#23284b'}}>
   <header style={{background:'linear-gradient(125deg,#30399a 0%,#4e42a2 72%,#2c5887 100%)',color:'white',padding:28,borderRadius:18,marginBottom:20,borderTop:'7px solid #ed4b5a',boxShadow:'0 8px 25px rgba(45,48,123,.18)'}}>
     <div style={{background:'#fff',display:'inline-flex',alignItems:'center',padding:'10px 14px',borderRadius:12,maxWidth:'100%',marginBottom:12}}><img src="/gtsc-logo.png" alt="Gambia Transport Service Company logo" width={382} height={94} style={{maxWidth:'100%',height:'auto',objectFit:'contain'}}/></div>
     <div style={{fontSize:12,letterSpacing:2}}>GAMBIA TRANSPORT SERVICE COMPANY</div><h1 style={{margin:'8px 0'}}>GTSC Bus Booking</h1>
     <p style={{margin:0}}>Search journeys and explore seat selection</p>
     <div style={{display:'flex',gap:6,marginTop:15,marginBottom:12}} aria-hidden="true"><span style={{height:5,flex:1,background:'#ef4b5d',borderRadius:8}}/><span style={{height:5,flex:1,background:'#52a665',borderRadius:8}}/><span style={{height:5,flex:1,background:'#aaa5fa',borderRadius:8}}/></div>
     <p style={{fontSize:13,marginBottom:0,color:'#e2e6ff'}}>SANDBOX BOOKING TRIAL — test holds only, automatically expire in 10 minutes. No real charges or travel tickets. Optional Modem Pay TEST checkout can be used for simulation.</p>
   </header>
   <section style={panel}>
    <h2 style={heading}>Book your journey</h2>
    <p style={{fontSize:13,color:'#626985'}}>Select your service, departure, destination and travel date. Scheduled test trips can be booked with a temporary seat hold. Every listed route also accepts online booking requests if a scheduled trip is not yet available.</p>
    <div style={fields}>
     <label style={field}>Bus service<select value={service} onChange={e=>chooseService(e.target.value as Service)} style={control}><option value="All locations (departure request)">All GTSC locations — request departure</option><option value="Nuwari Express">Nuwari Express</option><option value="Super Express">Super Express</option><option value="Express">Express (historic fares)</option><option value="Normal">Normal Service</option><option value="International (Dakar)">International (Dakar)</option><option value="International (Bissau)">International (Bissau)</option><option value="International (Kaolack)">International (Kaolack)</option><option value="International (Tivaouane)">International (Tivaouane)</option><option value="Up-country">Up-country</option><option value="North Bank">North Bank</option><option value="Urban">Urban</option></select></label>
     <label style={field}>Departure<select value={origin} onChange={e=>{const from=e.target.value;setOrigin(from);setDestination(service==='International (Dakar)'?(from==='Dakar, Senegal'?'Banjul':'Dakar, Senegal'):['Urban','Up-country','North Bank','All locations (departure request)'].includes(service)?stops.find(x=>x!==from)||'':stops.slice(stops.indexOf(from)+1)[0]||'');setSelectedTrip(null);setSeat(null);setTrips([]);setHoldReceipt('');setCheckoutReservationId('')}} style={control}>{(['Urban','Up-country','North Bank','All locations (departure request)'].includes(service)?stops:service==='International (Dakar)'?['Kanifing','Dakar, Senegal']:stops.slice(0,-1)).map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <label style={field}>Destination<select value={destination} onChange={e=>{setDestination(e.target.value);setSelectedTrip(null);setSeat(null);setTrips([]);setHoldReceipt('');setCheckoutReservationId('')}} style={control}>{destinations.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <label style={field}>Travel date<input type="date" style={control} value={date} min={new Date().toISOString().slice(0,10)} onChange={e=>{setDate(e.target.value);setSelectedTrip(null);setSeat(null);setTrips([]);setHoldReceipt('');setCheckoutReservationId('')}}/></label>
    </div>
    <h3 style={{fontSize:18,color:'#30399a',margin:'12px 0'}}>Passenger details</h3>
    <p style={{fontSize:13,color:'#626985',marginTop:0}}>Enter your details once for the journey search, test seat hold, or pending booking request. Full name and phone number are required; email is optional.</p>
    <div style={fields}>
      <label style={field}>Passenger full name (required)
        <input required type="text" autoComplete="name" minLength={2} maxLength={100} value={passengerName} onChange={e=>setPassengerName(e.target.value)} placeholder="First and last name" style={control}/>
      </label>
      <label style={field}>Phone number (required)
        <input required type="tel" autoComplete="tel" pattern="[+][1-9][0-9]{7,14}" value={passengerPhone} onChange={e=>setPassengerPhone(e.target.value)} placeholder="+2203663800" style={control}/>
      </label>
      <label style={field}>Email address (optional)
        <input type="email" autoComplete="email" maxLength={254} value={passengerEmail} onChange={e=>setPassengerEmail(e.target.value)} placeholder="name@example.com" style={control}/>
      </label>
    </div>
    <p style={{fontSize:12,color:'#626985'}}>This is a sandbox demonstration: no real payments or valid travel tickets. Routes without scheduled seat inventory can submit a request at the bottom of the page.</p>
    <div style={{background:'#fff4e9',padding:'12px 14px',borderRadius:9,marginBottom:14}}><strong>Reference fare (not payable yet): </strong>{historicalFare?fareLabel(historicalFare):'No origin-specific fare provided'}{historicalFare&&<span style={{display:'block',fontSize:12,marginTop:4}}>{historicalFare.note||'Amount approved for GTSC app; departure availability not yet published'}</span>}</div>
    <button style={button} disabled={!date||!destination||!passengerDetailsValid||busy} onClick={search}>{busy?'Searching…':'Search available buses'}</button>
    <details style={{marginTop:14,fontSize:13}}><summary style={{cursor:'pointer',color:'#30399a',fontWeight:700}}>Demo tools and other booking options</summary><div style={{padding:12,background:'#f5f6ff',borderRadius:9,marginTop:8}}><button style={{...button,background:'#edf0ff',color:'#323d96'}} onClick={beginDemo}>Preview sample seat map</button><p>For a route without scheduled inventory, <a href="#booking-request-bottom" style={{color:'#30399a',fontWeight:700}}>submit an online booking request</a> below.</p></div></details>

   </section>
   {message&&<div role="status" style={{background:'#fff8ec',padding:14,borderRadius:10,marginBottom:16}}><p style={{margin:'0 0 8px'}}>{message}</p>{trips.length===0&&<a style={{color:'#30399a',fontWeight:700}} href="#booking-request-bottom">Continue with an online booking request</a>}</div>}
   {trips.length>0&&<section style={panel}><h2 style={heading}>Available departures</h2>{trips.map(t=><button key={t.id} style={{...button,marginRight:8,marginBottom:8,background:selectedTrip?.id===t.id?'#30399a':'#5356a8',outline:selectedTrip?.id===t.id?'3px solid #e84a58':'none'}} onClick={()=>{setSelectedTrip(t);setDemoMode(false);setSeat(null);}}>{new Date(t.departure_at).toLocaleString()} — GMD {(t.fare_bututs/100).toFixed(2)}</button>)}</section>}
   {(demoMode||selectedTrip)&&<section style={panel}>
    <h2 style={heading}>{demoMode?'Sample 40-seat layout':'Choose your seat'}</h2>
    <p style={{fontSize:13,color:'#626985'}}>Grey seats are unavailable. Select one seat. {demoMode?'This preview is local to your browser; it does not reserve a seat.':'Availability can change until the hold is confirmed.'}</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(5, minmax(40px, 1fr))',gap:9,maxWidth:360,margin:'18px auto'}}>
      {Array.from({length:Math.ceil(capacity/4)},(_,r)=>[r*4+1,r*4+2,0,r*4+3,r*4+4]).flat().map((num,i)=>num===0||num>capacity?<span key={'gap'+i}/>:<button key={num} onClick={()=>{setSeat(num);setSampleCheckout(false)}} disabled={unavailable.includes(num)} aria-label={'Seat '+num} aria-pressed={seat===num} style={{height:48,borderRadius:9,border:'1px solid #aab1d6',fontWeight:700,background:unavailable.includes(num)?'#c9cce0':seat===num?'#30399a':'#eaeaff',color:unavailable.includes(num)?'#747997':seat===num?'white':'#323d96',cursor:unavailable.includes(num)?'not-allowed':'pointer'}}>{num}</button>)}
    </div>
    <p style={{textAlign:'center'}}>Selected seat: <strong>{seat||'None'}</strong></p>
    {selectedTrip&&bookingEnabled&&<div style={{display:'grid',gap:12,marginTop:20}}>
      <p style={{fontSize:13,margin:0}}>Passenger: <strong>{passengerName.trim()||'Not entered'}</strong> · Phone: <strong>{passengerPhone.trim()||'Not entered'}</strong>. Update passenger information in the search section above. This test hold expires after 10 minutes and is not valid for travel.</p>
      <button type="button" style={button} disabled={!seat||holding||!passengerName.trim()||!/^\+[1-9]\d{7,14}$/.test(passengerPhone.trim())||Boolean(passengerEmail.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passengerEmail.trim()))} onClick={()=>void hold()}>{holding?'Holding…':'Create 10-minute TEST seat hold'}</button>
    </div>}
    {demoMode&&<div style={{textAlign:'center'}}><p style={{fontWeight:600}}>Demonstration only — no reservation created.</p><button style={button} disabled={!seat} onClick={()=>setSampleCheckout(true)}>Preview booking summary</button>{sampleCheckout&&seat&&<div style={{background:'#eef7f1',padding:16,borderRadius:10,marginTop:12,textAlign:'left'}}><h3 style={{marginTop:0}}>Sample booking summary</h3><p><strong>Journey:</strong> {origin} → {destination}</p><p><strong>Service:</strong> {service}</p><p><strong>Travel date:</strong> {date||'Not selected'}</p><p><strong>Seat:</strong> {seat}</p><p><strong>Approved fare (not payable yet):</strong> {historicalFare?fareLabel(historicalFare):'Unavailable'} — no payable departure currently selected</p><p><strong>Payment:</strong> Disabled (sandbox setup)</p><p style={{fontSize:13}}>This is not a reservation, payment receipt or valid travel ticket. No QR code has been issued.</p></div>}</div>}
    {holdReceipt&&<p role="status">{holdReceipt}</p>}
    {checkoutReservationId&&!demoMode&&<div style={{margin:'12px 0',padding:14,borderRadius:10,background:'#eef8f0',border:'1px solid #b9d8c3'}}><strong>WhatsApp test contact</strong><p style={{fontSize:13,margin:'8px 0'}}>Open a prefilled test message to GTSC at +220 366 3800. You must tap Send inside WhatsApp; this is not an automatic payment confirmation.</p><a href={'https://wa.me/2203663800?text='+encodeURIComponent('GTSC SANDBOX TEST — NO PAYMENT RECEIVED. This is not a valid ticket or confirmed booking. Test hold reference: '+checkoutReservationId+'. Journey: '+origin+' to '+destination+'. Please do not use this message as payment proof.')} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',background:'#267c49',color:'#fff',padding:'11px 14px',borderRadius:9,fontWeight:700,textDecoration:'none'}}>Open GTSC WhatsApp test message</a></div>}

    {ticketAccessToken&&!demoMode&&<div style={{border:'1px solid #b9d8c3',borderRadius:10,padding:14,background:'#eef7f1',marginTop:12}}><strong>Your sandbox test ticket</strong><p style={{fontSize:13}}>After completing a successful Modem Pay TEST transaction, open this private link to check your payment and view the printable SANDBOX ticket. Keep the link private. It will never be valid for travel.</p><a href={'/sandbox-ticket?token='+encodeURIComponent(ticketAccessToken)} target="_blank" rel="noopener noreferrer" style={{fontWeight:700,color:'#323d96'}}>Check test payment / view test ticket</a></div>}
    {checkoutReservationId&&!demoMode&&<div style={{border:'1px solid #e9b9b8',borderRadius:10,padding:14,marginTop:12,background:'#fff9ed'}}><strong>Modem Pay sandbox test</strong><p style={{fontSize:13}}>Only use the Modem Pay TEST checkout page. It does not confirm the GTSC booking or issue a ticket. The seat hold expires in 10 minutes even if payment is still in progress. A verified TEST payment before expiry may generate a sandbox-only ticket.</p><button style={button} disabled={checkoutBusy} onClick={beginSandboxCheckout}>{checkoutBusy?'Preparing test payment…':'Create Modem Pay TEST payment link'}</button>{checkoutUrl&&<p><a href={checkoutUrl} target="_blank" rel="noopener noreferrer" style={{fontWeight:700,color:'#323d96',textDecoration:'underline'}}>Open secure Modem Pay TEST checkout</a></p>}{checkoutError&&<p role="alert">{checkoutError}</p>}</div>}
   </section>}

   <Timetable/>
   <section style={panel}><h2 style={heading}>Approved fare guide</h2><p style={{fontSize:13,color:'#626985'}}>Amounts approved by the project owner for this app. Dakar is D1,150 from the more recent timetable; 12,000 CFA is a conflicting amount, not an equivalent conversion; other figures came from the fare list provided. These are not yet connected to chargeable scheduled trips. GTSC operations and merchant go-live checks remain outstanding.</p>{(['international','regular','express','urban'] as const).map(group=><details key={group} style={{borderTop:'1px solid #e0e1f2',padding:'12px 0'}}><summary style={{cursor:'pointer',fontWeight:700,textTransform:'capitalize'}}>{group} ({REFERENCE_FARES[group].length} listed fares)</summary><div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%',marginTop:12}}><thead><tr><th style={{textAlign:'left',padding:8}}>Destination</th><th style={{textAlign:'right',padding:8}}>Reference fare</th></tr></thead><tbody>{REFERENCE_FARES[group].map(item=><tr key={item.destination}><td style={{padding:8,borderTop:'1px solid #e8e9f5'}}>{item.destination}{item.note&&<span style={{display:'block',fontSize:12,color:'#697a6d'}}>{item.note}</span>}</td><td style={{padding:8,borderTop:'1px solid #e8e9f5',textAlign:'right',whiteSpace:'nowrap'}}>{fareLabel(item)}</td></tr>)}</tbody></table></div></details>)}<p style={{fontSize:12}}>Historical regular route Basse anomaly: D20 also appears in the source alongside D220. D20 has not been adopted as a fare in this prototype.</p></section>
   <div id="booking-request-bottom" style={{scrollMarginTop:20}}>   <BookingRequestForm key={service+'|'+origin+'|'+destination+'|'+date} service={service} origin={origin} destination={destination} date={date} passengerName={passengerName} phone={passengerPhone} email={passengerEmail}/></div>
   <footer style={{fontSize:12,color:'#626985',marginTop:25,textAlign:'center',paddingBottom:18}}>GTSC SANDBOX trial · Test seat holds do not create real bookings. Only sandbox payment simulation. No real charges, confirmed reservations or valid travel tickets.<div style={{marginTop:10}}>Developed by <a href="https://www.nwebplus.gm" target="_blank" rel="noopener noreferrer" style={{fontWeight:700,color:'#323d96',textDecoration:'underline'}}>N-WEB PLUS</a></div></footer>
  </main>;
}
const panel:React.CSSProperties={background:'white',padding:24,borderRadius:16,marginBottom:20,border:'1px solid #e5e5f3',boxShadow:'0 5px 20px rgba(43,49,126,.075)'};
const heading:React.CSSProperties={fontSize:21,margin:'0 0 18px',color:'#30399a',borderLeft:'5px solid #ed4b5a',paddingLeft:12};
const fields:React.CSSProperties={display:'flex',flexWrap:'wrap',gap:14,marginBottom:14};
const field:React.CSSProperties={display:'flex',flexDirection:'column',gap:6,flex:'1 1 215px',fontWeight:600,fontSize:14};
const control:React.CSSProperties={padding:'11px 12px',border:'1px solid #c4c7e6',borderRadius:9,fontSize:16,background:'#fff',color:'#23284b'};
const button:React.CSSProperties={padding:'12px 16px',border:0,borderRadius:9,background:'#237b47',color:'white',fontWeight:700,cursor:'pointer',boxShadow:'0 3px 9px rgba(35,123,71,.13)'};
