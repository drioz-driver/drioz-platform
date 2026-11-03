import { runtime as getRuntime } from '@/lib/runtime';
import {authContext,type AuthRuntime} from '@/lib/auth/server';
import {safeReturnTo} from '@/lib/auth/identity';
export const dynamic='force-dynamic';
export async function GET(request:Request){const env=getRuntime();const url=new URL(request.url),auth=authContext(request,env as unknown as AuthRuntime),code=url.searchParams.get('code');const back=()=>auth.apply(Response.redirect(new URL('/login?error=callback',url.origin),303));if(!code||!auth.client)return back();try{const {error}=await auth.client.auth.exchangeCodeForSession(code);if(error)return back();auth.choose('external');return auth.apply(Response.redirect(new URL(safeReturnTo(url.searchParams.get('next')),url.origin),303))}catch{return back()}}
