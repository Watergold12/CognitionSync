import React from 'react';

export default function MetricCard({ title, value, unit, status, footer, idle }) {
  const statusClass = status === 'ok' ? 'cs-card__badge--ok'
    : status === 'warning' ? 'cs-card__badge--warning'
    : status === 'danger' ? 'cs-card__badge--danger'
    : status === 'critical' ? 'cs-card__badge--critical'
    : 'cs-card__badge--info';

  const statusLabel = status === 'ok' ? 'Normal'
    : status === 'warning' ? 'Warning'
    : status === 'danger' ? 'Alert'
    : status === 'critical' ? 'Critical'
    : 'Info';

  const indicatorClass = `cs-metric-indicator cs-metric-indicator--${status || 'ok'}`;

  return (
    <div className="cs-card cs-card--metric cs-relative">
      <div className={`cs-idle-overlay ${idle ? 'cs-idle-overlay--visible' : ''}`}>
        <span className="cs-idle-overlay__text">Idle</span>
      </div>
      <div className="cs-card__header">
        <span className="cs-card__title">{title}</span>
        <span className={`cs-card__badge ${statusClass}`}>{statusLabel}</span>
      </div>
      <div>
        <span className={indicatorClass}></span>
        <span className="cs-card__value">{idle ? '—' : value}</span>
        {unit && <span className="cs-card__unit">{unit}</span>}
      </div>
      {footer && <div className="cs-card__footer">{footer}</div>}
    </div>
  );
}
