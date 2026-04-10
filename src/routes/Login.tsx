import { Controllers } from '@kerits/kerits';
import {
  type AuthRequest,
  createAuthRequest,
  KeritsAuth,
  PopupBlockedError,
  type ProofSuccess,
  type VerifyResult,
  WalletCancelledError,
  WalletClosedError,
  WalletNoAccountError,
  WalletProtocolError,
  WalletTimeoutError,
} from '@kerits/kerits-auth';
import { useState } from 'react';
import { CodePreview } from '../components/CodePreview';
import { ProofChecksPanel } from '../components/ProofChecksPanel';
import { type DisplayState, ProofResultDisplay } from '../components/ProofResultDisplay';
import { entriesToRequirements, RequirementBuilder, type RequirementEntry } from '../components/RequirementBuilder';
import { getStoredWalletUrl, WalletUrlField } from '../components/WalletUrlField';
import { config } from '../config';

const initialEntries: RequirementEntry[] = [
  { id: 1, kind: 'delegateOf', aid: 'EexampleParentAid', schema: '', issuers: '' },
];

async function runVerification(request: AuthRequest, proof: ProofSuccess): Promise<VerifyResult> {
  const db = Controllers.Databases.inMemory();
  const controller = await db.controller();
  const verifier = KeritsAuth.verifier.fromController(controller);
  try {
    return await verifier.verify(request, proof, { audience: config.audience });
  } finally {
    await controller.close();
  }
}

export function Login() {
  const [entries, setEntries] = useState<RequirementEntry[]>(initialEntries);
  const [walletUrl, setWalletUrl] = useState(getStoredWalletUrl);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DisplayState>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  async function handleLogin() {
    setLoading(true);
    setResult(null);
    setVerifyResult(null);

    try {
      const requirements = entriesToRequirements(entries);
      const request = createAuthRequest({
        audience: config.audience,
        requirements,
        expiresInSeconds: 300,
      });

      const wallet = KeritsAuth.wallet.forUrl(walletUrl);
      const proof = await wallet.requestProof(request);

      if (proof.ok) {
        setResult({ type: 'success', result: proof });
        try {
          const vr = await runVerification(request, proof);
          setVerifyResult(vr);
        } catch {
          // Verification failed — still show the proof
        }
      } else {
        // Capture any delegation requests from failed delegateOf attempts
        // sessionStorage is tab-scoped — works because /login and /issue are
        // routes in the same SPA navigated via React Router.
        const dipEvents = proof.results.filter((r: any) => r.dipEvent).map((r: any) => r.dipEvent);

        if (dipEvents.length > 0) {
          const existing = JSON.parse(sessionStorage.getItem('pendingDipEvents') || '[]');
          const merged = [...existing];
          for (const de of dipEvents) {
            const idx = merged.findIndex((e: any) => e.childAid === de.childAid);
            if (idx >= 0) {
              merged[idx] = de;
            } else {
              merged.push(de);
            }
          }
          sessionStorage.setItem('pendingDipEvents', JSON.stringify(merged));
          setResult({
            type: 'membership-requested',
            dipEvents,
          });
        } else {
          setResult({ type: 'failure', result: proof, requirements: request.requirements });
        }
      }
    } catch (err) {
      if (err instanceof PopupBlockedError) {
        setResult({
          type: 'error',
          name: 'Popup Blocked',
          message: `Please allow popups for this site to open the wallet at ${walletUrl}`,
        });
      } else if (err instanceof WalletNoAccountError) {
        setResult({
          type: 'error',
          name: 'No Account',
          message: "You don't have a self-owned identity yet. Open the Kerits wallet to create one, then try again.",
        });
      } else if (err instanceof WalletCancelledError) {
        setResult({ type: 'error', name: 'Cancelled', message: 'Authentication was cancelled.' });
      } else if (err instanceof WalletClosedError) {
        setResult({ type: 'error', name: 'Wallet Closed', message: 'The wallet window was closed before completing.' });
      } else if (err instanceof WalletTimeoutError) {
        setResult({ type: 'error', name: 'Timeout', message: 'The wallet did not respond in time.' });
      } else if (err instanceof WalletProtocolError) {
        setResult({ type: 'error', name: 'Protocol Error', message: (err as Error).message });
      } else {
        setResult({ type: 'error', name: 'Unexpected Error', message: (err as Error).message });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Kerits Auth Example</h1>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        This is an example of a site which uses a user's identity wallet to authenticate (provide proofs).
      </p>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        We can configure proof requirements (currently proves a 'membership' relationship or that the user has specific
        credentials.
      </p>
      <WalletUrlField value={walletUrl} onChange={setWalletUrl} />

      <ul style={{ margin: '0.5rem 0 1rem 1.25rem', color: '#888', fontSize: '0.8rem', lineHeight: 1.6 }}>
        <li>If the user has a digital identity mobile app, the wallet URL will open their wallet app</li>
        <li>If the user has the desktop agent installed, it will open their desktop agent</li>
        <li>QR code login for authorizing on other devices is coming soon</li>
      </ul>

      <div className="flip-container">
        <div className={`flip-card${flipped ? ' flipped' : ''}`}>
          <div className="flip-front">
            <RequirementBuilder entries={entries} onChange={setEntries}>
              <button type="button" className="flip-toggle" onClick={() => setFlipped(true)}>
                {'</>'}
              </button>
            </RequirementBuilder>
          </div>
          <div className="flip-back">
            <CodePreview entries={entries} walletUrl={walletUrl}>
              <button type="button" className="flip-toggle" onClick={() => setFlipped(false)}>
                requirements
              </button>
            </CodePreview>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button type="button" className="primary" onClick={handleLogin} disabled={loading || entries.length === 0}>
          {loading ? 'Waiting for wallet...' : 'Log in with Kerits'}
        </button>
      </div>

      <ProofResultDisplay state={result} onReset={() => setResult(null)} />

      {verifyResult && (
        <div style={{ marginTop: '1rem' }}>
          <ProofChecksPanel result={verifyResult} />
        </div>
      )}
    </div>
  );
}
