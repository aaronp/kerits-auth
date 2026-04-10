import { KeritsAuth, type Requirement } from '@kerits/kerits-auth';
import type { ReactNode } from 'react';
import { useRef } from 'react';

export interface RequirementEntry {
  id: number;
  kind: 'delegateOf' | 'hasCredential';
  aid: string;
  schema: string;
  issuers: string;
}

interface Props {
  entries: RequirementEntry[];
  onChange: (entries: RequirementEntry[]) => void;
  children?: ReactNode;
}

export function RequirementBuilder({ entries, onChange, children }: Props) {
  const nextId = useRef(10);

  function genId() {
    return nextId.current++;
  }

  function updateEntry(id: number, updates: Partial<RequirementEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }

  function removeEntry(id: number) {
    onChange(entries.filter((e) => e.id !== id));
  }

  function addEntry() {
    onChange([...entries, { id: genId(), kind: 'delegateOf', aid: '', schema: '', issuers: '' }]);
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ marginBottom: 0 }}>Requirements</h2>
        {children}
      </div>

      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{ border: '1px solid #e5e5e5', borderRadius: 4, padding: '0.75rem', marginBottom: '0.5rem' }}
        >
          <div className="field" style={{ display: 'flex', gap: '1rem' }}>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <input
                type="radio"
                name={`kind-${entry.id}`}
                value="delegateOf"
                checked={entry.kind === 'delegateOf'}
                onChange={() => updateEntry(entry.id, { kind: 'delegateOf' })}
              />
              member of
            </label>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <input
                type="radio"
                name={`kind-${entry.id}`}
                value="hasCredential"
                checked={entry.kind === 'hasCredential'}
                onChange={() => updateEntry(entry.id, { kind: 'hasCredential' })}
              />
              has credential
            </label>
          </div>

          {entry.kind === 'delegateOf' && (
            <div className="field">
              <label>Delegator AID</label>
              <input
                value={entry.aid}
                onChange={(e) => updateEntry(entry.id, { aid: e.target.value })}
                placeholder="EexampleParentAid"
              />
            </div>
          )}

          {entry.kind === 'hasCredential' && (
            <>
              <div className="field">
                <label>Schema SAID</label>
                <input
                  value={entry.schema}
                  onChange={(e) => updateEntry(entry.id, { schema: e.target.value })}
                  placeholder="EExampleSchema"
                />
              </div>
              <div className="field">
                <label>Issuer AIDs (comma-separated)</label>
                <input
                  value={entry.issuers}
                  onChange={(e) => updateEntry(entry.id, { issuers: e.target.value })}
                  placeholder="EIssuer1, EIssuer2"
                />
              </div>
            </>
          )}

          {entries.length > 1 && (
            <button type="button" onClick={() => removeEntry(entry.id)}>
              Remove
            </button>
          )}
        </div>
      ))}

      <button type="button" onClick={addEntry}>
        + Add requirement
      </button>
    </div>
  );
}

/** Convert UI entries to kerits Requirement objects using the DSL helpers */
export function entriesToRequirements(entries: RequirementEntry[]): Requirement[] {
  return entries.map((e) => {
    if (e.kind === 'delegateOf') {
      return KeritsAuth.requires.delegateOf({ aid: e.aid });
    }
    return KeritsAuth.requires.hasCredential({
      schema: e.schema,
      issuers: e.issuers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  });
}
