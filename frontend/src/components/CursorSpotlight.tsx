import React, { useEffect, useRef, useState } from 'react';

export const CursorSpotlight: React.FC = () => {
  const glowRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(true);

  useEffect(() => {
    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.body.addEventListener('mouseenter', handleMouseEnter);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    const updatePosition = () => {
      // Smooth linear interpolation for buttery motion
      currentX += (targetX - currentX) * 0.25;
      currentY += (targetY - currentY) * 0.25;

      const transformStr = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;

      if (glowRef.current) {
        glowRef.current.style.transform = transformStr;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = transformStr;
      }

      animationFrameId = requestAnimationFrame(updatePosition);
    };

    animationFrameId = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 will-change-transform"
      style={{ opacity: isHovered ? 1 : 0.6 }}
    >
      {/* Primary Cyan Glow */}
      <div
        ref={glowRef}
        className="absolute top-0 left-0 rounded-full pointer-events-none will-change-transform"
        style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(168, 85, 247, 0.05) 50%, transparent 70%)',
          filter: 'blur(30px)',
          transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
        }}
      />
      {/* Intense Center Spotlight Dot */}
      <div
        ref={dotRef}
        className="absolute top-0 left-0 rounded-full pointer-events-none will-change-transform"
        style={{
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 80%)',
          filter: 'blur(15px)',
          transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
        }}
      />
    </div>
  );
};

