import React from 'react';

interface EcoProCardProps {
  isDarkMode: boolean;
}

const EcoProCard: React.FC<EcoProCardProps> = () => {
  return (
    <section className="eco-pro-card">
      <div className="eco-pro-main">
        <div className="eco-pro-icon">🌿</div>
        <div>
          <h2>Eco Pro Plan</h2>
          <p>
            Unlock premium AQ insights, historical eco-route stats, and proactive exposure alerts
            for every commute.
          </p>
        </div>
      </div>
      <button type="button" className="eco-pro-btn">
        Upgrade Now
      </button>
    </section>
  );
};

export default EcoProCard;

