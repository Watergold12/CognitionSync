import React from 'react';

export default function MasterControl({ machineOn, automationOn, onToggleMachine, onToggleAutomation }) {
  return (
    <div className="cs-master-control" id="master-control-panel">
      <div className="cs-control-item">
        <span className="cs-control-item__label">Machine</span>
        <label className="cs-toggle" id="machine-toggle">
          <input type="checkbox" checked={machineOn} onChange={onToggleMachine} />
          <span className="cs-toggle__slider"></span>
        </label>
        <span className={`cs-control-item__status ${machineOn ? 'cs-control-item__status--on' : 'cs-control-item__status--off'}`}>
          {machineOn ? 'ON' : 'OFF'}
        </span>
      </div>
      <div className="cs-control-item">
        <span className="cs-control-item__label">Automation</span>
        <label className="cs-toggle" id="automation-toggle">
          <input type="checkbox" checked={automationOn} onChange={onToggleAutomation} />
          <span className="cs-toggle__slider"></span>
        </label>
        <span className={`cs-control-item__status ${automationOn ? 'cs-control-item__status--on' : 'cs-control-item__status--off'}`}>
          {automationOn ? 'ENABLED' : 'DISABLED'}
        </span>
      </div>
    </div>
  );
}
