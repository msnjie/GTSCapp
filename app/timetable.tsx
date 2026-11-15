'use client';
import {useEffect,useState} from 'react';
type Item={code:string;service_name:string;origin:string;destination:string;departure_time:string|null;frequency_label:string;fare_bututs:number|null;capacity:number|null;intermediate_fares:Record<string,number>|null;boarding_note:string|null;note:string|null};
function label(gmd:number|null){return gmd===null?'Fare to confirm':'D'+(gmd/100).toLocaleString('en-US',{maximumFractionDigits:2});}
export default function Timetable(){
 const [items,setItems]=useState<Item[]>([]);
 const [failure,setFailure]=useState('');
 const [filter,setFilter]=useState('all');
 useEffect(()=>{let live=true;fetch('/api/schedules',{cache:'no-store'}).then(r=>r.json().then(d=>{if(!r.ok)throw Error(d.error||'Could not load timetables');return d})).then(d=>{if(live)setItems(d.schedules||[])}).catch(e=>{if(live)setFailure(e.message)});return()=>{live=false}},[]);
 function group(code:string){return /^(nuwari|super|normal|kunting|mankamang|basse)_/.test(code)?'south':/^(dakar|kaolack|tivaouane|bissau)_/.test(code)?'international':'other'}
 const shown=items.filter(s=>filter==='all'||group(s.code)===filter);
 return <section style={{background:'white',padding:22,borderRadius:16,marginBottom:18,boxShadow:'0 3px 18px rgba(0,0,0,.06)'}}>
  <h2 style={{fontSize:21,margin:'0 0 8px'}}>GTSC timetable guide</h2>
  <p style={{fontSize:13,color:'#596e64'}}>Times and prices provided for this project, displayed in Gambian dalasi. Forty seats per bus are recorded for Nuwari Express, Super Express, Normal Service and Dakar International, as confirmed by the project owner. The listed services are not open for online seat sales.</p>
  <label style={{display:'block',fontWeight:600,margin:'12px 0'}}>View corridor
   <select value={filter} onChange={e=>setFilter(e.target.value)} style={{display:'block',width:'100%',maxWidth:400,marginTop:5,padding:11,borderRadius:8,border:'1px solid #c8d8ce',fontSize:16}}>
    <option value="all">All services</option><option value="south">South Bank & up-country</option><option value="international">International</option><option value="other">North Bank & urban</option>
   </select>
  </label>
  {failure&&<p role="alert">{failure}</p>}
  {!failure&&items.length===0&&<p>Loading timetable information…</p>}
  <div style={{display:'grid',gap:10}}>{shown.map(s=><article key={s.code} style={{border:'1px solid #dbe6de',padding:14,borderRadius:10}}>
   <div style={{fontWeight:700}}>{s.service_name}</div>
   <div style={{fontSize:14,margin:'4px 0'}}>{s.origin} → {s.destination}</div>
   <div style={{display:'flex',gap:14,flexWrap:'wrap',fontSize:14}}>
    <span><strong>{s.departure_time||'Time not confirmed'}</strong> {s.departure_time?'GMT':''}</span>
    <span>{s.frequency_label}</span>
    <span><strong>{label(s.fare_bututs)}</strong></span>
    {s.capacity!==null&&<span><strong>{s.capacity} seats</strong> per bus</span>}
   </div>
   {s.boarding_note&&<p style={{fontSize:12,margin:'6px 0',color:'#596e64'}}>Boarding: {s.boarding_note}</p>}
   {s.intermediate_fares&&Object.keys(s.intermediate_fares).length>0&&<p style={{fontSize:12,margin:'6px 0',color:'#596e64'}}>Intermediate reference fares: {Object.entries(s.intermediate_fares).map(([stop,amount])=>stop+' D'+amount).join(' · ')}</p>}
   {s.note&&<p style={{fontSize:12,margin:'6px 0',color:'#596e64'}}>{s.note}</p>}
   <div style={{fontSize:12,fontWeight:700,color:'#906318'}}>Not open for online booking yet</div>
  </article>)}</div>
  <p style={{fontSize:12,color:'#596e64',marginTop:12}}>Kanifing Booking Desk: +220 7941106 · +220 877941106 · +220 877941104 · +220 9092222. Dakar Colobane: +221 78 353 04 24 · +221 78 710 24 84. Confirm departures with the terminals before travelling.</p>
 </section>
}
