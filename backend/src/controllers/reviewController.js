import { supabase } from '../config/supabase.js';
import crypto from 'crypto';

/**
 * Computes a SHA-256 fingerprint for a review to detect duplicates
 */
const computeReviewFingerprint = (name = '', reviewerType = '', rating = 5, reviewText = '') => {
  const normName = String(name).trim().replace(/\s+/g, ' ').toLowerCase();
  const normType = String(reviewerType).trim().replace(/\s+/g, ' ').toLowerCase();
  const normRating = String(rating);
  const normText = String(reviewText).trim().replace(/\s+/g, ' ').toLowerCase();
  const raw = `${normName}|${normType}|${normRating}|${normText}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
};

/**
 * 1. GET /api/reviews
 * Public: Fetch published (is_visible = true) reviews ordered newest first
 */
export const getPublicReviews = async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('reviews')
      .select('id, review_id, review_slug, name, reviewer_type, rating, review_text, is_visible, created_at, updated_at', { count: 'exact' })
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      status: 'success',
      data: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. POST /api/reviews
 * Public: Submit a new review (enters moderation queue with is_visible = false)
 */
export const submitReview = async (req, res, next) => {
  try {
    const { name, reviewer_type, rating, review_text } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const cleanName = String(name).replace(/<[^>]*>?/gm, '').trim().substring(0, 100);
    const cleanType = String(reviewer_type || 'Candidate').replace(/<[^>]*>?/gm, '').trim().substring(0, 50);
    const reviewText = typeof review_text === 'string'
      ? review_text.replace(/<[^>]*>?/gm, '').trim().substring(0, 2000)
      : '';
    const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));

    const generatedReviewId = `REV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const reviewSlug = `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;
    const fingerprint = computeReviewFingerprint(cleanName, cleanType, numRating, reviewText);

    const newRecord = {
      review_id: generatedReviewId,
      review_slug: reviewSlug,
      name: cleanName,
      reviewer_type: cleanType,
      rating: numRating,
      review_text: reviewText,
      review_fingerprint: fingerprint,
      is_visible: false, // Held for admin moderation
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('reviews')
      .insert([newRecord])
      .select();

    // Fallback if review_fingerprint column is not in DB schema
    if (error && error.message?.includes('review_fingerprint')) {
      const fallbackRecord = { ...newRecord };
      delete fallbackRecord.review_fingerprint;
      const fallbackRes = await supabase.from('reviews').insert([fallbackRecord]).select();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const saved = data && data.length > 0 ? data[0] : newRecord;
    return res.status(201).json({
      status: 'success',
      data: saved,
      message: 'Review submitted successfully. It will be published after moderation review.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET /api/reviews/admin/all
 * Admin: Fetch ALL reviews (including pending) with duplicate analysis
 */
export const getAdminReviews = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const items = data || [];

    // Duplicate detection for admin visibility
    const fingerprintCounts = {};
    const nameTextCounts = {};

    items.forEach((item) => {
      if (item.review_fingerprint) {
        fingerprintCounts[item.review_fingerprint] = (fingerprintCounts[item.review_fingerprint] || 0) + 1;
      }
      const normName = (item.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const normText = (item.review_text || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const key = `${normName}|${normText}`;
      nameTextCounts[key] = (nameTextCounts[key] || 0) + 1;
    });

    const enriched = items.map((item) => {
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

    return res.json({
      status: 'success',
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. PUT /api/reviews/admin/:id
 * Admin: Update review details or toggle visibility
 */
export const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    if (updates.review_text !== undefined) {
      updates.review_text = typeof updates.review_text === 'string'
        ? updates.review_text.replace(/<[^>]*>?/gm, '').trim()
        : '';
    }

    // Recompute fingerprint if text/name/rating updated
    if (updates.name !== undefined || updates.reviewer_type !== undefined || updates.rating !== undefined || updates.review_text !== undefined) {
      const normName = updates.name !== undefined ? updates.name : '';
      const normType = updates.reviewer_type !== undefined ? updates.reviewer_type : '';
      const normRating = updates.rating !== undefined ? updates.rating : 5;
      const normText = updates.review_text !== undefined ? updates.review_text : '';
      updates.review_fingerprint = computeReviewFingerprint(normName, normType, normRating, normText);
    }

    let { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .or(`id.eq.${id},review_id.eq.${id}`)
      .select();

    if (error && error.message?.includes('review_fingerprint')) {
      delete updates.review_fingerprint;
      const fallback = await supabase
        .from('reviews')
        .update(updates)
        .or(`id.eq.${id},review_id.eq.${id}`)
        .select();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      status: 'success',
      data: data && data.length > 0 ? data[0] : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. DELETE /api/reviews/admin/:id
 * Admin: Delete review permanently
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('reviews')
      .delete()
      .or(`id.eq.${id},review_id.eq.${id}`);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      status: 'success',
      message: 'Review deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. POST /api/reviews/admin/publish-all-pending
 * Admin: Publish all pending reviews
 */
export const publishAllPending = async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('reviews')
      .update({ is_visible: true, updated_at: now })
      .eq('is_visible', false)
      .select('id');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      status: 'success',
      count: data ? data.length : 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. POST /api/reviews/admin/bulk-publish
 * Admin: Bulk publish selected reviews
 */
export const bulkPublish = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ status: 'success', count: 0 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('reviews')
      .update({ is_visible: true, updated_at: now })
      .in('id', ids)
      .select('id');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      status: 'success',
      count: data ? data.length : 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. POST /api/reviews/admin/bulk-delete
 * Admin: Bulk delete selected reviews
 */
export const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ status: 'success', count: 0 });
    }

    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .in('id', ids)
      .select('id');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      status: 'success',
      count: data ? data.length : 0,
    });
  } catch (err) {
    next(err);
  }
};
