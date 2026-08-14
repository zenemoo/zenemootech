import { supabase } from './supabaseClient';

export interface ReviewItem {
  id: string;
  review_id: string;
  name: string;
  reviewer_type: 'contributor' | 'client' | string;
  rating: number;
  review_text?: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at?: string | null;
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
 * Public API: Fetch published (visible) reviews directly from Supabase ordered newest first.
 * Database is the SINGLE SOURCE OF TRUTH. No fake/demo data or local storage fallbacks.
 */
export const getPublicVisibleReviews = async (): Promise<ReviewItem[]> => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('is_visible', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch public reviews error:', error);
    throw new Error(error.message || 'Unable to fetch reviews from database.');
  }

  return (data as ReviewItem[]) || [];
};

/**
 * Admin API: Fetch ALL reviews directly from Supabase ordered newest first.
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

  return (data as ReviewItem[]) || [];
};

/**
 * Public API: Submit new review directly to Supabase.
 * - Validates input
 * - Generates unique review_id (ZEN-REV-XXXX-XXXX)
 * - Sets default is_visible = false (Pending/Hidden)
 * - Retries if review_id collision occurs
 * - Throws Error if database insertion fails
 */
export const submitPublicReview = async (reviewData: {
  name: string;
  reviewer_type: string;
  rating: number;
  review_text?: string;
}): Promise<ReviewItem> => {
  // Validate inputs
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

  // Insert into Supabase with collision retry
  let attempts = 0;
  let lastError: any = null;

  while (attempts < 3) {
    attempts++;
    const review_id = generateUniqueReviewId();

    const payload: any = {
      review_id,
      review_slug: review_id.toLowerCase(),
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

    // Fallback if review_slug column is missing in a fresh table
    if (error && error.message?.includes('review_slug') && error.message?.includes('does not exist')) {
      delete payload.review_slug;
      const res = await supabase
        .from('reviews')
        .insert([payload])
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (!error && data) {
      return data as ReviewItem;
    }

    lastError = error;
    console.error(`Supabase review insertion attempt ${attempts} failed:`, error);

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
};
