import type { ControllerDSL, DelegateApprovalRequestPayload, DelegationApproveResult } from '@kerits/kerits';
import { KelIncept, KeriKeyPairs } from '@kerits/kerits';
import type { DelegationApprovalOffer } from '@kerits/kerits-auth';
import { KeritsAuth } from '@kerits/kerits-auth';
import { IndexedDBControllers } from '@kerits/kerits-web';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStoredWalletUrl, WalletUrlField } from '../components/WalletUrlField';

const ISSUER_NAMESPACE = 'kerits-issuer';

/** Detect whether input looks like a BIP39 mnemonic (12+ words) */
function isMnemonic(input: string): boolean {
  return input.trim().split(/\s+/).length >= 12;
}

/** Build the key options for KelIncept — BIP39 mnemonic or simple entropy seed */
async function keyOptions(input: string): Promise<{ mnemonic?: string; entropy?: number }> {
  if (isMnemonic(input)) return { mnemonic: input.trim() };
  const trimmed = input.trim();
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum)) return { entropy: asNum };
  const encoded = new TextEncoder().encode(trimmed);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  const view = new DataView(hash);
  return { entropy: view.getFloat64(0) };
}

// -- Hook: persistent issuer controller ---------------------------------------

function useIssuerController() {
  const [controller, setController] = useState<ControllerDSL | null>(null);
  const [aid, setAid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadExisting() {
      try {
        const { api } = await IndexedDBControllers.create({ namespace: ISSUER_NAMESPACE });
        const ksn = await api.kel.ksn();
        if (ksn && !cancelled) {
          setController(api);
          setAid(ksn.i);
        } else if (!cancelled) {
          await api.close();
        }
      } catch {
        // No existing controller
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadExisting();
    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(async (currentMnemonic: string, nextMnemonic: string) => {
    setError(null);
    try {
      const { api } = await IndexedDBControllers.create({ namespace: ISSUER_NAMESPACE });
      const command = KelIncept.singleKey({
        first: await keyOptions(currentMnemonic),
        next: await keyOptions(nextMnemonic),
        alias: 'issuer',
      });
      const result = await api.inception().apply(command);
      if (result.final.errors.length > 0) {
        throw new Error(`Inception failed: ${result.final.errors[0].message}`);
      }
      const newAid = await api.aid();
      setController(api);
      setAid(newAid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issuer');
    }
  }, []);

  const reset = useCallback(async () => {
    if (controller) {
      try {
        await controller.close();
      } catch {
        /* ignore */
      }
    }
    // Delete all Dexie databases for this namespace
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name?.startsWith(ISSUER_NAMESPACE)) {
        indexedDB.deleteDatabase(db.name);
      }
    }
    setController(null);
    setAid(null);
    setError(null);
  }, [controller]);

  return { controller, aid, loading, error, create, reset };
}

// -- Issuer Setup (first visit) -----------------------------------------------

function IssuerSetup({ onCreated }: { onCreated: (currentMnemonic: string, nextMnemonic: string) => void }) {
  const [currentMnemonic, setCurrentMnemonic] = useState(() => KeriKeyPairs.randomMnemonic());
  const [nextMnemonic, setNextMnemonic] = useState(() => KeriKeyPairs.randomMnemonic());
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreated(currentMnemonic, nextMnemonic);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Issuer Controller Setup</h2>
        <span className="badge badge-warning">Not Created</span>
      </div>

      <div className="field">
        <label>Current Key (BIP39 phrase or simple seed)</label>
        <textarea
          value={currentMnemonic}
          onChange={(e) => setCurrentMnemonic(e.target.value)}
          rows={3}
          spellCheck={false}
        />
        <button type="button" className="link" onClick={() => setCurrentMnemonic(KeriKeyPairs.randomMnemonic())}>
          regenerate
        </button>
      </div>

      <div className="field">
        <label>Next Key (BIP39 phrase or simple seed)</label>
        <textarea value={nextMnemonic} onChange={(e) => setNextMnemonic(e.target.value)} rows={3} spellCheck={false} />
        <button type="button" className="link" onClick={() => setNextMnemonic(KeriKeyPairs.randomMnemonic())}>
          regenerate
        </button>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleCreate}
        disabled={creating || !currentMnemonic.trim() || !nextMnemonic.trim()}
      >
        {creating ? 'Creating...' : 'Create Issuer Controller'}
      </button>
    </div>
  );
}

// -- Issuer Active (controller exists) ----------------------------------------

