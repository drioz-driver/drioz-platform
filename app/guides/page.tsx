import type {Metadata} from 'next';
import {SeoHub} from '../seo-page';
export const metadata:Metadata={title:"Personal Driver Booking Guides",description:'Explore DRIOZ driver booking options, practical trip planning and current availability for your own car.',alternates:{canonical:'https://www.drioz.com/guides'}};
export default function Page(){return <SeoHub section="guides"/>}
