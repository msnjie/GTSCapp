import {NextResponse} from 'next/server';
export async function POST(){return NextResponse.json({error:'Webhook disabled. Provider signature verification and replay protection must be tested before accepting events.'},{status:503});}
