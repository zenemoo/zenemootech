import { useState, useEffect } from 'react';
import { brandingApi } from '../services/api';

const LOGO_UPDATE_EVENT = 'zenemoo_logo_updated';

export const notifyLogoUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LOGO_UPDATE_EVENT));
  }
};

export const useActiveLogo = () => {
  const [logoUrl, setLogoUrl] = useState<string>('/assets/logo.png');
  const [logoData, setLogoData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLogo = async () => {
    try {
      const res = await brandingApi.getActiveLogo();
      if (res.data && res.data.success && res.data.data) {
        const item = res.data.data;
        const url = item.cloudinary_secure_url || item.image_url || '/assets/logo.png';
        setLogoUrl(url);
        setLogoData(item);
      }
    } catch (err) {
      setLogoUrl('/assets/logo.png');
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
