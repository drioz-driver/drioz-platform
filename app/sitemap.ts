import type {MetadataRoute} from 'next';
import {seoPages,siteUrl} from '../lib/seo-content';
export default function sitemap():MetadataRoute.Sitemap{return ['','/drivers','/services','/guides',...seoPages.map(p=>'/'+p.section+'/'+p.slug)].map(path=>({url:siteUrl+(path||'/')}))}
