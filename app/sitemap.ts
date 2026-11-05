import type {MetadataRoute} from 'next';
import {seoPages,siteUrl} from '../lib/seo-content';
export default function sitemap():MetadataRoute.Sitemap{return ['','/drivers','/services','/guides','/about','/contact',...seoPages.filter(p=>p.indexable!==false).map(p=>'/'+p.section+'/'+p.slug)].map(path=>({url:siteUrl+(path||'/')}))}
