import type {Metadata} from 'next';
import PublicShell from '../_public/public-shell';
export const metadata:Metadata={title:'Privacy policy',description:'How DRIOZ collects, uses and protects personal data.'};
// Template wording — have it reviewed by your legal adviser before launch (DPDP Act 2023).
export default function Privacy(){
 return <PublicShell><article className="legal">
  <h1>Privacy policy</h1><p className="updated">Last updated 30 October 2026</p>
  <p>DRIOZ connects customers who need a driver for their own car with verified driving partners. This policy explains what personal data we process, why, and the choices you have under the Digital Personal Data Protection Act, 2023.</p>
  <h2>What we collect</h2>
  <ul><li><strong>Account details</strong> — name, email address, mobile number and sign-in method (email, mobile OTP or Google).</li><li><strong>Trip details</strong> — pickup and drop addresses, schedule, fares, payments, ratings, car-check records and photos, and support conversations.</li><li><strong>Partner details</strong> — driving licence, identity and assessment documents, date of birth for licence verification, bank account for payouts, and device location while online or on a trip.</li><li><strong>Device data</strong> — push-notification tokens and basic technical logs needed to keep the service secure.</li></ul>
  <h2>How we use it</h2>
  <ul><li>To quote, book, dispatch and complete trips, and to show live trip status to you and anyone you share a link with.</li><li>To verify partners, including automated licence checks with the issuing authority’s records.</li><li>To take payments, issue invoices and pay partners.</li><li>To keep people safe — SOS alerts, car-check records and fraud prevention.</li><li>To send trip updates by push notification, SMS or WhatsApp.</li></ul>
  <h2>Location</h2><p>Partners share location only after opting in, while online or on an active trip. Customers see the assigned partner’s position only during their own trip. Positions older than two minutes are hidden.</p>
  <h2>Sharing</h2><p>We share data only with the other party to your trip, with service providers who process it for us (hosting, database, payments, messaging, licence verification) under contract, and where the law requires. We do not sell personal data.</p>
  <h2>Retention and deletion</h2><p>You can delete your account from Account → Delete account. We remove your name, email and phone, and keep trip, payment and tax records in anonymised form for as long as the law requires.</p>
  <h2>Your rights</h2><p>You can access, correct or erase your data and withdraw consent by writing to <a href="mailto:info@drioz.com">info@drioz.com</a>. We reply within 30 days.</p>
 </article></PublicShell>;
}
