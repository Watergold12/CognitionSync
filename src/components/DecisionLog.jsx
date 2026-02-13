import React, { useState } from 'react';

export default function DecisionLog({ logs, onAddManual }) {
  const [note, setNote] = useState('');

  const handleAdd = () => {
    if (note.trim()) {
      onAddManual(note.trim());
      setNote('');
    }
  };

  return (
    <div className="cs-card cs-card--panel">
      <div className="cs-card__header">
        <span className="cs-card__title">Decision & Audit Log</span>
        <button className="cs-btn cs-btn--sm" onClick={() => {
          const text = logs.map(l => `[${l.time}] [${l.type}] ${l.msg}`).join('\n');
          const blob = new Blob([text], { type: 'text/plain' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'audit_trail.txt';
          a.click();
        }}>Export</button>
      </div>
      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
        {logs.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>No entries yet.</div>
        )}
        {logs.map((l, i) => (
          <div key={i} className={`cs-log-entry cs-log-entry--${l.type}`}>
            <div className="cs-log-entry__time">{l.time}</div>
            <div className="cs-log-entry__msg">{l.msg}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          className="cs-input"
          placeholder="Add manual override note..."
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="cs-btn" onClick={handleAdd}>Log</button>
      </div>
    </div>
  );
}
