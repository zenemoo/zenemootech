import React, { useState, useEffect } from 'react';

export interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Source URL of the image */
  src?: string;
  /** Alt description */
  alt?: string;
  /** Custom CSS classes for the img tag */
  className?: string;
  /** Custom CSS classes for the container wrapper */
  containerClassName?: string;
  /** Custom CSS classes for the skeleton placeholder */
  skeletonClassName?: string;
  /** Fallback image URL if loading fails or src is empty */
  fallbackSrc?: string;
  /** Pre-configured fallback presets */
  fallbackType?: 'avatar' | 'logo' | 'partner' | 'default';
  /** Shortcut to round skeleton placeholder as a circle */
  isAvatar?: boolean;
}

const DEFAULT_FALLBACKS: Record<string, string> = {
  avatar: '/assets/executive.png',
  logo: '/assets/logo.png',
  partner: '/assets/logo.png',
  default: '/assets/logo.png',
};

export const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  skeletonClassName = '',
  fallbackSrc,
  fallbackType = 'default',
  isAvatar = false,
  onLoad,
  onError,
  loading = 'lazy',
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setIsError(false);
  }, [src]);

  // Determine effective fallback image
  const effectiveFallback = fallbackSrc || DEFAULT_FALLBACKS[fallbackType] || DEFAULT_FALLBACKS.default;
  const currentSrc = isError || !src ? effectiveFallback : src;

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!isError) {
      setIsError(true);
    }
    if (onError) {
      onError(e);
    }
  };

  return (
    <div
      className={`relative overflow-hidden inline-block ${containerClassName}`}
      style={style}
    >
      {/* Skeleton Shimmer Overlay */}
      {!isLoaded && (
        <div
          aria-hidden="true"
          className={`skeleton-shimmer absolute inset-0 z-10 w-full h-full transition-opacity duration-300 ease-in-out ${
            isAvatar || className.includes('rounded-full') ? 'rounded-full' : ''
          } ${skeletonClassName}`}
        />
      )}

      {/* Target Image */}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ease-in-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        {...props}
      />
    </div>
  );
};

export default ImageWithSkeleton;
