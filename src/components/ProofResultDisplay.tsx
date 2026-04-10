import type { DelegateApprovalRequestPayload } from '@kerits/kerits';
import type { ProofAttempt, ProofResult, Requirement, SignedPresentation } from '@kerits/kerits-auth';
import { useState } from 'react';
import { Link } from 'react-router-dom';

type DisplayState =
  | { type: 'success'; result: ProofResult & { ok: true } }
  | { type: 'failure'; result: ProofResult & { ok: false }; requirements?: Requirement[] }
  | { type: 'membership-requested'; dipEvents: DelegateApprovalRequestPayload[] }
  | { type: 'error'; name: string; message: string }
  | null;

interface Props {
  state: DisplayState;
  onReset: () => void;
}

export type { DisplayState };

export function ProofResultDisplay({ state, onReset }: Props) {
  if (!state) return null;

  return (
    <div className={`result ${state.type}`}>
      {state.type === 'success' && <SuccessView presentation={state.result.presentation} />}
      {state.type === 'failure' && <FailureView attempts={state.result.results} requirements={state.requirements} />}
      {state.type === 'membership-requested' && <MembershipRequestedView dipEvents={state.dipEvents} />}
      {state.type === 'error' && <ErrorView name={state.name} message={state.message} />}
      <div style={{ marginTop: '1rem' }}>
        <button type="button" onClick={onReset}>
          Try again
        </button>
      </div>
    </div>
  );
}

function SuccessView({ presentation }: { presentation: SignedPresentation }) {
  return (
    <>
      <h2>Proof Verified</h2>
      <p>
        <strong>Presenter:</strong> {presentation.presenterAid}
      </p>
      <p>
        <strong>Request SAID:</strong> {presentation.requestSaid}
      </p>
      <p>
        <strong>Responded at:</strong> {presentation.respondedAt}
      </p>
      <p>
        <strong>Entries:</strong> {presentation.entries.length}
      </p>
      <details>
        <summary>Full presentation</summary>
        <pre>{JSON.stringify(presentation, null, 2)}</pre>
      </details>
    </>
  );
}

function requirementLabel(req: Requirement): string {
  if (req.kind === 'delegateOf') return 'Account Membership / Relationship';
  if (req.kind === 'hasCredential') return 'Credential';
  return req.kind;
}

function requirementDetail(req: Requirement): string {
  if (req.kind === 'delegateOf') {
    const truncated = req.aid.length > 16 ? `${req.aid.slice(0, 16)}...` : req.aid;
    return `The account ${truncated} needs to onboard you as a delegated member`;
  }
  if (req.kind === 'hasCredential') {
    const truncatedSchema = req.schema.length > 16 ? `${req.schema.slice(0, 16)}...` : req.schema;
    return `You need a credential matching schema ${truncatedSchema} from an approved issuer`;
  }
  return '';
}

function FailureView({ attempts, requirements }: { attempts: ProofAttempt[]; requirements?: Requirement[] }) {
  // When attempts is empty but we have requirements, the user just created an account
  // and needs guidance on how to obtain each requirement
  if (attempts.length === 0 && requirements && requirements.length > 0) {
    return (
      <>
        <h2>Account Created</h2>
        <p>Your digital identity is ready! To complete sign-in, you'll need to obtain the following:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', listStyle: 'none' }}>
          {requirements.map((req, i) => (
            <li key={i} style={{ marginBottom: '0.75rem' }}>
              <strong>{requirementLabel(req)}</strong> — needed — <Link to="/issue">Get this credential</Link>
              <br />
              <span style={{ color: '#666', fontSize: '0.9em' }}>{requirementDetail(req)}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <h2>Proof Failed</h2>
      {attempts.length > 0 ? (
        <>
          <p>The wallet could not satisfy all requirements:</p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
            {attempts.map((a, i) => (
              <li key={i}>
                <strong>{requirementLabel(a.requirement)}</strong>: {a.status}
                {a.reason && ` — ${a.reason}`}
                {a.status === 'missing' && (
                  <>
                    {' '}
                    — <Link to="/issue">Get this credential</Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>The wallet could not satisfy the requirements.</p>
      )}
    </>
  );
}

function truncateAid(aid: string): string {
  return aid.length > 16 ? `${aid.slice(0, 8)}...${aid.slice(-8)}` : aid;
}

function DipEventCard({ dipEvent }: { dipEvent: DelegateApprovalRequestPayload }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(dipEvent, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delegation-request-${truncateAid(dipEvent.childAid)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px' }}>
      <p style={{ margin: 0 }}>
        <strong>Child:</strong> <code>{truncateAid(dipEvent.childAid)}</code>
        {' → '}
        <strong>Parent:</strong> <code>{truncateAid(dipEvent.parentAid)}</code>
      </p>
      <details style={{ marginTop: '0.5rem' }}>
        <summary>Delegation request payload</summary>
        <pre style={{ fontSize: '0.8em', maxHeight: '300px', overflow: 'auto' }}>{json}</pre>
      </details>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button type="button" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <button type="button" onClick={handleDownload}>
          Download
        </button>
      </div>
    </div>
  );
}

function MembershipRequestedView({ dipEvents }: { dipEvents: DelegateApprovalRequestPayload[] }) {
  return (
    <>
      <h2>Membership Requested</h2>
      <p>
        The wallet requested delegation membership. Share the request below with the parent controller for approval.
      </p>
      {dipEvents.map((dip, i) => (
        <DipEventCard key={i} dipEvent={dip} />
      ))}
      <p style={{ marginTop: '0.75rem' }}>
        <Link to="/issue">Go to Issue page to approve →</Link>
      </p>
    </>
  );
}

function ErrorView({ name, message }: { name: string; message: string }) {
  return (
    <>
      <h2>{name}</h2>
      <p>{message}</p>
    </>
  );
}
