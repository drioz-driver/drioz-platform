import type {Metadata,Viewport} from 'next';
import './globals.css';
import localFont from 'next/font/local';
const inter=localFont({src:'./fonts/inter-latin.woff2',weight:'400 800',display:'optional',variable:'--font-inter'});
const display=localFont({src:[{path:'./fonts/instrument-serif-normal.woff2',weight:'400',style:'normal'},{path:'./fonts/instrument-serif-italic.woff2',weight:'400',style:'italic'}],display:'optional',variable:'--font-instrument'});
export const metadata:Metadata={
 title:{default:'DRIOZ — Your personal driver, anytime',template:'%s · DRIOZ'},
 description:'Book a vetted personal driver for your own car — one way, round trip or outstation. Transparent fares, verified partners and live trip status.',
 metadataBase:new URL('https://www.drioz.com'),
 verification:{google:'FoDBik6jePUWAUkMS5VgmKa0BqKj9rtsMqnLYPvyPnw'},
 robots:{index:process.env.VERCEL_ENV!=='preview',follow:true},
 manifest:'/manifest.webmanifest',
 icons:{icon:[{url:'/favicon.ico',sizes:'any'},{url:'/favicon.svg',type:'image/svg+xml'},{url:'/icon-192.png',type:'image/png',sizes:'192x192'},{url:'/favicon.png',type:'image/png',sizes:'64x64'}],shortcut:'/favicon.ico',apple:{url:'/apple-touch-icon.png',sizes:'180x180'}},
 applicationName:'DRIOZ',
 openGraph:{title:'DRIOZ — Your personal driver, anytime',description:'A vetted driver for your own car. One way, round trip or outstation.',images:['/hero.jpg'],type:'website'},
};
export const viewport:Viewport={themeColor:[{media:'(prefers-color-scheme: light)',color:'#07110e'},{media:'(prefers-color-scheme: dark)',color:'#07110e'}],width:'device-width',initialScale:1,viewportFit:'cover'};
export default function Layout({children}:{children:React.ReactNode}){
 return <html lang="en" className={inter.variable+' '+display.variable}><head>

 </head><body>{children}</body></html>;
}
