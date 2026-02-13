import React from 'react';

export default function ConfidenceMeter({ label, value, color }) {
  const fillColor = color || (value > 80 ? 'var(--cs-status-danger)' : value > 50 ? 'var(--cs-status-warning)' : 'var(--cs-status-ok)');
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span className="cs-card__title">{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--cs-font-mono)' }}>{value}%</span>
      </div>
      <div className="cs-confidence-meter">
        <div className="cs-confidence-meter__fill" style={{ width: `${value}%`, background: fillColor }}></div>
      </div>
    </div>
  );
}
