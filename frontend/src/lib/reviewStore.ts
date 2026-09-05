import { supabase } from './supabaseClient';

export interface ReviewItem {
  id: string;
  review_id: string;
  review_slug?: string | null;
  review_fingerprint?: string | null;
  name: string;
  reviewer_type: 'contributor' | 'client' | string;
  rating: number;
  review_text?: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at?: string | null;
  isPossibleDuplicate?: boolean;
}

// Helper: Generate unique Review ID in ZEN-REV-XXXX-XXXX format (mix of uppercase, lowercase, numbers)
export const generateUniqueReviewId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ZEN-REV-${part1}-${part2}`;
};

/**
 * Compute cryptographic content fingerprint (SHA-256) from normalized fields:
 * - Normalized Name (trimmed, internal spaces collapsed, case-insensitive)
 * - Reviewer Type ('contributor' or 'client')
 * - Rating (1-5)
 * - Normalized Review Text (trimmed, collapsed, case-insensitive) or 'no_text'
 */
export const computeReviewFingerprint = async (
  name: string,
  reviewerType: string,
  rating: number,
  reviewText?: string | null
): Promise<string> => {
  const normName = name.trim().replace(/\s+/g, ' ').toLowerCase();
  const normType = (reviewerType || '').trim().toLowerCase();
  const normRating = Math.min(5, Math.max(1, Math.round(rating || 0)));
  const normText = reviewText && reviewText.trim() ? reviewText.trim().replace(/\s+/g, ' ').toLowerCase() : 'no_text';

  const rawString = `${normName}|${normType}|${normRating}|${normText}`;

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(rawString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('SubtleCrypto unavailable, falling back to string hash:', e);
    }
  }

  // Fallback string hash
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fp_${Math.abs(hash)}_${rawString.length}`;
};

