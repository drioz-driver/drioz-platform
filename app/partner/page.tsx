import type {Metadata} from 'next';
import Platform from '../platform';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'DRIOZ Partner',description:'Drive with DRIOZ — go online, accept ride offers and track your earnings.'};
export default function PartnerPortal(){return <Platform portal="partner"/>}
