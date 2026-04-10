import { config } from '../config';

const STORAGE_KEY = 'kerits-wallet-url';

export function getStoredWalletUrl(): string {
  return sessionStorage.getItem(STORAGE_KEY) || config.walletUrl;
}

export function setStoredWalletUrl(url: string): void {
  sessionStorage.setItem(STORAGE_KEY, url);
}

export function WalletUrlField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const handleChange = (url: string) => {
    setStoredWalletUrl(url);
    onChange(url);
  };

  return (
    <div className="field">
      <label>
        Wallet URL{' '}
        <span className="info-tip" title="The user chooses where their digital identity wallet is hosted.">
          (i)
        </span>
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="http://localhost:5173"
          style={{ flex: 1 }}
        />
        <button type="button" onClick={() => handleChange('https://kerits.id/auth')}>
          default
        </button>
        <button type="button" onClick={() => handleChange('http://localhost:5173/auth')}>
          local
        </button>
      </div>
    </div>
  );
}
