import { CheckResultCard } from './CheckResultCard';

interface VerificationCheck {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  detail?: string;
  code?: string;
  skipReason?: 'not_applicable' | 'missing_input' | 'not_implemented' | 'disabled' | 'network_error';
}

interface Props {
  checks: VerificationCheck[];
  requirementAid: string;
}

export function DelegateChecksSection({ checks, requirementAid }: Props) {
  return (
    <div className="checks-section">
      <div className="checks-section-header">Delegation — {requirementAid}</div>
      {checks.map((check) => (
        <CheckResultCard key={check.name} check={check} />
      ))}
    </div>
  );
}
