import { requireMerchant } from '@/lib/auth/session';
import { ProgramForm } from './ProgramForm';

export const metadata = { title: 'Neue Stempelkarte – E-Loyalty' };

export default async function NewProgram() {
  await requireMerchant();
  return <ProgramForm />;
}
