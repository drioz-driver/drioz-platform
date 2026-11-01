import {cookies} from 'next/headers';
import {DiscoveryLinks} from './seo-page';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Book Driver Online for Your Own Car | DRIOZ',description:'Request a DRIOZ personal driver for one-way, round-trip or outstation travel in your own car. Review your estimate and check availability.',alternates:{canonical:'https://www.drioz.com/'}};
import Platform from './platform';
import GuestBooking from './guest-booking';
export const dynamic='force-dynamic';
export default async function Home(){const jar=await cookies();return jar.getAll().some(c=>c.name.startsWith('__Host-drioz-auth'))?<Platform/>:<><GuestBooking/><DiscoveryLinks/></>}