let publicReviewsMemoryCache: { data: ReviewItem[] | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const PUBLIC_REVIEWS_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes client cache

export const invalidatePublicReviewsCache = () => {
  publicReviewsMemoryCache = { data: null, timestamp: 0 };
};

/**
 * Public API: Fetch published (visible) reviews directly from Supabase ordered newest first.
 * Database is the SINGLE SOURCE OF TRUTH. No fake/demo data or local storage fallbacks.
 */
export const getPublicVisibleReviews = async (forceRefresh = false): Promise<ReviewItem[]> => {
  const now = Date.now();
  if (!forceRefresh && publicReviewsMemoryCache.data && now - publicReviewsMemoryCache.timestamp < PUBLIC_REVIEWS_CACHE_TTL_MS) {
    return publicReviewsMemoryCache.data;
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('id, review_id, review_slug, name, reviewer_type, rating, review_text, is_visible, created_at, updated_at')
    .eq('is_visible', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch public reviews error:', error);
    throw new Error(error.message || 'Unable to fetch reviews from database.');
  }

  const list = (data as ReviewItem[]) || [];
  publicReviewsMemoryCache = { data: list, timestamp: now };
  return list;
};

/**
 * Admin API: Fetch ALL reviews directly from Supabase ordered newest first.
 * Marks duplicate records with `isPossibleDuplicate = true` for Admin inspection.
 */
export const getAllReviewsForAdmin = async (): Promise<ReviewItem[]> => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch admin reviews error:', error);
    throw new Error(error.message || 'Unable to fetch admin reviews from database.');
  }

  const items = (data as ReviewItem[]) || [];

  // Identify duplicate fingerprints or duplicate (name + review_text) for Admin indicator
  const fingerprintCounts: Record<string, number> = {};
  const nameTextCounts: Record<string, number> = {};

  items.forEach((item) => {
    if (item.review_fingerprint) {
      fingerprintCounts[item.review_fingerprint] = (fingerprintCounts[item.review_fingerprint] || 0) + 1;
    }
    const normName = (item.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const normText = (item.review_text || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const key = `${normName}|${normText}`;
    nameTextCounts[key] = (nameTextCounts[key] || 0) + 1;
  });

  return items.map((item) => {
    const normName = (item.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const normText = (item.review_text || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const key = `${normName}|${normText}`;

    const isDupFingerprint = item.review_fingerprint && fingerprintCounts[item.review_fingerprint] > 1;
    const isDupNameText = nameTextCounts[key] > 1;

    return {
      ...item,
      isPossibleDuplicate: Boolean(isDupFingerprint || isDupNameText),
    };
  });
};

/**
 * Public API: Submit new review directly to Supabase with Duplicate Prevention.
 * - Validates input
 * - Normalizes data & computes review_fingerprint (SHA-256)
 * - Performs targeted Supabase query to check if duplicate content exists
 * - Throws Duplicate Error if identical content has already been submitted by the same person
 * - Generates unique review_id (ZEN-REV-XXXX-XXXX)
 * - Sets default is_visible = false (Pending/Hidden)
 */
export const submitPublicReview = async (reviewData: {
  name: string;
  reviewer_type: string;
  rating: number;
  review_text?: string;
}): Promise<ReviewItem> => {
  // 1. Validate inputs
  const cleanName = reviewData.name ? reviewData.name.trim() : '';
  if (!cleanName) {
    throw new Error('Full Name is required');
  }

  const cleanType = (reviewData.reviewer_type || '').toLowerCase();
  if (cleanType !== 'contributor' && cleanType !== 'client') {
    throw new Error('Reviewer type must be contributor or client');
  }

  const cleanRating = Math.min(5, Math.max(1, Math.round(reviewData.rating || 0)));
  if (cleanRating < 1 || cleanRating > 5) {
    throw new Error('Rating must be between 1 and 5 stars');
  }

  const cleanText = reviewData.review_text && reviewData.review_text.trim() ? reviewData.review_text.trim() : null;

  // 2. Compute SHA-256 fingerprint from normalized fields
  const fingerprint = await computeReviewFingerprint(cleanName, cleanType, cleanRating, cleanText);

  // 3. Check Supabase database for existing identical review fingerprint
  try {
    const { data: existingRecords, error: checkError } = await supabase
      .from('reviews')
      .select('id, review_id, name, created_at')
      .eq('review_fingerprint', fingerprint)
      .limit(1);

    if (!checkError && existingRecords && existingRecords.length > 0) {
      const dupErr: any = new Error(
        'Looks like you have already submitted this review. Please share a different experience if you would like to submit another review.'
      );
      dupErr.isDuplicate = true;
      throw dupErr;
    }
  } catch (e: any) {
    if (e.isDuplicate) throw e;
    console.warn('Fingerprint check warning (continuing insertion):', e);
  }

  // 4. Insert into Supabase with collision retry
  let attempts = 0;
  let lastError: any = null;

  while (attempts < 3) {
    attempts++;
    const review_id = generateUniqueReviewId();

    const payload: any = {
      review_id,
      review_slug: review_id.toLowerCase(),
      review_fingerprint: fingerprint,
      name: cleanName,
      reviewer_type: cleanType,
      rating: cleanRating,
      review_text: cleanText,
      is_visible: false,
    };

    let { data, error } = await supabase
      .from('reviews')
      .insert([payload])
      .select()
      .single();

    // Fallback if review_slug or review_fingerprint column is missing in a legacy table schema
    if (error && (error.message?.includes('review_fingerprint') || error.message?.includes('review_slug'))) {
      if (error.message?.includes('review_fingerprint')) delete payload.review_fingerprint;
      if (error.message?.includes('review_slug')) delete payload.review_slug;

      const res = await supabase
        .from('reviews')
        .insert([payload])
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (!error && data) {
      invalidatePublicReviewsCache();
      return data as ReviewItem;
    }

    lastError = error;
    console.error(`Supabase review insertion attempt ${attempts} failed:`, error);

    // If error is duplicate fingerprint violation in DB
    if (error && (error.message?.includes('review_fingerprint') || error.details?.includes('review_fingerprint'))) {
      const dupErr: any = new Error(
        'Looks like you have already submitted this review. Please share a different experience if you would like to submit another review.'
      );
      dupErr.isDuplicate = true;
      throw dupErr;
    }

    // If error is not a unique constraint violation on review_id, don't retry
    if (error && !error.message?.includes('review_id') && !error.details?.includes('review_id')) {
      break;
    }
  }

  throw new Error(lastError?.message || "We couldn't submit your review right now. Please try again.");
};

/**
 * Admin API: Toggle review visibility state in Supabase.
 */
export const toggleReviewVisibility = async (id: string, newVisibility: boolean): Promise<ReviewItem> => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('reviews')
    .update({ is_visible: newVisibility, updated_at: now })
    .or(`id.eq.${id},review_id.eq.${id}`)
    .select()
    .single();

  if (error || !data) {
    console.error('Supabase toggle visibility error:', error);
    throw new Error(error?.message || 'Unable to update review visibility. Please try again.');
  }

  invalidatePublicReviewsCache();
  return data as ReviewItem;
};

/**
 * Admin API: Delete review permanently from Supabase.
 */
export const deleteReviewFromApi = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .or(`id.eq.${id},review_id.eq.${id}`);

  if (error) {
    console.error('Supabase delete review error:', error);
    throw new Error(error.message || 'Unable to delete this review. Please try again.');
  }

  invalidatePublicReviewsCache();
};

/**
 * Admin API: Publish ALL pending (hidden) reviews at once in Supabase.
 */
export const publishAllPendingReviews = async (): Promise<number> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('reviews')
    .update({ is_visible: true, updated_at: now })
    .eq('is_visible', false)
    .select('id');

  if (error) {
    console.error('Supabase publish all pending error:', error);
    throw new Error(error.message || 'Unable to publish pending reviews.');
  }

  invalidatePublicReviewsCache();
  return data ? data.length : 0;
};

/**
 * Admin API: Bulk publish selected review IDs in Supabase.
 */
export const bulkPublishReviews = async (ids: string[]): Promise<number> => {
  if (!ids || ids.length === 0) return 0;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('reviews')
    .update({ is_visible: true, updated_at: now })
    .in('id', ids)
    .select('id');

  if (error) {
    console.error('Supabase bulk publish error:', error);
    throw new Error(error.message || 'Unable to publish selected reviews.');
  }

  invalidatePublicReviewsCache();
  return data ? data.length : 0;
};

/**
 * Admin API: Bulk delete selected review IDs in Supabase.
 */
export const bulkDeleteReviews = async (ids: string[]): Promise<number> => {
  if (!ids || ids.length === 0) return 0;
  const { data, error } = await supabase
    .from('reviews')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) {
    console.error('Supabase bulk delete error:', error);
    throw new Error(error.message || 'Unable to delete selected reviews.');
  }

  invalidatePublicReviewsCache();
  return data ? data.length : 0;
};

/**
 * Admin API: Fully update a review item in Supabase (Name, Type, Rating, Message Text, Visibility).
 */
export const updateReviewInApi = async (
  id: string,
  updates: Partial<Pick<ReviewItem, 'name' | 'reviewer_type' | 'rating' | 'review_text' | 'is_visible'>>
): Promise<ReviewItem> => {
  const now = new Date().toISOString();
  const payload: any = {
    ...updates,
    updated_at: now,
  };

  if (
    updates.name !== undefined ||
    updates.reviewer_type !== undefined ||
    updates.rating !== undefined ||
    updates.review_text !== undefined
  ) {
    const normName = updates.name !== undefined ? updates.name : '';
    const normType = updates.reviewer_type !== undefined ? updates.reviewer_type : '';
    const normRating = updates.rating !== undefined ? updates.rating : 5;
    const normText = updates.review_text !== undefined ? updates.review_text : null;
    payload.review_fingerprint = await computeReviewFingerprint(normName, normType, normRating, normText);
  }

  let { data, error } = await supabase
    .from('reviews')
    .update(payload)
    .or(`id.eq.${id},review_id.eq.${id}`)
    .select()
    .single();

  if (error && error.message?.includes('review_fingerprint')) {
    delete payload.review_fingerprint;
    const res = await supabase
      .from('reviews')
      .update(payload)
      .or(`id.eq.${id},review_id.eq.${id}`)
      .select()
      .single();
    data = res.data;
    error = res.error;
  }

  if (error || !data) {
    console.error('Supabase update review error:', error);
    throw new Error(error?.message || 'Unable to update review details. Please try again.');
  }

  invalidatePublicReviewsCache();
  return data as ReviewItem;
};

