import { FaLinkedin, FaXTwitter, FaInstagram, FaYoutube, FaWhatsapp } from 'react-icons/fa6';
import { ComponentType } from 'react';

export interface SocialLinkItem {
  id: string;
  name: string;
  url: string;
  handle: string;
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  hoverBg: string;
  hoverText: string;
  hoverBorder: string;
  hoverShadow: string;
  ariaLabel: string;
}

export const ZENEMOO_SOCIAL_LINKS: SocialLinkItem[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/company/zenemoo/',
    handle: 'company/zenemoo',
    icon: FaLinkedin,
    color: '#0A66C2',
    hoverBg: 'hover:bg-[#0A66C2]/20',
    hoverText: 'hover:text-[#0A66C2]',
    hoverBorder: 'hover:border-[#0A66C2]/60',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(10,102,194,0.4)]',
    ariaLabel: 'Follow Zenemoo on LinkedIn',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    url: 'https://x.com/zenemooofficial',
    handle: '@zenemooofficial',
    icon: FaXTwitter,
    color: '#FFFFFF',
    hoverBg: 'hover:bg-white/20',
    hoverText: 'hover:text-white',
    hoverBorder: 'hover:border-white/50',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]',
    ariaLabel: 'Follow Zenemoo on X (Twitter)',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: 'https://www.instagram.com/zenemooofficial',
    handle: '@zenemooofficial',
    icon: FaInstagram,
    color: '#E4405F',
    hoverBg: 'hover:bg-[#E4405F]/20',
    hoverText: 'hover:text-[#E4405F]',
    hoverBorder: 'hover:border-[#E4405F]/60',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(228,64,95,0.4)]',
    ariaLabel: 'Follow Zenemoo on Instagram',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com/channel/UCj8ryPiPOeM_HrWqkNsFkTg',
    handle: 'Zenemoo Official',
    icon: FaYoutube,
    color: '#FF0000',
    hoverBg: 'hover:bg-[#FF0000]/20',
    hoverText: 'hover:text-[#FF0000]',
    hoverBorder: 'hover:border-[#FF0000]/60',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(255,0,0,0.4)]',
    ariaLabel: 'Subscribe to Zenemoo on YouTube',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Channel',
    url: 'https://whatsapp.com/channel/0029Vb8VOTHGOj9eWQiiPs08',
    handle: 'Zenemoo Channel',
    icon: FaWhatsapp,
    color: '#25D366',
    hoverBg: 'hover:bg-[#25D366]/20',
    hoverText: 'hover:text-[#25D366]',
    hoverBorder: 'hover:border-[#25D366]/60',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(37,211,102,0.4)]',
    ariaLabel: 'Join Zenemoo WhatsApp Channel',
  },
];
