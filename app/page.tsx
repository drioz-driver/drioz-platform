import {cookies} from 'next/headers';
import Platform from './platform';
import GuestBooking from './guest-booking';
export const dynamic='force-dynamic';
export default async function Home(){const jar=await cookies();return jar.getAll().some(c=>c.name.startsWith('__Host-drioz-auth'))?<Platform/>:<GuestBooking/>}
