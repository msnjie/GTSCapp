import {Pool} from 'pg';

// Server only. Keep the password and optional CA PEM in Vercel environment variables.
// Parse the URL into individual fields: node-postgres may otherwise let ?sslmode=
// override the supplied TLS options (including the CA trust anchor).
const raw=process.env.DATABASE_URL;
const url=raw?new URL(raw):undefined;
const globalForDb=globalThis as unknown as {gtscDbPool?:Pool};
export const pool=globalForDb.gtscDbPool ?? new Pool({
 host:url?.hostname,
 port:url?.port?Number(url.port):5432,
 database:url?.pathname?.slice(1)||'postgres',
 user:url?decodeURIComponent(url.username):undefined,
 password:url?decodeURIComponent(url.password):undefined,
 ssl:{
   rejectUnauthorized:true,
   ...(process.env.SUPABASE_DB_CA_PEM?{ca:process.env.SUPABASE_DB_CA_PEM.replace(/\\n/g,'\n')}:{})
 },
 max:5,
 connectionTimeoutMillis:8000,
 idleTimeoutMillis:10000,
});
if(process.env.NODE_ENV!=='production')globalForDb.gtscDbPool=pool;
