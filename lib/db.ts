import {Pool} from 'pg';
const globalForDb=globalThis as unknown as {pool?:Pool};
export const pool=globalForDb.pool ?? new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?.includes('localhost')?false:{rejectUnauthorized:true},max:5});
if(process.env.NODE_ENV!=='production')globalForDb.pool=pool;
