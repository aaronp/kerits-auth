import { CredentialChecksSection } from './CredentialChecksSection';
import { DelegateChecksSection } from './DelegateChecksSection';
import { PresentationChecksSection } from './PresentationChecksSection';

interface VerificationCheck {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  detail?: string;
  code?: string;
  skipReason?: 'not_applicable' | 'missing_input' | 'not_implemented' | 'disabled' | 'network_error';
}

interface VerifiedEntry {
  requirement: { kind: string; aid?: string; schema?: string; [key: string]: unknown };
  evidence: { kind: string; [key: string]: unknown };
  checks: VerificationCheck[];
}

interface VerifyEntryResult {
  status: string;
  requirement: { kind: string; aid?: string; schema?: string; [key: string]: unknown };
  checks?: VerificationCheck[];
  reason?: string;
}

type VerifyResult =
  | { ok: true; checks: VerificationCheck[]; entries: VerifiedEntry[] }
  | { ok: false; checks: VerificationCheck[]; results: VerifyEntryResult[] };

interface Props {
  result: VerifyResult;
}

export function ProofChecksPanel({ result }: Props) {
  const entryItems = result.ok ? result.entries : result.results;

  return (
    <div>
      <div className="checks-panel-status" style={{ color: result.ok ? '#34a853' : '#ea4335' }}>
        {result.ok ? 'All checks passed' : 'Verification failed'}
      </div>

      <PresentationChecksSection checks={result.checks} />

      {entryItems.map((entry, i) => {
        const checks = entry.checks ?? [];
        if (entry.requirement.kind === 'delegateOf') {
          return <DelegateChecksSection key={i} checks={checks} requirementAid={entry.requirement.aid ?? 'unknown'} />;
        }
        if (entry.requirement.kind === 'hasCredential') {
          return <CredentialChecksSection key={i} checks={checks} schema={entry.requirement.schema ?? 'unknown'} />;
        }
        return (
          <div key={i} className="checks-section">
            <div className="checks-section-header">{entry.requirement.kind}</div>
            {checks.map((check) => (
              <div key={check.name} className="check-card">
                {check.name}: {check.status}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
