// Server-only Modem Pay sandbox checkout. Never use live credentials or live checkout domains.
// Reference: https://docs.modempay.com/documentation/payment-intents/create
const API='https://api.modempay.com/v1/payments';
export class SandboxCheckoutError extends Error {
 constructor(public readonly code:'KEY_MISSING'|'KEY_NOT_TEST'|'PROVIDER_AUTH'|'PROVIDER_REJECTED'|'PROVIDER_TEMPORARY'|'PROVIDER_NETWORK'|'PROVIDER_RESPONSE'){
  super(code);
  this.name='SandboxCheckoutError';
 }
}
export async function createSandboxPaymentIntent(input:{amountBututs:number;reservationId:string;returnUrl:string;cancelUrl:string}){
 if(process.env.MODEMPAY_MODE!=='sandbox'||process.env.PAYMENTS_ENABLED!=='false'||process.env.SANDBOX_CHECKOUT_ENABLED!=='true')throw new Error('Sandbox payments disabled');
 const key=process.env.MODEMPAY_SECRET_KEY;
 if(!key)throw new SandboxCheckoutError('KEY_MISSING');
 if(!key.startsWith('sk_test_'))throw new SandboxCheckoutError('KEY_NOT_TEST');
 if(!Number.isSafeInteger(input.amountBututs)||input.amountBututs<=0)throw new Error('Invalid fare');
 const origin='https://gtsc-bus-booking.vercel.app';
 if(new URL(input.returnUrl).origin!==origin||new URL(input.cancelUrl).origin!==origin)throw new Error('Invalid return origin');
 let res:Response;
 try{res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({data:{amount:input.amountBututs/100,currency:'GMD',from_sdk:false,metadata:{reservation_id:input.reservationId},return_url:input.returnUrl,cancel_url:input.cancelUrl}}),cache:'no-store',signal:AbortSignal.timeout(10000)});}catch{throw new SandboxCheckoutError('PROVIDER_NETWORK');}
 if(res.status===401||res.status===403)throw new SandboxCheckoutError('PROVIDER_AUTH');
 if(res.status>=500||res.status===429)throw new SandboxCheckoutError('PROVIDER_TEMPORARY');
 if(!res.ok)throw new SandboxCheckoutError('PROVIDER_REJECTED');
 const response=await res.json().catch(()=>null);
 if(!response||response.status===false)throw new SandboxCheckoutError('PROVIDER_RESPONSE');
 const paymentLink=response?.data?.payment_link;
 if(typeof paymentLink!=='string')throw new SandboxCheckoutError('PROVIDER_RESPONSE');
 const url=new URL(paymentLink);
 if(url.protocol!=='https:'||url.hostname!=='test.checkout.modempay.com')throw new SandboxCheckoutError('PROVIDER_RESPONSE');
 const expiresAt=response?.data?.expires_at;
 return {paymentLink,expiresAt:typeof expiresAt==='string'&&!Number.isNaN(Date.parse(expiresAt))?expiresAt:null};
}
