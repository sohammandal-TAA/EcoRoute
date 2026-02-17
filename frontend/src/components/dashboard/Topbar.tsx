import React from 'react';

interface TopbarProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ isDarkMode, onToggleTheme }) => {
  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar-left">
        <div className="dashboard-logo-mark">🌿</div>
        <div className="dashboard-logo-text">
          <span className="brand">EcoRoute</span>
          <span className="badge">ai</span>
        </div>
      </div>

      <div className="dashboard-topbar-search">
        <input
          type="text"
          placeholder="Search for a cleaner destination"
          className="dashboard-search-input"
        />
      </div>

      <div className="dashboard-topbar-right">
        <button type="button" className="icon-pill" aria-label="Notifications">
          🔔
        </button>
        <button
          type="button"
          className="icon-pill"
          onClick={onToggleTheme}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <div className="dashboard-avatar">
          <span>SE</span>
        </div>
        <span className="dashboard-username">Soham</span>
      </div>
    </header>
  );
};

export default Topbar;

