'use client';

import { fetchWithCsrf } from '@/lib/api';
import { isAliExpressTheme } from '@/lib/marketplace-theme';
import { useState, useEffect, useCallback } from 'react';
import { Star, ThumbsUp, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  customer_name?: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

interface ProductRating {
  average_rating: number | string | null;
  review_count: number | string | null;
  rating_1: number | string | null;
  rating_2: number | string | null;
  rating_3: number | string | null;
  rating_4: number | string | null;
  rating_5: number | string | null;
}

interface ReviewSectionProps {
  productId: string;
  marketplaceTheme?: 'panda' | 'aliexpress' | 'aliexpress2';
}

function StarRating({
  rating,
  size = 'sm',
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === 'lg' ? 'w-7 h-7' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} transition-colors cursor-${interactive ? 'pointer' : 'default'} ${
            star <= (hover || rating)
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          }`}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(star)}
        />
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-6 text-right text-gray-600">{label}</span>
      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-gray-500">{count}</span>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 30) return `Il y a ${days} jours`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Il y a ${months} mois`;
  return `Il y a ${Math.floor(months / 12)} an(s)`;
}

function toNumber(value: number | string | null | undefined): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

async function getResponseErrorMessage(res: Response, fallback: string) {
  if (res.status === 401) return 'Connectez-vous pour publier un avis.';
  if (res.status === 403) return 'Votre session a expiré ou la vérification CSRF a échoué. Actualisez la page puis réessayez.';

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await res.json();
      return data.error?.message || data.message || fallback;
    } catch {
      return fallback;
    }
  }

  try {
    const text = await res.text();
    if (text && !text.trim().startsWith('<')) return text.slice(0, 220);
  } catch {
    return `${fallback} (${res.status})`;
  }

  return `${fallback} (${res.status})`;
}

