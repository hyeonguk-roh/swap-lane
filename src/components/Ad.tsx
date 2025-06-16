import React, { useEffect } from 'react';
import styled from '@emotion/styled';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdContainer = styled.div`
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #333;
  border-radius: 4px;
  padding: 8px;
  z-index: 100;
`;

interface AdProps {
  position: 'top' | 'bottom' | 'left' | 'right';
  style?: React.CSSProperties;
}

const Ad: React.FC<AdProps> = ({ position, style }) => {
  useEffect(() => {
    // Load AdSense script
    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    // Initialize AdSense
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    ...style,
    ...(position === 'top' && { top: '10px', left: '50%', transform: 'translateX(-50%)' }),
    ...(position === 'bottom' && { bottom: '10px', left: '50%', transform: 'translateX(-50%)' }),
    ...(position === 'left' && { left: '10px', top: '50%', transform: 'translateY(-50%)' }),
    ...(position === 'right' && { right: '10px', top: '50%', transform: 'translateY(-50%)' }),
  };

  return (
    <AdContainer style={containerStyle}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="pub-4964548906296481" // Replace with your AdSense client ID
        data-ad-slot="3171157675" // Replace with your AdSense ad slot ID
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </AdContainer>
  );
};

export default Ad; 