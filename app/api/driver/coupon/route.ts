import {paymentRoute} from '@/lib/payment-route';
export const dynamic='force-dynamic';
export function POST(request:Request){return paymentRoute(request,'driver/coupon')}
