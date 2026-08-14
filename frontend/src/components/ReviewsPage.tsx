import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  CheckCircle2,
  Copy,
  Check,
  X,
  Send,
  User,
  Briefcase,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  Users,
  Lock,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import {
  ReviewItem,
  getPublicVisibleReviews,
  submitPublicReview,
} from '../lib/reviewStore';

interface ReviewsPageProps {
  onBack?: () => void;
  onOpenAiDrawer?: () => void;
}

export const ReviewsPage: React.FC<ReviewsPageProps> = ({ onBack, onOpenAiDrawer }) => {
  // Form State
  const [fullName, setFullName] = useState('');
  const [reviewerType, setReviewerType] = useState<'contributor' | 'client' | ''>('');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Validation State
  const [errors, setErrors] = useState<{
    fullName?: string;
    reviewerType?: string;
    rating?: string;
  }>({});

  // Toast / Inline notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Success Screen Modal State
  const [submittedReview, setSubmittedReview] = useState<ReviewItem | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Public Reviews List State (Strict Database Source of Truth)
  const [publicReviews, setPublicReviews] = useState<ReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [publicFilter, setPublicFilter] = useState<'all' | 'contributor' | 'client'>('all');

  // Load public reviews directly from Supabase
  const loadPublicReviews = async () => {
    setLoadingReviews(true);
    setFetchError(null);
    try {
      const data = await getPublicVisibleReviews();
      setPublicReviews(data);
    } catch (e: any) {
      console.error('Failed to load public reviews from Supabase:', e);
      setPublicReviews([]);
      setFetchError(e.message || 'Unable to load reviews from database.');
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadPublicReviews();
    window.scrollTo(0, 0);
  }, []);

  // Filter public reviews from database
  const filteredPublicReviews = useMemo(() => {
    return publicReviews.filter((r) => {
      if (publicFilter === 'contributor') {
        return (r.reviewer_type || '').toLowerCase().includes('contributor');
      }
      if (publicFilter === 'client') {
        return (r.reviewer_type || '').toLowerCase().includes('client');
      }
      return true;
    });
  }, [publicReviews, publicFilter]);

  // Form Validation
  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }
    if (!reviewerType) {
      newErrors.reviewerType = 'Please select whether you are a Contributor or Client';
    }
    if (!rating || rating === 0) {
      newErrors.rating = 'Please select an overall rating (1 to 5 stars)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submission (Must strictly succeed in Supabase before showing success modal)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);

    if (!validateForm()) {
      setToastMessage({
        text: 'Please fill in all required fields marked with *',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await submitPublicReview({
        name: fullName,
        reviewer_type: reviewerType,
        rating,
        review_text: reviewText,
      });

      // Database insertion verified!
      setSubmittedReview(created);

      // Reset form fields
      setFullName('');
      setReviewerType('');
      setRating(0);
      setReviewText('');
      setErrors({});
    } catch (err: any) {
      console.error('Review submission database error:', err);
      // DO NOT show success screen if database insert fails
      setToastMessage({
        text: "We couldn't submit your review right now. Please try again.",
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rating-specific thank-you message
  const getRatingThankYouMessage = (starCount: number) => {
    switch (starCount) {
      case 5:
        return "Thank you for giving Zenemoo 5 stars! We're happy to know you had a great experience.";
      case 4:
        return "Thank you for your feedback! We're glad you had a good experience, and we're continuing to improve.";
      case 3:
        return "Thank you for your honest feedback. Your suggestions help us identify areas where we can improve.";
      case 2:
        return "Thank you for sharing your experience. We appreciate your honest feedback and will work to improve.";
      case 1:
        return "Thank you for your honest feedback. We're sorry your experience did not meet expectations. Your feedback will help us improve.";
      default:
        return "Thank you for your feedback!";
    }
  };

  // Copy Review ID to clipboard
  const handleCopyReviewId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // Scroll to Form Card
  const scrollToForm = () => {
    const el = document.getElementById('review-form-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Helpers: Formatting strings cleanly
  const formatReviewText = (text?: string | null) => {
    if (!text || !text.trim()) return null;
    let clean = text.trim();
    // Clean raw JSON arrays if legacy data had them
    if (clean.startsWith('[') && clean.endsWith(']')) {
      try {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          clean = parsed.join(' ');
        }
      } catch (e) {}
    }
    return clean;
  };

  const getInitials = (name: string) => {
    if (!name) return 'ZM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Recent';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 font-sans">
      {/* Top Navigation */}
      <Navbar onBack={onBack} showBackButton={true} onOpenAiDrawer={onOpenAiDrawer} />

      {/* Main Content Area */}
      <main className="relative z-10 pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HERO SECTION & FORM GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-24">
          
          {/* Left Column: Hero Copy & Visual Artwork Card */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-32">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold mb-4 shadow-lg shadow-cyan-500/10">
                <Star className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 animate-pulse" />
                <span>Reviews &amp; Feedback</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold font-display text-white tracking-tight leading-tight">
                Share Your <br />
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">
                  Experience
                </span>
              </h1>

              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-md">
                Your feedback helps Zenemoo grow and build better opportunities for everyone.
              </p>
            </div>

            {/* Visual Artwork Card */}
            <div className="relative rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-8 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden group">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/30 transition-all duration-500" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Floating Stars Artwork Graphic */}
              <div className="relative z-10 space-y-6 text-center py-4">
                <div className="inline-flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-xl shadow-cyan-500/20 backdrop-blur-md">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-6 h-6 text-cyan-400 fill-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  ))}
                </div>

                <div className="text-xs font-mono text-slate-300 space-y-1">
                  <div className="font-bold text-white">Community &amp; Partner Voices</div>
                  <div className="text-[11px] text-slate-400">100% Database-Backed &amp; Moderated Reviews</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Review Submission Form Card */}
          <div className="lg:col-span-7" id="review-form-card">
            <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 relative">
              
              {/* Form Title */}
              <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-md">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-display text-white">Write a Review</h2>
                    <p className="text-xs font-mono text-slate-400">We value your feedback!</p>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-cyan-400 font-bold">* Required</div>
              </div>

              {/* Toast Error Alert Message (Inline Custom Notification) */}
              {toastMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{toastMessage.text}</span>
                  <button onClick={() => setToastMessage(null)} className="ml-auto text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Review Form */}
              <form onSubmit={handleSubmit} className="space-y-7">
                
                {/* 1. Full Name * */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold text-slate-200">
                    1. Full Name <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                      }}
                      className={`w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.04] border text-white placeholder-slate-500 text-sm font-sans focus:outline-none transition-all ${
                        errors.fullName
                          ? 'border-red-500 focus:border-red-400'
                          : 'border-white/10 focus:border-cyan-400 focus:bg-white/[0.06]'
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-[11px] font-mono text-red-400 flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3 h-3" /> {errors.fullName}
                    </p>
                  )}
                </div>

                {/* 2. Review Type * (Two Selectable Cards) */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold text-slate-200">
                    2. You are a <span className="text-cyan-400">*</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Contributor / Worker Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setReviewerType('contributor');
                        if (errors.reviewerType) setErrors((prev) => ({ ...prev, reviewerType: undefined }));
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                        reviewerType === 'contributor'
                          ? 'bg-cyan-500/10 border-cyan-400 shadow-lg shadow-cyan-500/20 text-white'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          reviewerType === 'contributor'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5 pr-4">
                        <div className="text-xs font-bold font-display text-white">Contributor / Worker Review</div>
                        <div className="text-[11px] text-slate-400 font-sans leading-tight">
                          Review as a contributor or worker
                        </div>
                      </div>
                      <div className="absolute top-3.5 right-3.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            reviewerType === 'contributor'
                              ? 'border-cyan-400 bg-cyan-400'
                              : 'border-slate-600 bg-transparent'
                          }`}
                        >
                          {reviewerType === 'contributor' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                      </div>
                    </button>

                    {/* Client / Project Provider Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setReviewerType('client');
                        if (errors.reviewerType) setErrors((prev) => ({ ...prev, reviewerType: undefined }));
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                        reviewerType === 'client'
                          ? 'bg-purple-500/10 border-purple-400 shadow-lg shadow-purple-500/20 text-white'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          reviewerType === 'client'
                            ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5 pr-4">
                        <div className="text-xs font-bold font-display text-white">Client / Project Provider Review</div>
                        <div className="text-[11px] text-slate-400 font-sans leading-tight">
                          Review as a client or project provider
                        </div>
                      </div>
                      <div className="absolute top-3.5 right-3.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            reviewerType === 'client'
                              ? 'border-purple-400 bg-purple-400'
                              : 'border-slate-600 bg-transparent'
                          }`}
                        >
                          {reviewerType === 'client' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                      </div>
                    </button>
                  </div>
                  {errors.reviewerType && (
                    <p className="text-[11px] font-mono text-red-400 flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3 h-3" /> {errors.reviewerType}
                    </p>
                  )}
                </div>

                {/* 3. Overall Rating * (Interactive 1-5 Stars) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono font-bold text-slate-200">
                      3. Overall Rating <span className="text-cyan-400">*</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {rating > 0 ? `${rating} out of 5` : 'Click on a star to rate'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((starIndex) => {
                        const isFilled = starIndex <= (hoverRating || rating);
                        return (
                          <button
                            key={starIndex}
                            type="button"
                            onClick={() => {
                              setRating(starIndex);
                              if (errors.rating) setErrors((prev) => ({ ...prev, rating: undefined }));
                            }}
                            onMouseEnter={() => setHoverRating(starIndex)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 sm:p-2 rounded-xl transition-all duration-200 hover:scale-125 focus:outline-none cursor-pointer"
                            aria-label={`Rate ${starIndex} out of 5 stars`}
                          >
                            <Star
                              className={`w-7 h-7 sm:w-9 sm:h-9 transition-all duration-200 ${
                                isFilled
                                  ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] scale-110'
                                  : 'text-slate-600 hover:text-slate-400'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {errors.rating && (
                    <p className="text-[11px] font-mono text-red-400 flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3 h-3" /> {errors.rating}
                    </p>
                  )}
                </div>

                {/* 4. Overall Review (Optional) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono font-bold text-slate-200">
                      4. Overall Review <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">
                      {reviewText.length} / 1000
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    maxLength={1000}
                    placeholder="Tell us about your experience with Zenemoo..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm font-sans focus:outline-none focus:border-cyan-400 focus:bg-white/[0.06] transition-all resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black font-extrabold font-mono text-sm uppercase tracking-wider transition-all duration-300 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-400/40 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Review...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Review</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Footer Security Note */}
                <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>All reviews are moderated before being published.</span>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* PUBLIC REVIEW DISPLAY SECTION */}
        <div className="space-y-8 border-t border-white/10 pt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display text-white">
                What People Say About <span className="text-cyan-400">Zenemoo</span>
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Verified community feedback from workers, contributors, and project clients.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/10">
              <button
                onClick={() => setPublicFilter('all')}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  publicFilter === 'all'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPublicFilter('contributor')}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  publicFilter === 'contributor'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Contributors
              </button>
              <button
                onClick={() => setPublicFilter('client')}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  publicFilter === 'client'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Clients
              </button>
            </div>
          </div>

          {/* Review Cards Grid or Empty State */}
          {loadingReviews ? (
            <div className="p-12 text-center text-slate-400 font-mono text-xs">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading verified reviews from database...
            </div>
          ) : filteredPublicReviews.length === 0 ? (
            /* PROFESSIONAL EMPTY STATE (Strictly required when database contains zero published reviews) */
            <div className="p-12 text-center text-slate-300 font-mono text-xs glass-panel rounded-3xl border border-white/10 space-y-4 max-w-lg mx-auto shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10">
                <MessageSquare className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold font-display text-white">No reviews yet</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Be the first to share your experience with Zenemoo.
                </p>
              </div>

              <button
                onClick={scrollToForm}
                className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer inline-flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Write a Review</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPublicReviews.map((rev) => {
                const cleanText = formatReviewText(rev.review_text);
                const isContributor = (rev.reviewer_type || '').toLowerCase().includes('contributor');
                const initials = getInitials(rev.name);

                return (
                  <div
                    key={rev.id}
                    className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-cyan-500/30 transition-all duration-300 space-y-4 flex flex-col justify-between group shadow-xl"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Stars + Type Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                            isContributor
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                              : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {isContributor ? 'Contributor' : 'Client'}
                        </span>
                      </div>

                      {/* Review Text (Only rendered if text is present and non-empty) */}
                      {cleanText && (
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans italic whitespace-pre-line">
                          "{cleanText}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Author Row */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono font-bold border ${
                            isContributor
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          }`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="text-xs font-bold font-display text-white">{rev.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{formatDate(rev.created_at)}</div>
                        </div>
                      </div>

                      {/* Short ID Badge */}
                      <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                        {rev.review_id}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* SUCCESS MODAL (Rendered ONLY AFTER Database Insert Succeeds) */}
      {submittedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-cyan-500/40 max-w-md w-full relative space-y-6 text-center shadow-2xl shadow-cyan-500/20">
            
            <button
              onClick={() => setSubmittedReview(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Check Icon */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 text-black flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold font-display text-white">Thank You for Your Feedback!</h3>
              <p className="text-xs font-mono text-slate-300">Your review has been successfully submitted.</p>
            </div>

            {/* Rating Specific Thank You Message */}
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-sans text-cyan-200 leading-relaxed">
              {getRatingThankYouMessage(submittedReview.rating)}
            </div>

            {/* Review ID Copy Card */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Review ID</div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-lg font-mono font-extrabold text-cyan-300 tracking-wider">
                  {submittedReview.review_id}
                </span>
                <button
                  onClick={() => handleCopyReviewId(submittedReview.review_id)}
                  className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Copy Review ID"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] font-mono text-slate-400 pt-1">
                Please keep this Review ID for your records.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={() => setSubmittedReview(null)}
              className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Mega Footer */}
      <Footer />
    </div>
  );
};
