import { useState, useEffect } from 'react';
import { brandingApi } from '../services/api';

const LOGO_UPDATE_EVENT = 'zenemoo_logo_updated';
const LOGO_CACHE_KEY = 'zenemoo_active_logo_cache';
const DEFAULT_LOGO = '/assets/logo.png';

export const notifyLogoUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LOGO_UPDATE_EVENT));
  }
};

export interface ActiveLogoData {
  id?: string;
  url?: string;
  secure_url?: string;
  publicId?: string;
  cloudinary_public_id?: string;
  altText?: string;
  title?: string;
  seo_filename?: string;
  original_filename?: string;
  format?: string;
  width?: number;
  height?: number;
  fileSize?: string;
  isActive?: boolean;
  isDefault?: boolean;
  updated_at?: string;
}

export const useActiveLogo = () => {
  // Initialize state from local cache if available for instant render
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOGO_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const rawUrl = parsed?.secure_url || parsed?.url || parsed?.image_url;
          if (rawUrl) return rawUrl;
        }
      } catch (e) {}
    }
    return DEFAULT_LOGO;
  });

  const [logoData, setLogoData] = useState<ActiveLogoData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOGO_CACHE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {}
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLogo = async () => {
    try {
      const res = await brandingApi.getActiveLogo();
      if (res?.data?.success && res.data.data) {
        const item = res.data.data;
        const rawUrl = item.secure_url || item.url || item.cloudinary_secure_url || item.image_url;
        
        if (rawUrl) {
          setLogoUrl(rawUrl);
          setLogoData(item);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(item));
          }
        } else {
          setLogoUrl(DEFAULT_LOGO);
          setLogoData(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(LOGO_CACHE_KEY);
          }
        }
      } else {
        // If API responds with default or null, check if data is explicitly removed
        if (res?.data?.success && res.data.data === null) {
          setLogoUrl(DEFAULT_LOGO);
          setLogoData(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(LOGO_CACHE_KEY);
          }
        }
      }
    } catch (err) {
      // Retain existing cached logo on network error
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(LOGO_CACHE_KEY);
        if (!cached) {
          setLogoUrl(DEFAULT_LOGO);
          setLogoData(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogo();

    if (typeof window !== 'undefined') {
      window.addEventListener(LOGO_UPDATE_EVENT, fetchLogo);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LOGO_UPDATE_EVENT, fetchLogo);
      }
    };
  }, []);

  return { logoUrl, logoData, isLoading, refetchLogo: fetchLogo };
};

