import {cookies} from 'next/headers';
import {DiscoveryLinks} from './seo-page';
import type {Metadata} from 'next';
export const metadata:Metadata={title:{absolute:'Book Driver Online for Your Own Car | DRIOZ'},description:'Request a DRIOZ personal driver for one-way, round-trip or outstation travel in your own car. Review your estimate and check availability.',alternates:{canonical:'https://www.drioz.com/'}};
import Platform from './platform';
import GuestBooking from './guest-booking';
export const dynamic='force-dynamic';
const siteIdentity={"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://www.drioz.com/#website","url":"https://www.drioz.com/","name":"DRIOZ","alternateName":"DRIOZ Personal Drivers","publisher":{"@id":"https://www.drioz.com/#organization"}},{"@type":"Organization","@id":"https://www.drioz.com/#organization","name":"DRIOZ","url":"https://www.drioz.com/","logo":"https://www.drioz.com/drioz-logo.png","email":"info@drioz.com"}]};
export default async function Home(){const jar=await cookies();return jar.getAll().some(c=>c.name.startsWith('__Host-drioz-auth'))?<Platform/>:<><GuestBooking/><DiscoveryLinks/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(siteIdentity).replace(/</g,'\\u003c')}}/></>}
