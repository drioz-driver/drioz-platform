import {runtime} from '@/lib/runtime';
import {operations,ApiError} from '@/lib/operations';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;if(action!=='cities')return Response.json({message:'Not found'},{status:404});
 const db=runtime().DB;if(!db)return Response.json({message:'Booking is temporarily unavailable'},{status:503});
 try{const {results}=await db.prepare('SELECT id,name,base FROM cities ORDER BY name').all();return Response.json({cities:results},{headers:{'Cache-Control':'public,max-age=60,s-maxage=60'}})}catch{return Response.json({message:'Booking is temporarily unavailable'},{status:503})}
}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;if(!['coverage','estimate'].includes(action))return Response.json({message:'Not found'},{status:404});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({message:'Request origin mismatch'},{status:403});
 const env=runtime();if(!env.DB)return Response.json({message:'Booking is temporarily unavailable'},{status:503});
 try{const text=await request.text();if(text.length>20000)throw new ApiError(413,'Request too large');let body;try{body=JSON.parse(text)}catch{throw new ApiError(400,'Invalid trip details')}
 const ip=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'unknown';
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip.split(',')[0].trim()))).toString('hex');
 const guest={id:'estimate:'+hash,email:'',name:'Guest',role:'customer',disabled:0};
 const ops=operations(env.DB,null,'');await ops.limit(guest);return Response.json(await ops.handle(guest,action,'POST',body),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({message:e instanceof ApiError?e.message:'Unable to calculate this trip. Please retry.'},{status:e instanceof ApiError?e.status:503})}
}
