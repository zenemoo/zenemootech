import { useState, useEffect } from 'react';
import { brandingApi } from '../services/api';

const LOGO_UPDATE_EVENT = 'zenemoo_logo_updated';
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
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);
  const [logoData, setLogoData] = useState<ActiveLogoData | null>(null);
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
        } else {
          setLogoUrl(DEFAULT_LOGO);
          setLogoData(null);
        }
      } else {
        setLogoUrl(DEFAULT_LOGO);
        setLogoData(null);
      }
    } catch (err) {
      // Graceful fallback to default logo on any API error or offline state
      setLogoUrl(DEFAULT_LOGO);
      setLogoData(null);
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
