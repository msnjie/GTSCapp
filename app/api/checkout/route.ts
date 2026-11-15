import {NextResponse} from 'next/server';
export async function POST(){return NextResponse.json({error:'Modem Pay checkout is disabled until the official sandbox API contract, webhooks and merchant account are configured securely.'},{status:503});}