export function ReviewSection({ productId, marketplaceTheme = 'panda' }: ReviewSectionProps) {
  const isAliExpress = isAliExpressTheme(marketplaceTheme);
  const primaryButtonClass = isAliExpress
    ? 'bg-[#ff4747] hover:bg-[#e63f00]'
    : 'bg-[#16C784] hover:bg-[#14b576]';
  const primaryActiveClass = isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]';
  const focusRingClass = isAliExpress
    ? 'focus:ring-[#ff4747] focus:border-transparent'
    : 'focus:ring-[#16C784] focus:border-transparent';
  const [rating, setRating] = useState<ProductRating | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string>('recent');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Form state
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchRating = useCallback(async () => {
    try {
      const res = await fetch(`/api/pd/reviews/products/${productId}/rating`);
      if (res.ok) setRating(await res.json());
    } catch { /* ignore */ }
  }, [productId]);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/pd/reviews/products/${productId}/reviews?page=${page}&limit=10&sort=${sort}`,
      );
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [productId, page, sort]);

  useEffect(() => {
    fetchRating();
    fetchReviews();
  }, [fetchRating, fetchReviews]);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/pd/auth/me', { credentials: 'include' });
      const authenticated = res.ok;
      setIsAuthenticated(authenticated);
      setAuthChecked(true);
      return authenticated;
    } catch {
      setIsAuthenticated(false);
      setAuthChecked(true);
      return false;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const toggleForm = async () => {
    setSubmitError('');
    if (showForm) {
      setShowForm(false);
      return;
    }
    const canReview = await checkAuth();
    if (!canReview) {
      setSubmitError('Connectez-vous ou créez un compte pour publier un avis.');
      return;
    }
    setSubmitSuccess(false);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formRating === 0) {
      setSubmitError('Veuillez sélectionner une note');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const canReview = await checkAuth();
      if (!canReview) {
        throw new Error('Connectez-vous ou créez un compte pour publier un avis.');
      }

      const res = await fetchWithCsrf('/api/pd/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          product_id: productId,
          rating: formRating,
          title: formTitle || undefined,
          body: formBody || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(await getResponseErrorMessage(res, 'Erreur lors de la soumission'));
      }
      setSubmitSuccess(true);
      setShowForm(false);
      setFormRating(0);
      setFormTitle('');
      setFormBody('');
      fetchRating();
      fetchReviews();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
    setSubmitting(false);
  };

  const handleHelpful = async (reviewId: string) => {
    try {
      await fetchWithCsrf(`/api/pd/reviews/${reviewId}/helpful`, {
        method: 'POST',
        credentials: 'include',
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r,
        ),
      );
    } catch { /* ignore */ }
  };

  const totalPages = Math.ceil(total / 10);
  const avg = toNumber(rating?.average_rating);
  const count = toNumber(rating?.review_count);
  const rating1 = toNumber(rating?.rating_1);
  const rating2 = toNumber(rating?.rating_2);
  const rating3 = toNumber(rating?.rating_3);
  const rating4 = toNumber(rating?.rating_4);
  const rating5 = toNumber(rating?.rating_5);

  return (
    <div>
      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* Average */}
        <div className="text-center md:text-left">
          <div className="text-5xl font-extrabold text-gray-900 mb-1">
            {avg > 0 ? avg.toFixed(1) : '—'}
          </div>
          <StarRating rating={Math.round(avg)} size="md" />
          <p className="text-sm text-gray-500 mt-1">
            {count} avis
          </p>
        </div>

        {/* Distribution */}
        {rating && count > 0 && (
          <div className="md:col-span-2 space-y-1.5">
            <RatingBar label="5" count={rating5} total={count} />
            <RatingBar label="4" count={rating4} total={count} />
            <RatingBar label="3" count={rating3} total={count} />
            <RatingBar label="2" count={rating2} total={count} />
            <RatingBar label="1" count={rating1} total={count} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={toggleForm}
          className={`px-5 py-2.5 ${primaryButtonClass} text-white font-semibold rounded-lg transition-colors text-sm`}
        >
          {showForm ? 'Annuler' : authChecked && !isAuthenticated ? 'Connexion pour écrire un avis' : 'Écrire un avis'}
        </button>

        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className={`text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 ${focusRingClass}`}
        >
          <option value="recent">Plus récents</option>
          <option value="helpful">Plus utiles</option>
          <option value="highest">Meilleures notes</option>
          <option value="lowest">Notes les plus basses</option>
        </select>
      </div>

      {/* Submit Success */}
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Merci pour votre avis ! Il a été publié avec succès.
        </div>
      )}

      {submitError && !showForm && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">{submitError}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/login/buyer" className={`rounded-lg px-4 py-2 text-xs font-bold text-white ${primaryButtonClass}`}>
              Login
            </Link>
            <Link href="/register/buyer" className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100">
              Register
            </Link>
          </div>
        </div>
      )}

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Votre avis</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Note *</label>
            <StarRating rating={formRating} size="lg" interactive onChange={setFormRating} />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Résumez votre expérience"
              maxLength={200}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 ${focusRingClass} text-sm`}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              placeholder="Partagez votre expérience avec ce produit..."
              rows={4}
              maxLength={5000}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 ${focusRingClass} text-sm resize-none`}
            />
          </div>

          {submitError && (
            <p className="text-red-500 text-sm mb-3">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={submitting || formRating === 0}
            className={`px-6 py-2.5 ${primaryButtonClass} text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {submitting ? 'Publication...' : 'Publier mon avis'}
          </button>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse p-5 border border-gray-100 rounded-xl">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Aucun avis pour le moment</p>
          <p className="text-sm mt-1">Soyez le premier à donner votre avis !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-5 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating rating={review.rating} />
                    {review.title && (
                      <span className="font-semibold text-gray-900 text-sm">
                        {review.title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{review.customer_name || 'Anonyme'}</span>
                    {review.is_verified_purchase && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">
                        Achat vérifié
                      </span>
                    )}
                    <span>{timeAgo(review.created_at)}</span>
                  </div>
                </div>
              </div>

              {review.body && (
                <p className="text-gray-700 text-sm leading-relaxed mt-2">
                  {review.body}
                </p>
              )}

              <button
                onClick={() => handleHelpful(review.id)}
                className={`mt-3 flex items-center gap-1.5 text-xs text-gray-500 transition-colors ${isAliExpress ? 'hover:text-[#ff4747]' : 'hover:text-[#16C784]'}`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                Utile ({review.helpful_count})
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? `${primaryActiveClass} text-white`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
