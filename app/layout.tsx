import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'DRIOZ — Your car. Your time.',description:'Private driver-booking pilot for customers, partners and operations.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
