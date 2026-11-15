// Project-owner-approved reference fare amounts. No schedule or live payment is authorized by this file.
// Only Banjul-origin routes and the Dakar pair have supplied origin-specific prices.
export type FareGroup='regular'|'express'|'urban'|'international';
export type FareReference={destination:string;amount:number;currency:'GMD';note?:string};
export const REFERENCE_FARES:Record<FareGroup,readonly FareReference[]>={
 international:[
  {destination:'Dakar, Senegal',amount:1500,currency:'GMD',note:'D1,500 approved for the prototype by the project owner; originally converted from 12,000 CFA. Confirm this applies to each direction before GTSC launch'},
  {destination:'Bissau, Guinea-Bissau',amount:700,currency:'GMD',note:'D700 approved by the project owner; confirm Bissau service with GTSC'}
 ],
 regular:[
  {destination:'Faraba Banta',amount:25,currency:'GMD'},
  {destination:'Bulock',amount:30,currency:'GMD'},
  {destination:'Kabokor',amount:40,currency:'GMD'},
  {destination:'Bajagar',amount:50,currency:'GMD'},
  {destination:'Sangajor',amount:60,currency:'GMD'},
  {destination:'Kalaji',amount:70,currency:'GMD'},
  {destination:'Wurokang',amount:80,currency:'GMD'},
  {destination:'Kolior',amount:90,currency:'GMD'},
  {destination:'Soma',amount:100,currency:'GMD'},
  {destination:'Jalang Bereh',amount:105,currency:'GMD'},
  {destination:'Wellingara Ba',amount:110,currency:'GMD'},
  {destination:'Pakaliba',amount:120,currency:'GMD'},
  {destination:'Jareng',amount:130,currency:'GMD'},
  {destination:'Kudang',amount:140,currency:'GMD'},
  {destination:'Jahali',amount:155,currency:'GMD'},
  {destination:'Nurtabeh',amount:170,currency:'GMD'},
  {destination:'Banjulinding',amount:185,currency:'GMD'},
  {destination:'Sare Modu',amount:200,currency:'GMD'},
  {destination:'Sare Bakary',amount:210,currency:'GMD'},
  {destination:'Sare Sambel',amount:215,currency:'GMD'},
  {destination:'Basse',amount:220,currency:'GMD',note:'D220 approved by the project owner. D20 duplicate historical entry excluded as apparent error'}
 ],
 express:[
  {destination:'Serrekunda',amount:15,currency:'GMD'},
  {destination:'Brikama',amount:25,currency:'GMD'},
  {destination:'Soma',amount:130,currency:'GMD'},
  {destination:'Kundang',amount:160,currency:'GMD'},
  {destination:'Brikama-Ba',amount:200,currency:'GMD'},
  {destination:'Janjan Burreh',amount:220,currency:'GMD'},
  {destination:'Bansang',amount:230,currency:'GMD'},
  {destination:'Bakadaji',amount:250,currency:'GMD'},
  {destination:'Basse',amount:260,currency:'GMD'}
 ],
 urban:[
  {destination:'Kartong',amount:35,currency:'GMD'},
  {destination:'Giboroh',amount:30,currency:'GMD'},
  {destination:'Kafuta',amount:30,currency:'GMD'},
  {destination:'Brikama',amount:20,currency:'GMD'},
  {destination:'Mandinaring',amount:20,currency:'GMD'},
  {destination:'Tabokoto',amount:15,currency:'GMD'},
  {destination:'Lamin',amount:18,currency:'GMD'}
 ]
};
export function referenceFare(service:string,origin:string,destination:string):FareReference|undefined{
 if(service==='International (Dakar)'&&destination==='Dakar, Senegal'||service==='International (Dakar)'&&origin==='Dakar, Senegal')return REFERENCE_FARES.international[0];
 if(service==='International (Bissau)'&&origin==='Banjul'&&destination==='Bissau, Guinea-Bissau')return REFERENCE_FARES.international[1];
 if(origin!=='Banjul')return undefined; // No origin-specific rates supplied for intermediate boardings.
 const key:FareGroup=service==='Express'?'express':service==='Normal'?'regular':service==='Urban'?'urban':'international';
 return REFERENCE_FARES[key].find(f=>f.destination===destination);
}
export function fareLabel(f:FareReference){return 'D'+f.amount.toLocaleString('en-US');}

/**
 * Only the explicit fares approved by the project owner are returned.
 * A missing origin-specific price must NEVER be guessed from another stop.
 * Monetary units: bututs (1 GMD = 100 bututs).
 */
export function approvedAmountBututs(service:string,origin:string,destination:string):number|null{
 const reference=referenceFare(service,origin,destination);
 return reference?reference.amount*100:null;
}
