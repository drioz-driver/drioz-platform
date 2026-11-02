/** Retry only database failures which guarantee that the entire transaction rolled back. */
export async function retryTransaction<T>(db:any,work:(transaction:any)=>Promise<T>):Promise<T>{
 for(let attempt=0;;attempt++){
  try{return await (db.transaction?db.transaction(work):work(db))}
  catch(error:any){
   if(attempt>=3||!['40001','40P01'].includes(error?.code))throw error;
   await new Promise(resolve=>setTimeout(resolve,15*2**attempt+Math.random()*20));
  }
 }
}
