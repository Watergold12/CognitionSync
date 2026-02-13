import React from 'react';

export default function WhatIfPanel({ params, onChange }) {
  return (
    <div className="cs-card cs-card--panel">
      <div className="cs-card__header">
        <span className="cs-card__title">What-If Simulation</span>
      </div>
      <div className="cs-whatif">
        {params.map((p) => (
          <div key={p.key} className="cs-whatif__row">
            <span className="cs-whatif__label">{p.label}</span>
            <input
              className="cs-whatif__slider"
              type="range"
              min={p.min}
              max={p.max}
              step={p.step || 1}
              value={p.value}
              onChange={(e) => onChange(p.key, parseFloat(e.target.value))}
            />
            <span className="cs-whatif__value">{p.value}{p.unit || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
