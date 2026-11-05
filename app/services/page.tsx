import type {Metadata} from 'next';
import {SeoHub} from '../seo-page';
export const metadata:Metadata={title:"Driver Services for Your Own Car",description:'Explore DRIOZ driver booking options, practical trip planning and current availability for your own car.',alternates:{canonical:'https://www.drioz.com/services'}};
export default function Page(){return <SeoHub section="services"/>}
