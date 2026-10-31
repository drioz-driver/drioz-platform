import type {Metadata} from 'next';
import AuthScreen from '../../auth-screen';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Partner sign in'};
export default function PartnerLogin(){return <AuthScreen mode="login" portal="partner"/>}