function IssuerActive({ aid, onDelete }: { aid: string; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(aid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>Issuer Controller</h2>
          <code className="aid">
            {aid.slice(0, 8)}...{aid.slice(-8)}
          </code>
        </div>
        <span className="badge badge-success">Active</span>
      </div>
      <div className="card-body" style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" className="btn btn-sm" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy AID'}
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

// -- Delegation Approval ------------------------------------------------------

type ApprovedDelegation = DelegationApproveResult & { success: true };

function DelegationApproval({
  controller,
  issuerAid,
  walletUrl,
}: {
  controller: ControllerDSL | null;
  issuerAid: string | null;
  walletUrl: string;
}) {
  const [pendingRequests, setPendingRequests] = useState<DelegateApprovalRequestPayload[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [approvedDelegations, setApprovedDelegations] = useState<ApprovedDelegation[]>([]);
  const [offering, setOffering] = useState<string | null>(null);

  const loadPending = useCallback(() => {
    try {
      const raw = sessionStorage.getItem('pendingDipEvents');
      setPendingRequests(raw ? JSON.parse(raw) : []);
    } catch {
      setPendingRequests([]);
    }
  }, []);

  useEffect(() => {
    loadPending();
    window.addEventListener('focus', loadPending);
    return () => window.removeEventListener('focus', loadPending);
  }, [loadPending]);

  const removeFromStorage = (childAid: string) => {
    const remaining = pendingRequests.filter((r) => r.childAid !== childAid);
    sessionStorage.setItem('pendingDipEvents', JSON.stringify(remaining));
    setPendingRequests(remaining);
  };

  const handleApprove = async (request: DelegateApprovalRequestPayload) => {
    if (!controller) return;
    setProcessing(request.childAid);
    setStatusMessage(null);
    try {
      const result = await controller.inception().approveDelegation(request);
      if (result.success) {
        setApprovedDelegations((prev) => [...prev, result]);
        setStatusMessage(`Approved delegation for ${request.childAid.slice(0, 12)}...`);
        removeFromStorage(request.childAid);
      } else {
        setStatusMessage(`Approval failed: ${result.error}`);
      }
    } catch (err) {
      setStatusMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = (request: DelegateApprovalRequestPayload) => {
    removeFromStorage(request.childAid);
    setStatusMessage(`Rejected delegation for ${request.childAid.slice(0, 12)}...`);
  };

  const handleOffer = async (approval: ApprovedDelegation) => {
    if (!issuerAid) return;
    setOffering(approval.childAid);
    setStatusMessage(null);
    try {
      const offer: DelegationApprovalOffer = {
        kind: 'delegationApproval',
        childAid: approval.childAid,
        parentAid: issuerAid,
        eventSaid: approval.eventSaid,
        vrc: approval.vrc as DelegationApprovalOffer['vrc'],
        ixnEvent: approval.ixnEvent,
        parentKelEvents: await controller.kel.events(),
      };
      const wallet = KeritsAuth.wallet.forUrl(walletUrl);
      const result = await wallet.offer(offer, { parentAlias: 'issuer' });
      if (result.ok) {
        setStatusMessage(`Offer accepted by ${result.aid.slice(0, 12)}...`);
        setApprovedDelegations((prev) => prev.filter((d) => d.childAid !== approval.childAid));
      } else {
        setStatusMessage(`Offer rejected: ${result.reason}`);
      }
    } catch (err) {
      setStatusMessage(`Offer error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setOffering(null);
    }
  };

  if (!controller || !issuerAid) {
    return (
      <div className="card disabled">
        <h2>Add Member (Approve Delegations)</h2>
        <p>Create an issuer controller first to approve delegation requests.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Add Member (Approve Delegations)</h2>
        {pendingRequests.length > 0 && <span className="badge badge-warning">{pendingRequests.length} pending</span>}
      </div>

      {statusMessage && <div className="info">{statusMessage}</div>}

      {pendingRequests.length === 0 && approvedDelegations.length === 0 && (
        <p className="empty-state">
          No pending delegation requests. Requests appear here when a wallet tries to authenticate and requests
          membership.
        </p>
      )}

      {pendingRequests.length > 0 && (
        <div className="request-list">
          {pendingRequests.map((request) => (
            <div key={request.childAid} className="request-card">
              <div className="request-info">
                <span className="label">Delegation Request</span>
                <code className="aid">{request.childAid}</code>
                <span className="detail">Requesting delegate status under your AID</span>
              </div>
              <div className="request-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleApprove(request)}
                  disabled={processing === request.childAid}
                >
                  {processing === request.childAid ? 'Approving...' : 'Approve'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleReject(request)}
                  disabled={processing === request.childAid}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {approvedDelegations.length > 0 && (
        <div className="request-list">
          {approvedDelegations.map((approval) => (
            <div key={approval.childAid} className="request-card">
              <div className="request-info">
                <span className="label">Approved</span>
                <code className="aid">{approval.childAid}</code>
                <span className="detail">Ready to offer back to wallet</span>
              </div>
              <div className="request-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOffer(approval)}
                  disabled={offering === approval.childAid}
                >
                  {offering === approval.childAid ? 'Offering...' : 'Offer to Wallet'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -- Main Page ----------------------------------------------------------------

export function Issue() {
  const { controller, aid, loading, error, create, reset } = useIssuerController();
  const [walletUrl, setWalletUrl] = useState(getStoredWalletUrl);

  if (loading) {
    return (
      <div className="page">
        <p>Loading issuer controller...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Issue Credentials</h1>
      <p className="subtitle">
        {aid
          ? 'Manage your issuer identity and approve delegation requests'
          : 'Create an issuer controller to get started'}
      </p>

      {error && <div className="error">{error}</div>}

      <WalletUrlField value={walletUrl} onChange={setWalletUrl} />

      {!aid ? <IssuerSetup onCreated={create} /> : <IssuerActive aid={aid} onDelete={reset} />}

      <DelegationApproval controller={controller} issuerAid={aid} walletUrl={walletUrl} />

      <div style={{ marginTop: '1rem' }}>
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  );
}
