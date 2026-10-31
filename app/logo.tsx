/** DRIOZ wordmark. `tone="light"` swaps the graphite details for use on dark surfaces. */
export default function Logo({className='',tone='light'}:{className?:string;tone?:'light'|'dark'}){
 return <img className={'brand-logo '+className} src={tone==='light'?'/drioz-logo-light.png':'/drioz-logo.png'} width={1100} height={378} alt="DRIOZ — Your personal driver, anytime" decoding="async"/>;
}
