import React, { useState } from 'react';

interface EcoProCardProps {
  isDarkMode: boolean;
}

const EcoProCard: React.FC<EcoProCardProps> = () => {
  const [showOverlay, setShowOverlay] = useState(false);

  const handleUpgradeClick = () => {
    setShowOverlay(true);
    // Automatically hide the message after 2 seconds
    setTimeout(() => setShowOverlay(false), 2000);
  };

  return (
    <section className="eco-pro-card" style={{ position: 'relative' }}>
      <div className="eco-pro-main">
        <div className="eco-pro-icon">🍃</div>
        <div>
          {/* Title is now forced to white for both modes */}
          <h2 className="text-white">Eco Pro Plan</h2>
          {/* Description is now forced to white for both modes */}
          <p className="text-white/80">
            Unlock premium AQ insights, historical eco-route stats, and proactive exposure alerts
            for every commute.
          </p>
        </div>
      </div>
      
      <button 
        type="button" 
        className="eco-pro-btn" 
        onClick={handleUpgradeClick}
      >
        Upgrade Now
      </button>

      {/* "Coming Soon" Overlay */}
      {showOverlay && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.9)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'inherit',
            zIndex: 50,
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div className="text-center italic">
            <span style={{ 
              display: 'block', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#4ade80', 
              letterSpacing: '0.05em'
            }}>
              COMING SOON
            </span>
            <span style={{ fontSize: '12px', color: '#ffffff' }}>
              We're perfecting your premium experience. Meanwhile, enjoy our complete range of free features. 
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  );
};

export default EcoProCard;