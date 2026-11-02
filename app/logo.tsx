/** Match themed surfaces by default; use an explicit tone on fixed-color surfaces. */
export default function Logo({className='',tone='auto'}:{className?:string;tone?:'auto'|'light'|'dark'}){
 return <img className={'brand-logo '+className} data-logo-tone={tone} src={tone==='light'?'/drioz-logo-light.png':'/drioz-logo.png'} width={1100} height={378} alt="DRIOZ — Your personal driver, anytime" decoding="async"/>;
}
