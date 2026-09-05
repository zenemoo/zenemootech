import React, { useState } from 'react';
import { CloudinaryService, ImagePresetType } from '../services/CloudinaryService';
import { generateContextualAlt } from '../helpers/imageSeo';
import { DEFAULT_FALLBACK_IMAGE } from '../helpers/imageLoader';

export interface SeoImageProps {
  src: string;
  alt?: string;
  title?: string;
  preset?: ImagePresetType;
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
  alt = 'Zenemoo Enterprise AI Solution',
  title,
  preset = 'card',
  width,
  height,
  aspectRatio,
  priority = false,
  sizes,
  objectFit = 'cover',
  className = '',
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  ariaHidden,
  role,
  style,
  onClick,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(() => {
    return CloudinaryService.optimize(src, {
      width: typeof width === 'number' ? width : undefined,
      height: typeof height === 'number' ? height : undefined,
    });
  });

  const [hasError, setHasError] = useState(false);

  const cleanAlt = generateContextualAlt({ name: alt, category: preset === 'avatar' ? 'team' : preset === 'logo' ? 'logo' : 'hero' });
  const computedSizes = CloudinaryService.autoSizes(preset, sizes);
  const srcSet = !hasError && src?.includes('res.cloudinary.com') ? CloudinaryService.srcSet(src) : undefined;

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
      sizes={srcSet ? computedSizes : undefined}
      alt={cleanAlt}
      title={title || cleanAlt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      aria-hidden={ariaHidden}
      role={role}
      onError={handleError}
      onClick={onClick}
      style={combinedStyle}
      className={`transition-opacity duration-300 ${className}`}
    />
  );
};
