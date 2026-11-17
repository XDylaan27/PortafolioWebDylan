import type { Metadata } from 'next';
import CuentaClara from '@/components/cuenta-clara/CuentaClara';

export const metadata: Metadata = {
  title: 'Cuenta Clara',
  robots: { index: false, follow: false, nocache: true },
};

export default function CuentaClaraPage() {
  return <CuentaClara />;
}
