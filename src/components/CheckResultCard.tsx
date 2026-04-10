interface VerificationCheck {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  detail?: string;
  code?: string;
  skipReason?: 'not_applicable' | 'missing_input' | 'not_implemented' | 'disabled' | 'network_error';
}

interface CheckResultCardProps {
  check: VerificationCheck;
}

function indicatorClass(check: VerificationCheck): string {
  if (check.status === 'pass') return 'check-indicator pass';
  if (check.status === 'fail') return 'check-indicator fail';
  const amber = ['missing_input', 'not_implemented', 'network_error'];
  return amber.includes(check.skipReason ?? '') ? 'check-indicator skip-amber' : 'check-indicator skip-grey';
}

function formatName(name: string): string {
  return name.replace(/_/g, ' ');
}

export function CheckResultCard({ check }: CheckResultCardProps) {
  return (
    <div className="check-card" data-check={check.name} data-status={check.status}>
      <div className={indicatorClass(check)} />
      <div>
        <div className="check-name">
          {formatName(check.name)}
          {check.code && <span className="check-code">{check.code}</span>}
        </div>
        {check.detail && <div className="check-detail">{check.detail}</div>}
      </div>
    </div>
  );
}
