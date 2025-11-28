import React, { useState, useEffect } from 'react';
import { Button, Space } from 'antd';
import { Link } from 'react-router-dom';

const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTop: '1px solid #e8e8e8',
        padding: '16px 24px',
        zIndex: 1000,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ flex: 1, minWidth: '300px' }}>
          <p style={{ margin: 0 }}>
            We use cookies to enhance your experience. By continuing to visit
            this site you agree to our use of cookies.{' '}
            <Link to="/privacy-policy" style={{ textDecoration: 'underline' }}>
              Learn more
            </Link>
          </p>
        </div>
        <Space>
          <Button onClick={handleDecline}>Decline</Button>
          <Button type="primary" onClick={handleAccept}>
            Accept
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default CookieConsent;
