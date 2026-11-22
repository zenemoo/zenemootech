import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cloudinaryService } from '../services/cloudinaryService.js';
import { supabaseService } from '../services/supabaseService.js';
import { toBrandedCdnUrl, toCloudinaryDirectUrl } from '../utils/cdnHelper.js';
import { generateImageSeoMetadata } from '../services/adminHrAiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERSISTENT_GALLERY_PATH = path.join(__dirname, '../database/gallery_images.json');

// In-Memory Public Cache (15-Minute TTL for zero Supabase egress on repeated visits/Googlebot)
let galleryCache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 15 * 60 * 1000;

export const invalidateGalleryCache = () => {
  galleryCache = { data: null, timestamp: 0 };
};

// Helper: load local JSON file
const loadDiskGallery = () => {
  try {
    if (fs.existsSync(PERSISTENT_GALLERY_PATH)) {
      const raw = fs.readFileSync(PERSISTENT_GALLERY_PATH, 'utf-8');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn('[Gallery] Error reading local gallery_images.json:', err.message);
  }
  return [];
};

// Helper: save local JSON file
const saveDiskGallery = (items) => {
  try {
    const dir = path.dirname(PERSISTENT_GALLERY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PERSISTENT_GALLERY_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Gallery] Error writing local gallery_images.json:', err.message);
  }
};

// Helper: generate clean URL slug from title
const generateSlug = (title) => {
  if (!title) return `poster-${Date.now()}`;
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * GET /api/gallery
 * Public list of all SEO gallery images & posters.
 * Uses 15-minute in-memory cache to guarantee zero-waste egress on Supabase.
 */
export const getGalleryImages = async (req, res) => {
  try {
    const now = Date.now();
    const { category, search, status } = req.query;

    // 1. Check in-memory cache
    if (galleryCache.data && now - galleryCache.timestamp < CACHE_TTL_MS) {
      let filtered = [...galleryCache.data];
      if (status && status !== 'all') {
        filtered = filtered.filter((i) => (i.status || 'active') === status);
      }
      if (category && category !== 'all' && category !== 'All Media') {
        filtered = filtered.filter((i) => i.category === category);
      }
      if (search) {
        const q = String(search).toLowerCase().trim();
        filtered = filtered.filter(
          (i) =>
            (i.title || '').toLowerCase().includes(q) ||
            (i.caption || '').toLowerCase().includes(q) ||
            (i.tags || []).some((t) => String(t).toLowerCase().includes(q))
        );
      }
      return res.status(200).json({ success: true, count: filtered.length, data: filtered, cached: true });
    }

    // 2. Fetch from Supabase with graceful fallback
    let dbItems = [];
    let isDbSuccess = false;

    try {
      // Primary: query dedicated public.gallery_images table
      const resGallery = await supabaseService.selectAll('gallery_images', 'created_at', false);
      if (Array.isArray(resGallery) && resGallery.length > 0) {
        dbItems = [...resGallery];
        isDbSuccess = true;
      }
    } catch (e1) {
      console.warn('[Gallery] Supabase gallery_images query note:', e1.message);
    }

    // Secondary / Fallback: query site_branding table for any gallery posters
    try {
      const resBranding = await supabaseService.selectAll('site_branding', 'created_at', false);
      if (Array.isArray(resBranding)) {
        const brandingPosters = resBranding
          .filter((r) => r.asset_type === 'gallery_poster' || r.asset_type === 'gallery_image')
          .map((r) => ({
            id: r.id,
            title: r.asset_name || 'Zenemoo Poster',
            slug: generateSlug(r.asset_name || 'poster'),
            category: 'Festivals & Greetings',
            image_url: r.cloudinary_secure_url || r.url,
            cdn_url: toBrandedCdnUrl(r.cloudinary_secure_url || r.url),
            cloudinary_public_id: r.cloudinary_public_id || '',
            alt_text: r.alt_text || r.asset_name,
            caption: r.caption || r.asset_name,
            tags: ['Zenemoo', 'Festival'],
            aspect_ratio: '1:1',
            width: r.width || 1080,
            height: r.height || 1080,
            file_size_formatted: r.file_size_formatted || 'N/A',
            status: r.is_active ? 'active' : 'draft',
            created_at: r.created_at,
            updated_at: r.updated_at,
          }));
        if (brandingPosters.length > 0) {
          // Merge avoiding duplicates by image_url or id
          const existingUrls = new Set(dbItems.map((d) => d.image_url || d.cdn_url));
          brandingPosters.forEach((bp) => {
            if (!existingUrls.has(bp.image_url) && !existingUrls.has(bp.cdn_url)) {
              dbItems.push(bp);
            }
          });
          isDbSuccess = true;
        }
      }
    } catch (e2) {}

    // 3. Merge with local persistent file to prevent data loss
    const diskItems = loadDiskGallery();
    const idMap = new Map();

    // Add disk items first
    diskItems.forEach((item) => {
      if (item && item.id) idMap.set(item.id, item);
    });

    // Overwrite / add DB items
    dbItems.forEach((item) => {
      if (item && item.id) {
        idMap.set(item.id, {
          ...item,
          cdn_url: item.cdn_url || toBrandedCdnUrl(item.image_url),
        });
      }
    });

    const mergedList = Array.from(idMap.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    // Save back to disk and cache in memory
    saveDiskGallery(mergedList);
    galleryCache = { data: mergedList, timestamp: now };

    let filtered = [...mergedList];
    if (status && status !== 'all') {
      filtered = filtered.filter((i) => (i.status || 'active') === status);
    }
    if (category && category !== 'all' && category !== 'All Media') {
      filtered = filtered.filter((i) => i.category === category);
    }
    if (search) {
      const q = String(search).toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          (i.title || '').toLowerCase().includes(q) ||
          (i.caption || '').toLowerCase().includes(q) ||
          (i.tags || []).some((t) => String(t).toLowerCase().includes(q))
      );
    }

    return res.status(200).json({ success: true, count: filtered.length, data: filtered, cached: false });
  } catch (err) {
    console.error('getGalleryImages Error:', err);
    const diskFallback = loadDiskGallery();
    return res.status(200).json({ success: true, count: diskFallback.length, data: diskFallback, cached: false });
  }
};

/**
 * POST /api/gallery
 * Admin: Upload or create a new SEO gallery image / poster
 */
export const createGalleryImage = async (req, res) => {
  try {
    const title = (req.body?.title || '').trim();
    const category = (req.body?.category || 'Festival & Greetings').trim();
    const caption = (req.body?.caption || '').trim();
    const altText = (req.body?.alt_text || req.body?.altText || title).trim();
    let tags = [];
    if (Array.isArray(req.body?.tags)) tags = req.body.tags;
    else if (typeof req.body?.tags === 'string') {
      tags = req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    if (!title) {
      return res.status(400).json({ success: false, message: 'Image / Poster title is required.' });
    }

    let finalImageUrl = (req.body?.image_url || req.body?.imageUrl || '').trim();
    let cloudinaryPubId = (req.body?.cloudinary_public_id || req.body?.public_id || '').trim();
    let width = Number(req.body?.width) || 1080;
    let height = Number(req.body?.height) || 1080;
    let format = 'jpg';
    let sizeFormatted = '150 KB';

    // Handle File Upload to Cloudinary
    if (req.file && req.file.buffer) {
      const cleanSlug = generateSlug(title);
      const uploadRes = await cloudinaryService.uploadStream(req.file.buffer, 'zenemoo/posters', {
        public_id: `zenemoo_poster_${cleanSlug}_${Date.now()}`,
        resource_type: 'image',
      });

      if (!uploadRes || !uploadRes.secure_url) {
        throw new Error('Cloudinary failed to return a secure upload URL.');
      }

      finalImageUrl = uploadRes.secure_url;
      cloudinaryPubId = uploadRes.public_id;
      width = uploadRes.width || width;
      height = uploadRes.height || height;
      format = uploadRes.format || 'jpg';
      if (uploadRes.bytes) {
        sizeFormatted = (uploadRes.bytes / 1024).toFixed(1) + ' KB';
      }
    }

    if (!finalImageUrl) {
      return res.status(400).json({ success: false, message: 'Please select an image file or provide a valid image URL.' });
    }

    const cdnUrl = toBrandedCdnUrl(finalImageUrl);
    const slug = generateSlug(title);
    const aspectRatio = width && height ? (width === height ? '1:1' : width > height ? '16:9' : '4:5') : '1:1';

    const newRecord = {
      title,
      slug,
      category,
      image_url: finalImageUrl,
      cloudinary_public_id: cloudinaryPubId,
      cdn_url: cdnUrl,
      alt_text: altText,
      caption: caption || `Official ${category} poster by Zenemoo: ${title}`,
      tags: tags.length ? tags : ['Zenemoo', category],
      aspect_ratio: aspectRatio,
      width,
      height,
      file_size_formatted: sizeFormatted,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Try insert into public.gallery_images in Supabase (omit id so Supabase generates UUID)
    try {
      const dbRes = await supabaseService.insert('gallery_images', newRecord);
      if (dbRes && dbRes.id) {
        newRecord.id = dbRes.id;
      }
    } catch (dbErr) {
      console.warn('[Gallery] Supabase gallery_images insert failed, trying site_branding fallback:', dbErr.message);
      // 2. Fallback: try inserting into site_branding table
      try {
        const brandingPayload = {
          asset_type: 'gallery_poster',
          asset_name: title,
          cloudinary_public_id: cloudinaryPubId,
          cloudinary_secure_url: finalImageUrl,
          resource_type: 'image',
          format,
          width,
          height,
          version: String(Date.now()),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: req.user?.email || 'admin',
        };
        const sbRes = await supabaseService.insert('site_branding', brandingPayload);
        if (sbRes && sbRes.id) newRecord.id = sbRes.id;
      } catch (sbErr) {
        console.warn('[Gallery] Supabase insert note (using disk storage):', sbErr.message);
      }
    }

    // If no DB id was assigned, use fallback ID for local disk
    if (!newRecord.id) {
      newRecord.id = `poster_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // 3. Save to local persistent file
    const currentList = loadDiskGallery();
    const updatedList = [newRecord, ...currentList.filter((i) => i.id !== newRecord.id)];
    saveDiskGallery(updatedList);
    invalidateGalleryCache();

    return res.status(201).json({
      success: true,
      message: 'Poster uploaded and indexed successfully!',
      data: newRecord,
    });
  } catch (err) {
    console.error('createGalleryImage Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create gallery poster.' });
  }
};

/**
 * DELETE /api/gallery/:id
 * Admin: Delete a gallery poster from Cloudinary, Supabase & disk
 */
export const deleteGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'ID required' });

    const currentList = loadDiskGallery();
    const target = currentList.find((i) => i.id === id);

    // 1. Delete media from Cloudinary if public_id exists
    const pubId = target?.cloudinary_public_id;
    if (pubId) {
      try {
        await cloudinaryService.deleteMedia(pubId);
      } catch (cErr) {
        console.warn('Cloudinary poster deletion note:', cErr.message);
      }
    }

    // 2. Delete from Supabase
    try {
      await supabaseService.delete('gallery_images', id);
    } catch (e1) {
      try {
        await supabaseService.delete('site_branding', id);
      } catch (e2) {}
    }

    // 3. Delete from local JSON
    const updatedList = currentList.filter((i) => i.id !== id);
    saveDiskGallery(updatedList);
    invalidateGalleryCache();

    return res.status(200).json({ success: true, message: 'Poster deleted successfully.' });
  } catch (err) {
    console.error('deleteGalleryImage Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete poster.' });
  }
};

/**
 * POST /api/gallery/generate-seo
 * Admin: Generate SEO Caption, Alt Text and Tags using Zenemoo AI
 */
export const generateGallerySeo = async (req, res) => {
  try {
    const { title = '', category = 'Festivals & Greetings' } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Title is required for SEO generation.' });
    }
    const meta = await generateImageSeoMetadata({
      title: String(title).trim(),
      category: category ? String(category).trim() : 'Festivals & Greetings',
    });
    return res.status(200).json({ success: true, data: meta });
  } catch (err) {
    console.error('generateGallerySeo Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to generate SEO.' });
  }
};

