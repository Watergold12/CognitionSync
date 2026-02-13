import React from 'react';

export default function HumanInLoopModal({ visible, title, description, alerts, onApprove, onReject, onClose }) {
  return (
    <div className={`cs-modal-overlay ${visible ? 'cs-modal-overlay--visible' : ''}`}>
      <div className="cs-modal">
        <div className="cs-modal__title">{title || 'Human Review Required'}</div>
        <p style={{ fontSize: '13px', color: 'var(--cs-text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
          {description || 'The system has detected conditions requiring human review before action.'}
        </p>
        {alerts && alerts.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {alerts.map((a, i) => (
              <div key={i} className="cs-explain" style={{ marginBottom: '8px' }}>
                <div className="cs-explain__rule">{a.rule}</div>
                <div className="cs-explain__detail">{a.reason} — Confidence: {a.confidence}%</div>
              </div>
            ))}
          </div>
        )}
        <div className="cs-modal__actions">
          <button className="cs-btn" onClick={onClose}>Dismiss</button>
          {onReject && <button className="cs-btn cs-btn--danger" onClick={onReject}>Reject</button>}
          {onApprove && <button className="cs-btn cs-btn--primary" onClick={onApprove}>Approve</button>}
        </div>
      </div>
    </div>
  );
}
