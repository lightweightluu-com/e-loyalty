import { requireMerchant } from '@/lib/auth/session';
import { Kiosk } from './Kiosk';

export const metadata = { title: 'Scanner – E-Loyalty' };

export default async function ScanPage() {
  await requireMerchant();
  return <Kiosk />;
}
