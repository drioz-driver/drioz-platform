import type {Metadata} from 'next';
import AuthScreen from '../../auth-screen';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Apply to drive'};
export default function PartnerSignup(){return <AuthScreen mode="signup" portal="partner"/>}
