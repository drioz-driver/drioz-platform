import { runtime as getRuntime } from '@/lib/runtime';
import {authContext,type AuthRuntime} from '@/lib/auth/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){const env=getRuntime();
 const auth=authContext(request,env as unknown as AuthRuntime);
 const key=(env as unknown as {GOOGLE_MAPS_BROWSER_KEY?:string}).GOOGLE_MAPS_BROWSER_KEY;
 return auth.apply(key?Response.json({key}):Response.json({message:'Address search is unavailable'},{status:503}));
}
