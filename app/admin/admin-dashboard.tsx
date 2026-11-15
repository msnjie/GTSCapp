'use client';
import {useEffect,useState} from 'react';
type RequestItem={id:string;passenger_name:string|null;service:string;origin:string;destination:string;preferred_date:string;preferred_seat:number|null;contact_phone:string;contact_email:string|null;status:string;created_at:string};
type Trip={id:string;service_name:string;origin:string;destination:string;departure_at:string;capacity:number;occupied:number;fare_bututs:number};
type Hold={id:string;customer_name:string;customer_phone:string;customer_email:string|null;seat_number:number;status:string;hold_expires_at:string;created_at:string;origin:string;destination:string;departure_at:string;amount_bututs:number};
type Audit={event_type:string;match_status:string;amount_bututs:number|null;currency:string|null;created_at:string};
type Overview={stats:Record<string,number>;requests:RequestItem[];trips:Trip[];holds:Hold[];audits:Audit[];environment:{mode:string;realPaymentsEnabled:boolean}};
const input:React.CSSProperties={padding:12,border:'1px solid #c8cbe8',borderRadius:9,fontSize:16,background:'white'};
const button:React.CSSProperties={padding:'11px 15px',background:'#237b47',color:'white',fontWeight:700,border:0,borderRadius:9,cursor:'pointer'};
const card:React.CSSProperties={background:'#fff',padding:20,borderRadius:14,border:'1px solid #e6e6f2',marginBottom:18,boxShadow:'0 3px 12px #242c6610'};
function date(x:string){return x?new Date(x).toLocaleString('en-GB',{timeZone:'Africa/Banjul'}):'—';}
export default function AdminDashboard({initiallyAuthenticated}:{initiallyAuthenticated:boolean}){
 const [auth,setAuth]=useState(initiallyAuthenticated),[password,setPassword]=useState(''),[data,setData]=useState<Overview|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[tab,setTab]=useState<'requests'|'departures'|'holds'|'payments'|'settings'>('requests');
 const [currentPassword,setCurrentPassword]=useState('');
 const [newPassword,setNewPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const [passwordMessage,setPasswordMessage]=useState('');
 useEffect(()=>{if(initiallyAuthenticated)void load();},[initiallyAuthenticated]);
 async function load(){
  setBusy(true);setError('');
  try{const r=await fetch('/api/admin/overview',{cache:'no-store'});const d=await r.json();if(!r.ok){if(r.status===401)setAuth(false);throw Error(d.error||'Dashboard unavailable');}setData(d);}
  catch(e){setError(e instanceof Error?e.message:'Unable to load dashboard');}
  finally{setBusy(false);}
 }
 async function login(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const d=await r.json();if(!r.ok)throw Error(d.error||'Login failed');setAuth(true);setPassword('');
    const v=await fetch('/api/admin/overview',{cache:'no-store'});if(!v.ok)throw Error('Login succeeded but dashboard did not load');setData(await v.json());
  }catch(e){setError(e instanceof Error?e.message:'Login unavailable');}
  finally{setBusy(false);}
 }
 async function changePassword(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');setPasswordMessage('');
  try{
   const resp=await fetch('/api/admin/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword,newPassword,confirmPassword})});
   const data=await resp.json();
   if(!resp.ok)throw Error(data.error||'Password change failed');
   setCurrentPassword('');setNewPassword('');setConfirmPassword('');setData(null);setAuth(false);
   setPasswordMessage('Password changed successfully. Sign in with your new password. All existing admin sessions have been signed out.');
  }catch(error){setError(error instanceof Error?error.message:'Password change failed');}
  finally{setBusy(false);}
 }
 async function logout(){await fetch('/api/admin/logout',{method:'POST'});setAuth(false);setData(null);}
 async function update(id:string,status:string){
  setBusy(true);setError('');
  try{const r=await fetch('/api/admin/request-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not update');await load();}
  catch(e){setError(e instanceof Error?e.message:'Could not update request');}
  finally{setBusy(false);}
 }
 return <main style={{maxWidth:1150,margin:'0 auto',color:'#222b4c'}}>
  <header style={{background:'linear-gradient(120deg,#30399a,#5142a1)',padding:24,borderRadius:16,color:'white',borderTop:'6px solid #ed4b5a',marginBottom:20}}>
   <img src="/gtsc-logo.png" alt="GTSC logo" width={270} style={{maxWidth:'100%',background:'#fff',padding:8,borderRadius:8}}/>
   <h1 style={{margin:'16px 0 6px'}}>GTSC Admin Dashboard</h1><p style={{margin:0}}>Internal booking operations · Sandbox trial</p>
  </header>
  {!auth?<section style={{...card,maxWidth:460,margin:'32px auto'}}>
   <h2>Administrator sign in</h2><p style={{fontSize:14}}>Authorized GTSC staff only. The dashboard contains private passenger contact information.</p>
   <form onSubmit={login} style={{display:'grid',gap:13}}>
    <label style={{display:'grid',gap:6}}>Admin password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} style={input}/></label>
    <button type="submit" disabled={busy} style={button}>{busy?'Signing in…':'Sign in securely'}</button>
   </form>
   {error&&<p role="alert" style={{color:'#b52438'}}>{error}</p>}
   {passwordMessage&&<p role="status" style={{color:'#237b47'}}>{passwordMessage}</p>}
  </section>:<>
   <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:16,alignItems:'center'}}>
    <p style={{margin:0,fontSize:13}}>Sandbox environment · No real payments or valid tickets</p>
    <div style={{display:'flex',gap:8}}><button onClick={()=>void load()} disabled={busy} style={button}>{busy?'Loading…':'Refresh data'}</button><button onClick={()=>void logout()} style={{...button,background:'#454b76'}}>Sign out</button></div>
   </div>
   {!data&&!busy&&<button style={button} onClick={()=>void load()}>Load dashboard</button>}
   {data&&<>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:12,marginBottom:20}}>
    {(['pending_requests','total_requests','active_holds','upcoming_departures','test_tickets','payment_events'] as const).map(k=><article key={k} style={card}><div style={{fontSize:12,color:'#606684',textTransform:'capitalize'}}>{k.replace(/_/g,' ')}</div><div style={{fontSize:31,fontWeight:800,color:'#30399a'}}>{data.stats[k]??0}</div></article>)}
   </div>
   <nav aria-label="Admin sections" style={{display:'flex',gap:8,overflowX:'auto',marginBottom:17}}>
    {(['requests','departures','holds','payments','settings'] as const).map(x=><button key={x} onClick={()=>setTab(x)} style={{...button,background:tab===x?'#30399a':'#eceeff',color:tab===x?'white':'#30399a'}}>{x==='requests'?'Booking requests':x==='departures'?'Departures':x==='holds'?'Seat holds':x==='payments'?'Payment tests':'Settings'}</button>)}
   </nav>
   <section style={card}>
    {tab==='requests'&&<><h2>Passenger booking requests</h2><p style={{fontSize:13}}>Mark requests contacted, closed or cancelled. These statuses do not reserve seats or collect payments.</p>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Created','Passenger','Contact','Journey','Date / seat','Status','Action'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
      {data.requests.map(x=><tr key={x.id}><td style={td}>{date(x.created_at)}</td><td style={td}>{x.passenger_name||'—'}</td><td style={td}>{x.contact_phone}<div>{x.contact_email||''}</div></td><td style={td}>{x.service}<div>{x.origin} → {x.destination}</div></td><td style={td}>{x.preferred_date}<div>Seat preference: {x.preferred_seat||'any'}</div></td><td style={td}><strong>{x.status.replace(/_/g,' ')}</strong></td><td style={td}><select aria-label={'Update request '+x.id} defaultValue="" disabled={busy||['closed','cancelled'].includes(x.status)} onChange={e=>{if(e.target.value)void update(x.id,e.target.value)}} style={{...input,fontSize:13,padding:7}}><option value="">Change status</option>{(['pending_review','contacted','closed','cancelled'] as const).filter(s=>s!==x.status).map(s=><option value={s} key={s}>{s.replace(/_/g,' ')}</option>)}</select></td></tr>)}
      </tbody></table>{data.requests.length===0&&<p>No booking requests yet.</p>}</div>
    </>}
    {tab==='departures'&&<><h2>Upcoming test departures</h2><p style={{fontSize:13}}>Capacity and occupied seats are from sandbox inventory, not GTSC's live operational system.</p>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Service','Route','Departure (GMT)','Seats','Fare'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.trips.map(x=><tr key={x.id}><td style={td}>{x.service_name}</td><td style={td}>{x.origin} → {x.destination}</td><td style={td}>{date(x.departure_at)}</td><td style={td}>{x.occupied}/{x.capacity} occupied</td><td style={td}>D{(x.fare_bututs/100).toFixed(2)}</td></tr>)}</tbody></table></div>
    </>}
    {tab==='holds'&&<><h2>Recent seat holds and reservations</h2><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Passenger','Contact','Journey','Seat','Status','Hold expiry'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.holds.map(x=><tr key={x.id}><td style={td}>{x.customer_name}</td><td style={td}>{x.customer_phone}<div>{x.customer_email||''}</div></td><td style={td}>{x.origin} → {x.destination}<div>{date(x.departure_at)}</div></td><td style={td}>{x.seat_number}</td><td style={td}>{x.status==='held'&&new Date(x.hold_expires_at)<new Date()?'expired hold':x.status}</td><td style={td}>{date(x.hold_expires_at)}</td></tr>)}</tbody></table></div></>}
    {tab==='settings'&&<><h2>Change administrator password</h2>
     <p style={{fontSize:13}}>Only signed-in administrators can change the password. Use at least 14 characters, including a letter and a number. All existing sessions will be invalidated.</p>
     <form onSubmit={changePassword} style={{display:'grid',gap:12,maxWidth:460}}>
      <label style={{display:'grid',gap:6}}>Current password<input type="password" autoComplete="current-password" minLength={8} maxLength={200} required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} style={input}/></label>
      <label style={{display:'grid',gap:6}}>New password<input type="password" autoComplete="new-password" minLength={14} maxLength={200} required value={newPassword} onChange={e=>setNewPassword(e.target.value)} style={input}/></label>
      <label style={{display:'grid',gap:6}}>Confirm new password<input type="password" autoComplete="new-password" minLength={14} maxLength={200} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} style={input}/></label>
      <button type="submit" disabled={busy||newPassword.length<14||newPassword!==confirmPassword} style={button}>{busy?'Updating…':'Update password and sign out'}</button>
     </form>
     {passwordMessage&&<p role="status">{passwordMessage}</p>}
    </>}
    {tab==='payments'&&<><h2>Modem Pay sandbox audit</h2><p>These are TEST events, not real payment receipts. Live checkout remains disabled.</p><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Time','Event','Match status','Simulated amount'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{data.audits.map((x,i)=><tr key={i}><td style={td}>{date(x.created_at)}</td><td style={td}>{x.event_type}</td><td style={td}>{x.match_status}</td><td style={td}>{x.amount_bututs===null?'—':'D'+(x.amount_bututs/100).toFixed(2)}</td></tr>)}</tbody></table></div></>}
   </section>
   </>}
   {error&&<p role="alert" style={{color:'#b52438',background:'#fff1f2',padding:12,borderRadius:8}}>{error}</p>}
  </>}
 </main>;
}
const th:React.CSSProperties={textAlign:'left',borderBottom:'2px solid #e3e5f3',padding:'10px 8px',whiteSpace:'nowrap'};
const td:React.CSSProperties={padding:'11px 8px',borderBottom:'1px solid #eef0f8',verticalAlign:'top'};
