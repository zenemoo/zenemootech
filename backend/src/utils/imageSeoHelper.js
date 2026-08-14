/**
 * Zenemoo Automatic Image SEO Generator (Backend)
 * Automatically converts raw upload metadata into search-engine optimized asset names,
 * contextual alt text, titles, descriptions, and structured Cloudinary public IDs.
 */

/**
 * Format string to a clean SEO-friendly slug
 * Example: "Zenemoo Odia AI Voice Data Project!" -> "zenemoo-odia-ai-voice-data-project"
 */
export const formatSeoSlug = (str = '') => {
  if (!str) return 'zenemoo-ai-data-asset';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'zenemoo-ai-data-asset';
};

/**
 * Generate SEO-friendly filename preserving extension
 */
export const generateSeoFilename = (originalName = '', entityTitle = '', assetType = 'image') => {
  const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

  const baseTitle = entityTitle || originalName.replace(/\.[^/.]+$/, '') || assetType;
  const cleanSlug = formatSeoSlug(baseTitle);

  // Avoid repetitive 'zenemoo' prefix if already present
  const prefix = cleanSlug.startsWith('zenemoo') ? '' : 'zenemoo-';
  return `${prefix}${cleanSlug}.${ext}`;
};

/**
 * Generate structured Cloudinary public_id
 * Example: zenemoo/opportunities/odia-ai-voice-data/banner
 */
export const generateCloudinaryPublicId = (folder = 'zenemoo/team', entityTitle = '', assetType = 'image') => {
  const cleanFolder = folder.replace(/\/+$/, '');
  const cleanSlug = formatSeoSlug(entityTitle || assetType);
  const timestamp = Date.now().toString().slice(-4);
  return `${cleanFolder}/${cleanSlug}-${timestamp}`;
};

/**
 * Generate Contextual Alt Text based on asset type and entity context
 */
export const generateAutoAltText = ({
  entityType = 'general',
  entityTitle = '',
  assetType = 'image',
  providedAlt = '',
}) => {
  if (providedAlt && providedAlt.trim().length > 3) {
    return providedAlt.trim();
  }

  const title = entityTitle.trim();

  switch (entityType.toLowerCase()) {
    case 'logo':
      return 'Zenemoo official logo';
    case 'favicon':
      return 'Zenemoo official favicon icon';
    case 'opportunity':
    case 'program':
      if (assetType === 'banner') {
        return title ? `Zenemoo ${title} Opportunity Banner` : 'Zenemoo Program Opportunity Banner';
      }
      if (assetType === 'poster') {
        return title ? `Zenemoo ${title} Program Poster` : 'Zenemoo AI Project Poster';
      }
      return title ? `Zenemoo ${title} AI Data Collection Project` : 'Zenemoo AI Data Collection Project';
    case 'team':
    case 'profile':
      return title ? `Zenemoo Team Member — ${title}` : 'Zenemoo Specialized AI Data Team Member';
    case 'partner':
      return title ? `Zenemoo Enterprise Partner Logo — ${title}` : 'Zenemoo Partner Enterprise Logo';
    case 'service':
      return title ? `Zenemoo ${title} AI Data Service` : 'Zenemoo Multilingual AI Data Service';
    case 'blog':
    case 'article':
      return title ? `Zenemoo AI Article — ${title}` : 'Zenemoo Enterprise AI Insights';
    default:
      return title ? `Zenemoo AI Data Solution — ${title}` : 'Zenemoo Enterprise AI Data Solutions';
  }
};

/**
 * Generate Auto Image Title
 */
export const generateAutoTitle = ({ entityTitle = '', assetType = 'image', providedTitle = '' }) => {
  if (providedTitle && providedTitle.trim().length > 2) {
    return providedTitle.trim();
  }
  const title = entityTitle.trim();
  if (title) {
    return `Zenemoo ${title} (${assetType})`;
  }
  return 'Zenemoo Enterprise AI Visual Asset';
};

/**
 * Generate Auto Image Description
 */
export const generateAutoDescription = ({ entityTitle = '', assetType = 'image', providedDesc = '' }) => {
  if (providedDesc && providedDesc.trim().length > 5) {
    return providedDesc.trim();
  }
  const title = entityTitle.trim();
  if (title) {
    return `Official ${assetType} visual asset for ${title} provided by Zenemoo Enterprise AI Solutions.`;
  }
  return 'Official visual asset for Zenemoo enterprise language & AI data solutions.';
};

/**
 * Build complete SEO metadata object for upload/update controllers
 */
export const buildImageSeoMetadata = ({
  originalName = '',
  entityType = 'general',
  entityId = '',
  entityTitle = '',
  assetType = 'image',
  altText = '',
  title = '',
  description = '',
  caption = '',
  cloudinaryResult = {},
}) => {
  const seoFilename = generateSeoFilename(originalName, entityTitle, assetType);
  const autoAlt = generateAutoAltText({ entityType, entityTitle, assetType, providedAlt: altText });
  const autoTitle = generateAutoTitle({ entityTitle, assetType, providedTitle: title });
  const autoDesc = generateAutoDescription({ entityTitle, assetType, providedDesc: description });
  const autoCaption = caption || `${autoTitle} — Zenemoo Data Solutions`;

  return {
    entity_type: entityType,
    entity_id: entityId || null,
    asset_type: assetType,
    original_filename: originalName || 'image.jpg',
    seo_filename: seoFilename,
    alt_text: autoAlt,
    title: autoTitle,
    description: autoDesc,
    caption: autoCaption,
    cloudinary_public_id: cloudinaryResult.public_id || '',
    cloudinary_secure_url: cloudinaryResult.secure_url || cloudinaryResult.url || '',
    public_id: cloudinaryResult.public_id || '',
    image_url: cloudinaryResult.secure_url || cloudinaryResult.url || '',
    asset_id: cloudinaryResult.asset_id || cloudinaryResult.public_id || '',
    width: cloudinaryResult.width || 0,
    height: cloudinaryResult.height || 0,
    format: cloudinaryResult.format || 'jpg',
    file_size: cloudinaryResult.bytes || 0,
    bytes: cloudinaryResult.bytes || 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};
