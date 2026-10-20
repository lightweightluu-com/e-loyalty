import { JoinClient } from './JoinClient';

export const metadata = { title: 'Stempelkarte holen', robots: { index: false } };

export default async function JoinPage({ params }: { params: Promise<{ programId: string }> }) {
  return <JoinClient programId={(await params).programId} />;
}
