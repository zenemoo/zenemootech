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

const LOCAL_STORAGE_KEY = 'zenemoo_reviews_db';

// Initial seed reviews shown if database is fresh / empty
const INITIAL_SEED_REVIEWS: ReviewItem[] = [
  {
    id: 'rev_seed_1',
    review_id: 'ZEN-REV-A7k9-X2m4',
    name: 'Ramesh Kumar',
    reviewer_type: 'contributor',
    rating: 5,
    review_text: 'Great platform to work with. Clear instructions, timely payments, and supportive team.',
    is_visible: true,
    created_at: '2025-05-10T10:30:00.000Z',
  },
  {
    id: 'rev_seed_2',
    review_id: 'ZEN-REV-P4z8-K9q1',
    name: 'Priya Sharma',
    reviewer_type: 'client',
    rating: 5,
    review_text: 'Zenemoo delivers high-quality work and maintains excellent communication throughout projects.',
    is_visible: true,
    created_at: '2025-05-08T14:15:00.000Z',
  },
  {
    id: 'rev_seed_3',
    review_id: 'ZEN-REV-B3m1-W8r7',
    name: 'Ankit Verma',
    reviewer_type: 'contributor',
    rating: 5,
    review_text: 'Professional team and smooth workflow. Highly recommended for AI data projects.',
    is_visible: true,
    created_at: '2025-05-05T09:00:00.000Z',
  },
  {
    id: 'rev_seed_4',
    review_id: 'ZEN-REV-L9v4-T2n8',
    name: 'Sunita Mohanty',
    reviewer_type: 'contributor',
    rating: 4,
    review_text: 'Very structured datasets and clear guidelines for speech annotation. Enjoyed working with the team.',
    is_visible: true,
    created_at: '2025-04-28T16:45:00.000Z',
  },
  {
    id: 'rev_seed_5',
    review_id: 'ZEN-REV-E5x2-J6k3',
    name: 'Rajesh Das',
    reviewer_type: 'client',
    rating: 5,
    review_text: 'Exceptionally accurate Odia and Hindi transcription data delivered ahead of deadline.',
    is_visible: true,
    created_at: '2025-04-20T11:20:00.000Z',
  },
];

// Helper: Generate unique Review ID in ZEN-REV-XXXX-XXXX format
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

// Helper: Read local storage reviews cache
const getLocalReviews = (): ReviewItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  // If local storage is empty, initialize with seed reviews
  saveLocalReviews(INITIAL_SEED_REVIEWS);
  return INITIAL_SEED_REVIEWS;
};

// Helper: Save to local storage reviews cache
const saveLocalReviews = (list: ReviewItem[]): ReviewItem[] => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
  return list;
};

// Public API: Fetch published (visible) reviews ordered newest first
export const getPublicVisibleReviews = async (): Promise<ReviewItem[]> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as ReviewItem[];
    }
  } catch (err: any) {
    console.warn('Direct Supabase fetch public reviews notice:', err.message);
  }

  // Fallback to visible local cache
  const local = getLocalReviews();
  return local.filter((r) => r.is_visible);
};

// Admin API: Fetch all reviews (both visible and hidden) ordered newest first
export const getAllReviewsForAdmin = async (): Promise<ReviewItem[]> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      saveLocalReviews(data as ReviewItem[]);
      return data as ReviewItem[];
    }
  } catch (err: any) {
    console.warn('Direct Supabase fetch all reviews notice:', err.message);
  }

  return getLocalReviews();
};

// Public API: Submit new review (default is_visible = false)
export const submitPublicReview = async (reviewData: {
  name: string;
  reviewer_type: string;
  rating: number;
  review_text?: string;
}): Promise<ReviewItem> => {
  const review_id = generateUniqueReviewId();
  const now = new Date().toISOString();

  const newRecord: Partial<ReviewItem> = {
    review_id,
    name: reviewData.name.trim(),
    reviewer_type: reviewData.reviewer_type,
    rating: reviewData.rating,
    review_text: reviewData.review_text ? reviewData.review_text.trim() : null,
    is_visible: false,
    created_at: now,
    updated_at: now,
  };

  let savedItem: ReviewItem | null = null;

  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert([newRecord])
      .select()
      .single();

    if (!error && data) {
      savedItem = data as ReviewItem;
    }
  } catch (err: any) {
    console.warn('Direct Supabase insert review notice:', err.message);
  }

  if (!savedItem) {
    savedItem = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...newRecord,
    } as ReviewItem;
  }

  // Update local storage
  const current = getLocalReviews();
  saveLocalReviews([savedItem, ...current]);

  return savedItem;
};

// Admin API: Toggle review visibility state
export const toggleReviewVisibility = async (id: string, newVisibility: boolean): Promise<ReviewItem[]> => {
  const now = new Date().toISOString();

  try {
    await supabase
      .from('reviews')
      .update({ is_visible: newVisibility, updated_at: now })
      .or(`id.eq.${id},review_id.eq.${id}`);
  } catch (err: any) {
    console.warn('Direct Supabase toggle review visibility notice:', err.message);
  }

  const local = getLocalReviews().map((r) => {
    if (r.id === id || r.review_id === id) {
      return { ...r, is_visible: newVisibility, updated_at: now };
    }
    return r;
  });

  saveLocalReviews(local);
  return getAllReviewsForAdmin();
};

// Admin API: Delete review
export const deleteReviewFromApi = async (id: string): Promise<ReviewItem[]> => {
  try {
    await supabase
      .from('reviews')
      .delete()
      .or(`id.eq.${id},review_id.eq.${id}`);
  } catch (err: any) {
    console.warn('Direct Supabase delete review notice:', err.message);
  }

  const local = getLocalReviews().filter((r) => r.id !== id && r.review_id !== id);
  saveLocalReviews(local);
  return getAllReviewsForAdmin();
};
