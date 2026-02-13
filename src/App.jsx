import React, { useState, useCallback } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ManufacturingPage from './pages/ManufacturingPage';
import CreditCardPage from './pages/CreditCardPage';
import HealthcarePage from './pages/HealthcarePage';
import LogisticsPage from './pages/LogisticsPage';
import DisasterPage from './pages/DisasterPage';
import MasterControl from './components/MasterControl';

export default function App() {
  const [machineOn, setMachineOn] = useState(true);
  const [automationOn, setAutomationOn] = useState(true);

  const toggleMachine = useCallback(() => setMachineOn(p => !p), []);
  const toggleAutomation = useCallback(() => setAutomationOn(p => !p), []);

  return (
    <div className="cs-app">
      <header className="cs-header">
        <div className="cs-header__brand">
          <div className="cs-header__logo">
            Cognition<span>Sync</span>
          </div>
          <nav className="cs-header__nav">
            <NavLink to="/manufacturing" className={({ isActive }) => `cs-header__nav-link ${isActive ? 'active' : ''}`}>
              Manufacturing
            </NavLink>
            <NavLink to="/credit" className={({ isActive }) => `cs-header__nav-link ${isActive ? 'active' : ''}`}>
              Credit Card
            </NavLink>
            <NavLink to="/healthcare" className={({ isActive }) => `cs-header__nav-link ${isActive ? 'active' : ''}`}>
              Healthcare
            </NavLink>
            <NavLink to="/logistics" className={({ isActive }) => `cs-header__nav-link ${isActive ? 'active' : ''}`}>
              Logistics
            </NavLink>
            <NavLink to="/disaster" className={({ isActive }) => `cs-header__nav-link ${isActive ? 'active' : ''}`}>
              Disaster
            </NavLink>
          </nav>
        </div>
        <div className="cs-header__controls">
          <MasterControl
            machineOn={machineOn}
            automationOn={automationOn}
            onToggleMachine={toggleMachine}
            onToggleAutomation={toggleAutomation}
          />
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/manufacturing" replace />} />
        <Route path="/manufacturing" element={<ManufacturingPage machineOn={machineOn} automationOn={automationOn} />} />
        <Route path="/credit" element={<CreditCardPage machineOn={machineOn} automationOn={automationOn} />} />
        <Route path="/healthcare" element={<HealthcarePage machineOn={machineOn} automationOn={automationOn} />} />
        <Route path="/logistics" element={<LogisticsPage machineOn={machineOn} automationOn={automationOn} />} />
        <Route path="/disaster" element={<DisasterPage machineOn={machineOn} automationOn={automationOn} />} />
      </Routes>
    </div>
  );
}
