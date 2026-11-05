import type {Metadata} from 'next';
import PublicShell from '../_public/public-shell';
export const metadata:Metadata={title:'Terms of service',description:'The terms for booking and driving with DRIOZ.'};
// Template wording — have it reviewed by your legal adviser before launch.
export default function Terms(){
 return <PublicShell><article className="legal">
  <h1>Terms of service</h1><p className="updated">Last updated 30 October 2026</p>
  <p>These terms apply when you book a driver through DRIOZ or drive as a DRIOZ partner.</p>
  <h2>The service</h2><p>DRIOZ provides a verified driver to drive the customer’s own vehicle. The customer remains responsible for the vehicle’s registration, insurance, fitness and pollution certificates, and for any documents the law requires to be carried.</p>
  <h2>Fares</h2><ul><li>The fare shown before booking is the agreed fare for the selected package. Busy-time charges are shown as a separate line before you book.</li><li>Time beyond the package is charged at the city’s hourly rate plus tax. Tolls and parking paid by the partner are reimbursed at cost.</li></ul>
  <h2>Cancellations</h2><p>Cancelling is free until 5 minutes after a partner is assigned. After that, or once the partner has arrived, the city’s cancellation fee applies and part of it is paid to the partner.</p>
  <h2>Car checks</h2><p>Partners record a before-trip and an after-trip check of the car, with photos, together with the customer. These records are used to resolve any damage dispute.</p>
  <h2>Partners</h2><ul><li>Partners must hold a valid driving licence and complete identity and driving-assessment checks before their first trip.</li><li>Ride offers are exclusive to one partner for 10 seconds. A platform fee is deducted from the partner wallet for each completed ride.</li></ul>
  <h2>Safety</h2><p>Use SOS in the app to alert the DRIOZ safety team. In an emergency, call 112 first.</p>
  <h2>Contact</h2><p>Questions about these terms: <a href="mailto:info@drioz.com">info@drioz.com</a>.</p>
 </article></PublicShell>;
}
