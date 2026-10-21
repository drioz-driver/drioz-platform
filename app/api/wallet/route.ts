import {paymentRoute} from '@/lib/payment-route';
export const dynamic='force-dynamic';
export function GET(request:Request){return paymentRoute(request,'wallet')}
