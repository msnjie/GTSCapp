import {NextResponse} from 'next/server';
import {clearSession,originAllowed} from '../../../../lib/admin-auth';
export async function POST(req:Request){
 if(!originAllowed(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 await clearSession();
 return NextResponse.json({authenticated:false},{headers:{'Cache-Control':'no-store'}});
}