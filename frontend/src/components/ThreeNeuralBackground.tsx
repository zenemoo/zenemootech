import React, { useEffect, useState } from 'react';
import { Globe3D } from '@/components/ui/3d-globe';

/**
 * ThreeNeuralBackground — Cinematic 3D Earth Background & Zenemoo Geographic Hub
 * Features:
 * - High-Resolution Realistic Earth texture with detailed continents & oceans
 * - Odisha, India primary highlighted anchor: [20.9517, 85.0985]
 * - Minimalist Zenemoo HUD callout with glowing connector line and auto-culling
 * - Balanced responsive opacity: 0.85 desktop, 0.78 tablet, 0.70 mobile
 * - Non-intrusive background layer with pointer-events-none on canvas and pointer-events-auto on interactive callout
 */
export const ThreeNeuralBackground: React.FC = () => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      const w = window.innerWidth;
      if (w < 768) setDeviceType('mobile');
      else if (w < 1024) setDeviceType('tablet');
      else setDeviceType('desktop');
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const opacity =
    deviceType === 'mobile' ? 0.70 : deviceType === 'tablet' ? 0.78 : 0.85;

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none will-change-transform overflow-hidden max-w-full"
      style={{
        transform: 'translateZ(0)',
        opacity,
      }}
      aria-hidden="true"
    >
      <Globe3D
        textureUrl="/assets/earth-realistic.jpg"
        atmosphereColor="#00d9ff"
        atmosphereIntensity={0.45}
        autoRotate={true}
        autoRotateSpeed={0.0009}
        enableRotate={true}
        showCallout={true}
        markers={[
          {
            latitude: 20.9517,
            longitude: 85.0985,
            label: 'ZENEMOO',
            color: '#00d9ff',
            size: 1.8,
          },
        ]}
      />
    </div>
  );
};
