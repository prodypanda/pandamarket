'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, ThumbsUp, ChevronDown, MessageSquare } from 'lucide-react';

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
  average_rating: number;
  review_count: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
}

interface ReviewSectionProps {
  productId: string;
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

export function ReviewSection({ productId }: ReviewSectionProps) {
  const [rating, setRating] = useState<ProductRating | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string>('recent');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:4000';

  const fetchRating = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/api/pd/reviews/products/${productId}/rating`);
      if (res.ok) setRating(await res.json());
    } catch { /* ignore */ }
  }, [backendUrl, productId]);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/pd/reviews/products/${productId}/reviews?page=${page}&limit=10&sort=${sort}`,
      );
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [backendUrl, productId, page, sort]);

  useEffect(() => {
    fetchRating();
    fetchReviews();
  }, [fetchRating, fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formRating === 0) {
      setSubmitError('Veuillez sélectionner une note');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pd_access_token') : null;
      const res = await fetch(`${backendUrl}/api/pd/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          product_id: productId,
          rating: formRating,
          title: formTitle || undefined,
          body: formBody || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Erreur lors de la soumission');
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('pd_access_token') : null;
      await fetch(`${backendUrl}/api/pd/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r,
        ),
      );
    } catch { /* ignore */ }
  };

  const totalPages = Math.ceil(total / 10);
  const avg = rating?.average_rating ?? 0;
  const count = rating?.review_count ?? 0;

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
            <RatingBar label="5" count={rating.rating_5} total={count} />
            <RatingBar label="4" count={rating.rating_4} total={count} />
            <RatingBar label="3" count={rating.rating_3} total={count} />
            <RatingBar label="2" count={rating.rating_2} total={count} />
            <RatingBar label="1" count={rating.rating_1} total={count} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b576] transition-colors text-sm"
        >
          {showForm ? 'Annuler' : 'Écrire un avis'}
        </button>

        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#16C784] focus:border-transparent"
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#16C784] focus:border-transparent text-sm"
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#16C784] focus:border-transparent text-sm resize-none"
            />
          </div>

          {submitError && (
            <p className="text-red-500 text-sm mb-3">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={submitting || formRating === 0}
            className="px-6 py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b576] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#16C784] transition-colors"
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
                  ? 'bg-[#16C784] text-white'
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
