import React from 'react';

interface PreviewWatermarkProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'inline';
  className?: string;
}

/**
 * Reusable UI-Only Watermark Overlay for Zenemoo File Previews
 * Appears as a subtle, professional brand overlay on preview containers.
 * Does NOT modify stored, streamed, or downloaded files.
 */
export const PreviewWatermark: React.FC<PreviewWatermarkProps> = ({
  position = 'top-right',
  className = '',
}) => {
  const positionClasses = {
    'top-right': 'top-3 right-3',
    'top-left': 'top-3 left-3',
    'bottom-right': 'bottom-3 right-3',
    'inline': 'relative',
  };

  return (
    <div
      className={`pointer-events-none select-none z-30 ${position !== 'inline' ? `absolute ${positionClasses[position]}` : ''} ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#090a0f]/80 backdrop-blur-md border border-cyan-500/30 text-cyan-300 shadow-xl opacity-75">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
        <span className="font-mono font-bold tracking-wider text-[10px] sm:text-xs text-white">
          ZENEMOO
        </span>
        <span className="text-[9px] font-mono text-cyan-400 font-semibold uppercase hidden sm:inline">
          DATA
        </span>
      </div>
    </div>
  );
};
