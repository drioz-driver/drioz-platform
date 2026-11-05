import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {seoPages,siteUrl} from '../../../lib/seo-content';
import SeoArticle from '../../seo-page';
const section='guides';
export const dynamicParams=false;
export function generateStaticParams(){return seoPages.filter(p=>p.section===section).map(p=>({slug:p.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const p=seoPages.find(p=>p.section===section&&p.slug===slug);if(!p)return {};return {title:p.title,description:p.description,...(p.indexable===false?{robots:{index:false,follow:true}}:{}),alternates:{canonical:siteUrl+'/'+section+'/'+slug},openGraph:{title:p.title,description:p.description,url:siteUrl+'/'+section+'/'+slug,type:'website'}}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const page=seoPages.find(p=>p.section===section&&p.slug===slug);if(!page)notFound();return <SeoArticle page={page}/>}
