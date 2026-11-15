import type {PoolClient} from 'pg';

export type NotificationRecipients = {
 email?:string; whatsappE164?:string;
 emailConsent:boolean; whatsappConsent:boolean;
};
export type ConfirmedPaymentDetails = {
 reservationId:string; paymentId:string; passengerName:string;
 origin:string; destination:string; departureIso:string;
 seatNumber:number; amountBututs:number;
};
/**
 * Prepares email and WhatsApp payment receipts in a private queue.
 * Only a trusted, future payment confirmation handler may call this.
 * This does not send messages, finalize bookings, or issue tickets.
 */
export async function queueVerifiedPaymentReceipts(
 client:PoolClient, d:ConfirmedPaymentDetails, recipients:NotificationRecipients
) {
 if(process.env.MODEMPAY_MODE==='sandbox'||process.env.PAYMENTS_ENABLED!=='true')
  return {queued:0,reason:'live_delivery_disabled'};
 const verified=await client.query(
  "SELECT 1 FROM public.reservations r JOIN public.trips t ON t.id=r.trip_id WHERE r.id=$1 AND r.status='confirmed' AND r.provider_payment_id=$2 AND r.amount_bututs=$3 AND r.seat_number=$4 AND t.origin=$5 AND t.destination=$6 AND t.departure_at=$7::timestamptz LIMIT 1",
  [d.reservationId,d.paymentId,d.amountBututs,d.seatNumber,d.origin,d.destination,d.departureIso]
 );
 if(!verified.rowCount)throw new Error('Unverified payment or reservation');
 const channels:{channel:'email'|'whatsapp';recipient:string}[]=[];
 if(recipients.emailConsent&&recipients.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipients.email)&&recipients.email.length<=254)
  channels.push({channel:'email',recipient:recipients.email.toLowerCase().trim()});
 if(recipients.whatsappConsent&&recipients.whatsappE164&&/^\+[1-9]\d{7,14}$/.test(recipients.whatsappE164))
  channels.push({channel:'whatsapp',recipient:recipients.whatsappE164});
 const message=['GTSC payment confirmation','Reference: '+d.reservationId,
  'Passenger: '+d.passengerName,'Route: '+d.origin+' to '+d.destination,
  'Departure: '+d.departureIso,'Seat: '+d.seatNumber,
  'Paid: D'+(d.amountBututs/100).toFixed(2)].join('\n');
 let queued=0;
 for(const item of channels){
  const result=await client.query(
   "INSERT INTO public.payment_notification_outbox(reservation_id,payment_id,channel,recipient,payload) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(reservation_id,notification_type,channel) DO NOTHING RETURNING id",
   [d.reservationId,d.paymentId,item.channel,item.recipient,JSON.stringify({subject:'GTSC payment confirmation',message,currency:'GMD'})]
  );
  queued+=result.rowCount||0;
 }
 return {queued};
}
