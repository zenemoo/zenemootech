import React, { useEffect, useState } from 'react';
import { Globe3D } from '@/components/ui/3d-globe';

/**
 * ThreeNeuralBackground — Enterprise 3D Earth Background
 * Features:
 * - Realistic Natural Earth texture: /assets/earth-realistic.jpg
 * - Single Zenemoo / Odisha location marker: [20.2961, 85.8245] with "zenemoo.in"
 * - Responsive Earth visibility: 0.52 desktop, 0.46 tablet, 0.40 mobile
 * - Zero visual clutter: no extra cities, no arcs, no overlays
 * - Non-intrusive background layer (z-0, pointer-events-none, max-w-full overflow-hidden)
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
    deviceType === 'mobile' ? 0.40 : deviceType === 'tablet' ? 0.46 : 0.52;

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
        atmosphereColor="#38bdf8"
        atmosphereIntensity={0.30}
        autoRotate={true}
        autoRotateSpeed={0.0008}
        enableRotate={true}
        markers={[
          {
            latitude: 20.2961,
            longitude: 85.8245,
            label: 'zenemoo.in',
            color: '#00d9ff',
            size: 1.6,
          },
        ]}
      />
    </div>
  );
};
