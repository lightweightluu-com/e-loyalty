import { Suspense } from 'react';
import { AuthForm } from './AuthForm';

export const metadata = { title: 'Anmelden – E-Loyalty' };

export default function LoginPage() {
  return <Suspense><AuthForm /></Suspense>;
}
