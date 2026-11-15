const ALL_STOPS = [
 'Banjul','Kanifing','Serrekunda','Brikama','Soma','Kundang','Brikama-Ba','Brikama Ba',
 'Janjan Burreh','Janjanbureh','Bansang','Bakadaji','Basse','Faraba Banta','Bulock',
 'Kabokor','Bajagar','Sangajor','Kalaji','Wurokang','Kolior','Jalang Bereh',
 'Wellingara Ba','Pakaliba','Jareng','Kudang','Jahali','Nurtabeh','Banjulinding',
 'Sare Modu','Sare Bakary','Sare Sambel','Kunting','Mankamang Kunda','Koina',
 'Essau','Farafenni','Kaur','Wassu','Panchang','Kartong','Giboroh','Kafuta',
 'Mandinaring','Tabokoto','Lamin','Dakar, Senegal','Bissau, Guinea-Bissau',
 'Kaolack, Senegal','Tivaouane, Senegal'
] as const;
export const ALL_GTSC_LOCATIONS:readonly string[]=[...new Set(ALL_STOPS)].sort((a,b)=>a.localeCompare(b));
export const REQUEST_ROUTES = {
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
export type RouteService = keyof typeof REQUEST_ROUTES;
export function allowedRequestRoute(service:string, origin:string, destination:string):boolean{
 if(!Object.prototype.hasOwnProperty.call(REQUEST_ROUTES,service))return false;
 const stops:readonly string[]=REQUEST_ROUTES[service as RouteService];
 if(!stops.includes(origin)||!stops.includes(destination)||origin===destination)return false;
 if(service==='All locations (departure request)')return true; // Enquiry only, never assumes an operating departure.
 if(service==='International (Dakar)')return (origin==='Kanifing'&&destination==='Dakar, Senegal')||
   (origin==='Dakar, Senegal'&&destination==='Banjul');
 if(['Urban','Up-country','North Bank'].includes(service))return true; // Requests only; operations must approve.
 return stops.indexOf(destination)>stops.indexOf(origin);
}
