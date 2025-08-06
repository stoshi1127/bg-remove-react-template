'use client';

import dynamic from 'next/dynamic';
import { generateStructuredData } from './structured-data';

const EasyToneApp = dynamic(() => import('../components/EasyToneApp'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function Home() {
  return (
    <>
      {generateStructuredData()}
      <EasyToneApp />
    </>
  );
}
