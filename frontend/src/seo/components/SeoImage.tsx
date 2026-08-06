import React, { useState } from 'react';
import {
  getOptimizedCloudinaryUrl,
  buildCloudinarySrcSet,
} from '../helpers/cloudinary';
import { sanitizeAltText, DEFAULT_FALLBACK_IMAGE } from '../helpers/imageLoader';

export interface SeoImageProps {
  src: string;
  alt: string;
  title?: string;
  width?: number | string;
  height?: number | string;
  aspectRatio?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  className?: string;
  fallbackSrc?: string;
  ariaHidden?: boolean;
  role?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export const SeoImage: React.FC<SeoImageProps> = ({
  src,
  alt,
  title,
  width,
  height,
  aspectRatio,
  priority = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  objectFit = 'cover',
  className = '',
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  ariaHidden,
  role,
  style,
  onClick,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(() => {
    return getOptimizedCloudinaryUrl(src, {
      width: typeof width === 'number' ? width : undefined,
      height: typeof height === 'number' ? height : undefined,
    });
  });

  const [hasError, setHasError] = useState(false);

  const cleanAlt = sanitizeAltText(alt);
  const srcSet = !hasError && src?.includes('res.cloudinary.com') ? buildCloudinarySrcSet(src) : undefined;

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  const combinedStyle: React.CSSProperties = {
    objectFit,
    aspectRatio: aspectRatio || (width && height ? `${width}/${height}` : undefined),
    ...style,
  };

  return (
    <img
      src={imgSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={cleanAlt}
      title={title || cleanAlt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      // @ts-ignore fetchpriority is supported in modern browsers
      fetchpriority={priority ? 'high' : 'auto'}
      aria-hidden={ariaHidden}
      role={role}
      onError={handleError}
      onClick={onClick}
      style={combinedStyle}
      className={`transition-opacity duration-300 ${className}`}
    />
  );
};
