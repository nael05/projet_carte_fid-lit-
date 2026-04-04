import React from 'react';
import '../styles/CustomerCard.css';

const CustomerCard = ({ 
  client, 
  loyaltyType, 
  customization, 
  companyName 
}) => {
  // Utiliser les paramètres de personnalisation ou les valeurs par défaut
  const bgColor = customization?.card_background_color || '#1f2937';
  const textColor = customization?.card_text_color || '#ffffff';
  const accentColor = customization?.card_accent_color || '#3b82f6';
  const borderRadius = customization?.card_border_radius || 12;
  const fontFamily = customization?.font_family || 'Arial';
  const logoUrl = customization?.card_logo_url;
  const bgImageUrl = customization?.background_image_url;
  const pattern = customization?.card_pattern || 'solid';
  const template = customization?.card_design_template || 'classic';
  const gradientStart = customization?.gradient_start;
  const gradientEnd = customization?.gradient_end;
  const showCompanyName = customization?.show_company_name !== false;
  const showLoyaltyType = customization?.show_loyalty_type !== false;
  const customMessage = customization?.custom_message || '';

  // Déterminer le dégradé
  let backgroundStyle = {};
  if (template === 'gradient' && gradientStart && gradientEnd) {
    backgroundStyle = {
      background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
    };
  } else if (bgImageUrl) {
    backgroundStyle = {
      backgroundImage: `url(${bgImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    };
  } else {
    backgroundStyle = {
      backgroundColor: bgColor
    };
  }

  return (
    <div className="loyalty-card-container">
      <div
        className={`loyalty-card card-template-${template}`}
        style={{
          ...backgroundStyle,
          borderRadius: borderRadius + 'px',
          fontFamily: fontFamily,
          color: textColor
        }}
      >
        {/* Pattern Overlay */}
        <div
          className={`card-pattern pattern-${pattern}`}
          style={{ opacity: 0.1 }}
        />

        {/* Card Content */}
        <div className="card-inner">
          {/* Header Section */}
          <div className="card-header">
            {logoUrl && (
              <div className="card-logo">
                <img src={logoUrl} alt="Logo" />
              </div>
            )}

            {showCompanyName && (
              <div className="company-name" style={{ fontSize: template === 'premium' ? '18px' : '16px' }}>
                {companyName}
              </div>
            )}

            {showLoyaltyType && (
              <div
                className="loyalty-badge"
                style={{
                  backgroundColor: accentColor,
                  color: textColor,
                  borderRadius: Math.max(borderRadius - 8, 4) + 'px'
                }}
              >
                {loyaltyType === 'points' ? '⭐ Points' : '🎫 Tampons'}
              </div>
            )}
          </div>

          {/* Client Info Section */}
          <div className="card-client-info">
            <div className="client-name">{client?.prenom} {client?.nom}</div>
            {client?.telephone && (
              <div className="client-phone" style={{ opacity: 0.8, fontSize: '12px' }}>
                {client.telephone}
              </div>
            )}
          </div>

          {/* Stats Section */}
          <div className="card-stats">
            {loyaltyType === 'points' ? (
              <>
                <div className="stat-box">
                  <div className="stat-label">Points</div>
                  <div
                    className="stat-value"
                    style={{ color: accentColor }}
                  >
                    {client?.points || 0}
                  </div>
                </div>
                <div className="stat-divider" style={{ color: textColor, opacity: 0.3 }}>|</div>
                <div className="stat-box">
                  <div className="stat-label">Prochaine récompense</div>
                  <div style={{ fontSize: '12px' }}>
                    {client?.points ? `${(client.points % 100) || 100}/100` : '0/100'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="stat-box">
                  <div className="stat-label">Tampons</div>
                  <div
                    className="stat-value"
                    style={{ color: accentColor }}
                  >
                    {(client?.stamps_collected || 0)}/{client?.stamps_total || 10}
                  </div>
                </div>
                <div className="stamp-visual">
                  {Array.from({ length: client?.stamps_total || 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`stamp ${i < (client?.stamps_collected || 0) ? 'filled' : ''}`}
                      style={{
                        backgroundColor: i < (client?.stamps_collected || 0) ? accentColor : 'rgba(255,255,255,0.2)'
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Custom Message */}
          {customMessage && (
            <div
              className="card-custom-message"
              style={{
                borderTopColor: accentColor,
                opacity: 0.9
              }}
            >
              {customMessage}
            </div>
          )}

          {/* Footer with QR/Wallet Info */}
          <div className="card-footer">
            <div className="wallet-info" style={{ fontSize: '11px' }}>
              📱 {client?.type_wallet === 'apple' ? '🍎 Apple Wallet' : '🔴 Google Wallet'}
            </div>
          </div>
        </div>

        {/* Decorative Elements for Premium Template */}
        {template === 'premium' && (
          <>
            <div
              className="decoration decoration-1"
              style={{ borderColor: accentColor, opacity: 0.2 }}
            />
            <div
              className="decoration decoration-2"
              style={{ borderColor: accentColor, opacity: 0.2 }}
            />
          </>
        )}
      </div>

      {/* Card Info Below */}
      <div className="card-info">
        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
          ✓ Carte actualisée {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default CustomerCard;
