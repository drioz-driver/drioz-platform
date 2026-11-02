import type {Metadata,Viewport} from 'next';
import './globals.css';
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
 return <html lang="en"><head>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap"/>
 </head><body>{children}</body></html>;
}
