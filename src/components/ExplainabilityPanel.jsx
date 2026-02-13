import React from 'react';

export default function ExplainabilityPanel({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="cs-card cs-card--panel">
        <div className="cs-card__header">
          <span className="cs-card__title">Explainability Panel</span>
          <span className="cs-card__badge cs-card__badge--ok">All Clear</span>
        </div>
        <div style={{ color: 'var(--cs-text-muted)', fontSize: '12px' }}>
          No active alerts. All parameters within acceptable range.
        </div>
      </div>
    );
  }

  return (
    <div className="cs-card cs-card--panel">
      <div className="cs-card__header">
        <span className="cs-card__title">Explainability Panel</span>
        <span className="cs-card__badge cs-card__badge--warning">{alerts.length} Alert{alerts.length > 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
        {alerts.map((a, i) => (
          <div key={i} className="cs-explain">
            <div className="cs-explain__rule">
              <span className={`cs-metric-indicator cs-metric-indicator--${a.severity || 'warning'}`}></span>
              {a.rule}
            </div>
            <div className="cs-explain__detail">
              <strong>Reason:</strong> {a.reason}<br />
              <strong>Confidence:</strong> {a.confidence}%<br />
              {a.compliance && <><strong>Compliance:</strong> {a.compliance}</>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
