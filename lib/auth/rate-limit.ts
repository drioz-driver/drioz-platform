export async function throttle(db:any,request:Request,action:string,identifier:string=''){
 const ip=(process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim():request.headers.get('cf-connecting-ip'))||'unknown-client';const minute=Math.floor(Date.now()/60000),fifteen=Math.floor(Date.now()/900000);
 const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const consume=async(key:string,max:number,expiry:number)=>{const row=await db.prepare('INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1 WHERE rate_limits.hits<? RETURNING hits').bind(key,expiry,max).first();if(!row)throw new Error('Too many attempts. Please wait before trying again.')};
 await consume('auth:ip:'+await digest(ip)+':'+minute,30,Date.now()+120000);
 if(identifier){const key=await digest(identifier.toLowerCase());await consume('auth:'+action+':'+key+':'+fifteen,action==='phone-send'?3:action==='phone-verify'?5:10,Date.now()+960000)}
 // Expired rows are swept by a scheduled job; an occasional inline sweep covers databases without one.
 if(Math.random()<0.01)await db.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now()).run();
}
