import {NextResponse} from 'next/server';
export async function GET(){return NextResponse.json({service:'GTSC booking',status:'starter',paymentsEnabled:false,bookingsEnabled:process.env.BOOKINGS_ENABLED==='true'});}
