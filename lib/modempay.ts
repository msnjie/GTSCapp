// Server-only Modem Pay sandbox adapter (not yet wired into public checkout).
// Reference: https://docs.modempay.com/documentation/payment-intents/create
const API='https://api.modempay.com/v1/payments';
export async function createSandboxPaymentIntent(input:{amountBututs:number;reservationId:string;returnUrl:string;cancelUrl:string}){
 if(process.env.MODEMPAY_MODE!=='sandbox'||process.env.PAYMENTS_ENABLED!=='true')throw new Error('Sandbox payments disabled');
 const key=process.env.MODEMPAY_SECRET_KEY;
 if(!key||!key.startsWith('sk_test_'))throw new Error('Sandbox secret key not configured');
 if(!Number.isSafeInteger(input.amountBututs)||input.amountBututs<=0)throw new Error('Invalid fare');
 const origin=process.env.APP_ORIGIN;
 if(!origin||new URL(input.returnUrl).origin!==origin||new URL(input.cancelUrl).origin!==origin)throw new Error('Invalid return origin');
 const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({data:{amount:input.amountBututs/100,currency:'GMD',from_sdk:false,metadata:{reservation_id:input.reservationId},return_url:input.returnUrl,cancel_url:input.cancelUrl}}),cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw new Error('Payment provider request failed');
 const response=await res.json();
 const paymentLink=response?.data?.payment_link;
 if(typeof paymentLink!=='string')throw new Error('Missing payment link');
 const url=new URL(paymentLink);
 if(url.protocol!=='https:'||url.hostname!=='test.checkout.modempay.com')throw new Error('Unexpected payment checkout domain');
 return {paymentLink};
}
