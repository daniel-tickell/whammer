import dynamic from 'next/dynamic';
import './traygen.css';

const TrayGenApp = dynamic(() => import('./TrayGenApp'), { ssr: false });

export default function TrayGenPage() {
  return <TrayGenApp />;
}
