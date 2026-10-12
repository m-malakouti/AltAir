import { useState } from 'react';
import { BrandHeader } from '@/components/BrandHeader';
import { openSidePanel } from '@/lib/browser/side-panel';

export default function App() {
  const [error, setError] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  async function handleOpenSidePanel() {
    setError('');
    setIsOpening(true);
    try {
      await openSidePanel();
      window.close();
    } catch {
      setError('پنل باز نشد. مرورگر را به‌روز کنید و دوباره تلاش کنید.');
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <main className="workspace">
      <BrandHeader />
      <h2>فضای شخصی شما</h2>
      <p className="intro">به آلت ایر خوش آمدید. برای ورود به فضای کار، پنل کناری را باز کنید.</p>
      <button className="primary-button" onClick={handleOpenSidePanel} disabled={isOpening}>
        {isOpening ? 'در حال باز کردن…' : 'باز کردن پنل کناری'}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
    </main>
  );
}
