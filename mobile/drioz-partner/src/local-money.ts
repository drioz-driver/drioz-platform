export type LocalPricing={currency:string;inrPerUnit:number;rateDate:string;chartId:string;label:string;version:string};
export function localPricing(value:any):LocalPricing|undefined{
 try{const v=typeof value==='string'?JSON.parse(value):value;const p=v?.localPricing||v?.breakdown?.localPricing;if(p&&/^[A-Z]{3}$/.test(p.currency)&&Number.isFinite(p.inrPerUnit)&&p.inrPerUnit>0)return p}catch{}
 return undefined;
}
/** Ledger amounts remain INR paise; a booking's frozen rate determines its local cash fare. */
export function localMoney(amount:number,context?:any){
 const p=localPricing(context);
 return new Intl.NumberFormat('en',{style:'currency',currency:p?.currency||'INR',...(p?{}:{maximumFractionDigits:0})}).format((Number(amount)||0)/100/(p?.inrPerUnit||1));
}
