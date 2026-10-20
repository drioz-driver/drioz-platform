import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'DRIOZ | Your car. Your time.',description:'Book a driver for your own car with DRIOZ.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
