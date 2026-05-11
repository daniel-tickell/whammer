'use client';

import dynamic from 'next/dynamic';
import './tokengen.css';

const TokenGenApp = dynamic(() => import('./TokenGenApp'), { ssr: false });

export default function TokenGenPage() {
  return <TokenGenApp />;
}
