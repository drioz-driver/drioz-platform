import type {ReactNode} from 'react';
import Logo from '../logo';
/** Shared header/footer for public pages (privacy, terms). Server component — no client JS. */
export default function PublicShell({children}:{children:ReactNode}){
 return <div className="public">
  <header className="public-head"><a href="/" aria-label="DRIOZ home"><Logo tone="dark"/></a><nav><a href="/">Book a driver</a><a href="/partner/login">Drive with DRIOZ</a><a className="primary" href="/login">Sign in</a></nav></header>
  {children}
  <footer className="public-foot"><span>© {new Date().getFullYear()} DRIOZ</span><span className="legal-links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:info@drioz.com">info@drioz.com</a></span></footer>
 </div>;
}
