import type { ReactNode } from 'react';
import { useState } from 'react';
import { config } from '../config';
import type { RequirementEntry } from './RequirementBuilder';

interface Props {
  entries: RequirementEntry[];
  walletUrl: string;
  children?: ReactNode;
}

export function CodePreview({ entries, walletUrl, children }: Props) {
  const [copied, setCopied] = useState(false);
  const code = generateCode(entries, walletUrl);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — silently ignore
    }
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ marginBottom: 0 }}>Generated Code</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {children}
          <button type="button" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <textarea className="code-preview" value={code} readOnly />
    </div>
  );
}

function generateCode(entries: RequirementEntry[], walletUrl: string): string {
  const imports = ['KeritsAuth', 'createAuthRequest'];
  const reqLines = entries.map((e) => {
    if (e.kind === 'delegateOf') {
      return `  KeritsAuth.requires.delegateOf({ aid: '${e.aid}' })`;
    }
    const issuers = e.issuers
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const issuersStr = issuers.map((i) => `'${i}'`).join(', ');
    return `  KeritsAuth.requires.hasCredential({\n    schema: '${e.schema}',\n    issuers: [${issuersStr}],\n  })`;
  });

  return `import { ${imports.join(', ')} } from '@kerits/kerits-auth';

const request = createAuthRequest({
  audience: '${config.audience}',
  requirements: [
${reqLines.join(',\n')},
  ],
  expiresInSeconds: 300,
});

const wallet = KeritsAuth.wallet.forUrl('${walletUrl}');
const result = await wallet.requestProof(request);`;
}
