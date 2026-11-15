import {redirect} from 'next/navigation';
import {adminAuthorized} from '../../lib/admin-auth';
import AdminDashboard from './admin-dashboard';
export const dynamic='force-dynamic';
export const metadata={title:'GTSC Admin | Internal dashboard',robots:{index:false,follow:false}};
export default async function AdminPage(){
 if(!await adminAuthorized())return <AdminDashboard initiallyAuthenticated={false}/>;
 return <AdminDashboard initiallyAuthenticated={true}/>;
}
