import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, ThumbsUp, ShieldCheck, PenLine, AlertCircle, Loader2, X, Filter } from 'lucide-react';
import type { ProductReviewsSummary } from '../../types';
import { fetchProductReviews, submitProductReview, voteReviewHelpful } from '../../services/reviewsApi';
import { useAuth } from '../../context/AuthContext';

interface ProductReviewsProps {
  productId: string;
  productName: string;
  defaultRating?: number;
  defaultReviewCount?: number;
  t: (key: any) => string;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  productName,
  defaultRating = 4.8,
  defaultReviewCount = 24,
  t,
}) => {
  const { user } = useAuth();

  const [summary, setSummary] = useState<ProductReviewsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [authorNameInput, setAuthorNameInput] = useState(() => {
    if (!user) return '';
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || user.email.split('@')[0];
  });
  const [authorEmailInput, setAuthorEmailInput] = useState(() => user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [votedHelpful, setVotedHelpful] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    fetchProductReviews(productId, defaultRating, defaultReviewCount).then((data) => {
      if (isMounted) {
        setSummary(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [productId, defaultRating, defaultReviewCount]);

  const handleHelpfulClick = async (reviewId: string, currentCount: number) => {
    if (votedHelpful[reviewId] !== undefined) return;
    setVotedHelpful((prev) => ({ ...prev, [reviewId]: currentCount + 1 }));
    await voteReviewHelpful(reviewId);
  };

  const handleOpenModal = () => {
    if (user) {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      setAuthorNameInput(name || user.email.split('@')[0]);
      setAuthorEmailInput(user.email);
    }
    setIsModalOpen(true);
    setSubmitError('');
    setSubmitSuccess(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorNameInput.trim()) {
      setSubmitError('Bitte geben Sie Ihren Namen an.');
      return;
    }
    if (!authorEmailInput.trim() || !authorEmailInput.includes('@')) {
      setSubmitError('Bitte geben Sie eine gültige E-Mail-Adresse an.');
      return;
    }
    if (titleInput.trim().length < 2) {
      setSubmitError('Die Überschrift sollte mindestens 2 Zeichen lang sein.');
      return;
    }
    if (commentInput.trim().length < 10) {
      setSubmitError('Bitte verfassen Sie einen ausführlicheren Erfahrungsbericht (mind. 10 Zeichen).');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const res = await submitProductReview(productId, {
      author_name: authorNameInput.trim(),
      author_email: authorEmailInput.trim(),
      rating: ratingInput,
      title: titleInput.trim(),
      comment: commentInput.trim(),
    });

    setIsSubmitting(false);

    if (res.success && res.review) {
      setSubmitSuccess(true);
      if (summary) {
        const updatedReviews = [res.review, ...summary.reviews];
        setSummary({
          ...summary,
          totalReviews: updatedReviews.length,
          reviews: updatedReviews,
        });
      }
      setTimeout(() => {
        setIsModalOpen(false);
        setTitleInput('');
        setCommentInput('');
      }, 1500);
    } else {
      setSubmitError(res.error || 'Fehler beim Absenden der Bewertung.');
    }
  };

  const ratingDescriptions: Record<number, string> = {
    5: 'Hervorragend – Absolut empfehlenswert',
    4: 'Sehr gut – Erwartungen erfüllt',
    3: 'Gut – Zufriedenstellend mit kleinen Mängeln',
    2: 'Mäßig – Enttäuschend',
    1: 'Schlecht – Nicht zu empfehlen',
  };

  const filteredReviews = summary?.reviews.filter((r) => {
    if (selectedStarFilter === null) return true;
    return r.rating === selectedStarFilter;
  }) || [];

  return (
    <div className="pt-2 pb-8">
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8 mb-8 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start lg:items-center justify-between">
          
          <div className="flex flex-col items-start sm:items-center text-left sm:text-center shrink-0">
            <span className="text-5xl font-black text-navy-900 leading-none tracking-tight">
              {summary ? summary.averageRating.toFixed(1) : defaultRating.toFixed(1)}
            </span>
            <div className="flex items-center gap-1 my-2 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  className={star <= Math.round(summary?.averageRating || defaultRating) ? 'fill-current' : 'text-neutral-200'}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-neutral-500">
              Basierend auf <strong>{summary?.totalReviews ?? defaultReviewCount}</strong> {t('reviews')}
            </span>
          </div>

          <div className="flex-1 w-full max-w-md space-y-2">
            {summary?.distribution.map((dist) => (
              <button
                key={dist.stars}
                type="button"
                data-testid={`star-filter-${dist.stars}`}
                aria-label={`${dist.stars} Sterne Bewertungen filtern`}
                onClick={() => setSelectedStarFilter(selectedStarFilter === dist.stars ? null : dist.stars)}
                className={`w-full flex items-center gap-3 text-xs group cursor-pointer transition-colors p-1 rounded-md ${
                  selectedStarFilter === dist.stars ? 'bg-electric-50/70 font-bold' : 'hover:bg-neutral-50'
                }`}
              >
                <span className="w-12 text-left font-medium text-navy-900 flex items-center gap-1">
                  {dist.stars} <Star size={12} className="fill-current text-amber-400 inline" />
                </span>
                <div className="flex-1 bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${dist.percentage}%` }}
                  />
                </div>
                <span className="w-10 text-right text-neutral-500 text-[11px]">
                  {dist.percentage}%
                </span>
              </button>
            ))}
          </div>

          <div className="shrink-0 flex flex-col items-start lg:items-end w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
            <button
              onClick={handleOpenModal}
              className="btn-primary py-3 px-6 text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer w-full sm:w-auto justify-center"
            >
              <PenLine size={16} />
              {t('writeReview')}
            </button>
            <p className="text-[11px] text-neutral-400 mt-2">
              Teilen Sie Ihre Erfahrung mit anderen Käufern
            </p>
          </div>

        </div>

        <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center gap-2 text-[11px] text-neutral-500 leading-relaxed">
          <ShieldCheck size={16} className="text-electric-500 shrink-0" />
          <span>
            <strong>Echtheitsprüfung gem. § 5b Abs. 3 UWG:</strong> Wir verifizieren Kundenbewertungen durch Abgleich mit getätigten Bestellungen. Bewertungen von nachgewiesenen Käufern sind mit dem Hinweis <em>„{t('verifiedPurchase')}“</em> gekennzeichnet.
          </span>
        </div>
      </div>

      {selectedStarFilter !== null && (
        <div className="mb-6 flex items-center justify-between bg-neutral-50 border border-neutral-200 px-4 py-2.5 rounded-xl text-xs">
          <span className="text-neutral-700 flex items-center gap-2">
            <Filter size={14} className="text-electric-500" />
            Gefiltert nach: <strong>{selectedStarFilter} Sterne</strong> ({filteredReviews.length} {t('reviews')})
          </span>
          <button
            onClick={() => setSelectedStarFilter(null)}
            className="text-electric-500 font-semibold hover:underline cursor-pointer"
          >
            Filter aufheben
          </button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-neutral-400">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-electric-500" />
            <p className="text-xs">Bewertungen werden geladen...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-xl border border-neutral-200 p-8">
            <p className="text-sm font-semibold text-navy-900 mb-1">
              Keine Bewertungen für diese Filterauswahl vorhanden.
            </p>
            <p className="text-xs text-neutral-500 mb-4">
              Seien Sie der Erste, der eine Bewertung für dieses Produkt verfasst!
            </p>
            <button
              onClick={handleOpenModal}
              className="btn-secondary py-2 px-4 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <PenLine size={14} />
              {t('writeReview')}
            </button>
          </div>
        ) : (
          filteredReviews.map((review) => {
            const helpfulVote = votedHelpful[review.id];
            const currentHelpful = helpfulVote !== undefined ? helpfulVote : review.helpfulCount;
            const formattedDate = review.createdAt
              ? new Date(review.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
              : 'Vor kurzem';

            return (
              <div
                key={review.id}
                className="bg-white rounded-xl border border-neutral-200 p-5 md:p-6 shadow-xs hover:border-[#B8CEF5] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={15}
                          className={s <= review.rating ? 'fill-current' : 'text-neutral-200'}
                        />
                      ))}
                    </div>
                    <h4 className="font-bold text-navy-900 text-sm md:text-base">
                      {review.title}
                    </h4>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {formattedDate}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-navy-900">
                    {review.authorName}
                  </span>
                  {review.isVerifiedBuyer && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-status-success bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      <CheckCircle size={12} className="stroke-[2.5]" />
                      {t('verifiedPurchase')}
                    </span>
                  )}
                </div>

                <p className="text-sm text-neutral-700 leading-relaxed mb-4">
                  {review.comment}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs text-neutral-500">
                  <span className="text-[11px]">War diese Bewertung hilfreich?</span>
                  <button
                    onClick={() => handleHelpfulClick(review.id, review.helpfulCount)}
                    disabled={helpfulVote !== undefined}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      helpfulVote !== undefined
                        ? 'bg-green-50 text-status-success font-semibold border border-green-200'
                        : 'bg-neutral-100 hover:bg-neutral-200/80 text-navy-900 font-medium'
                    }`}
                  >
                    <ThumbsUp size={13} className={helpfulVote !== undefined ? 'fill-current' : ''} />
                    <span>{helpfulVote !== undefined ? 'Danke!' : t('helpful')}</span>
                    <span className="opacity-75">({currentHelpful})</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-white rounded-2xl border border-neutral-200 max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-navy-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Schließen"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-navy-900 mb-1">
              {t('writeReview')}
            </h3>
            <p className="text-xs text-neutral-500 mb-6 truncate">
              für <strong>{productName}</strong>
            </p>

            {submitSuccess ? (
              <div className="py-8 text-center text-status-success">
                <CheckCircle size={48} className="mx-auto mb-3" />
                <h4 className="text-lg font-bold text-navy-900 mb-1">Vielen Dank für Ihre Bewertung!</h4>
                <p className="text-xs text-neutral-600">Ihre Bewertung wurde erfolgreich übermittelt und veröffentlicht.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Ihre Gesamtbewertung *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const activeStar = hoverRating !== null ? hoverRating : ratingInput;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingInput(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                          >
                            <Star
                              size={28}
                              className={star <= activeStar ? 'fill-current' : 'text-neutral-200'}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs font-medium text-neutral-600 ml-2">
                      {ratingDescriptions[hoverRating !== null ? hoverRating : ratingInput]}
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="review-title" className="block text-xs font-bold text-navy-900 mb-1">
                    Überschrift der Bewertung *
                  </label>
                  <input
                    id="review-title"
                    type="text"
                    required
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="z. B. Sehr leise und super schnell!"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="review-comment" className="block text-xs font-bold text-navy-900 mb-1">
                    Ihr Erfahrungsbericht * (mind. 10 Zeichen)
                  </label>
                  <textarea
                    id="review-comment"
                    rows={4}
                    required
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Was hat Ihnen besonders gefallen? Wie bewerten Sie Qualität, Leistung und Bedienung?"
                    className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 leading-relaxed"
                  />
                  <span className="text-[11px] text-neutral-400 block text-right mt-0.5">
                    {commentInput.length} Zeichen
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="review-author" className="block text-xs font-bold text-navy-900 mb-1">
                      Ihr Name / Pseudonym *
                    </label>
                    <input
                      id="review-author"
                      type="text"
                      required
                      value={authorNameInput}
                      onChange={(e) => setAuthorNameInput(e.target.value)}
                      placeholder="z. B. Max M."
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="review-email" className="block text-xs font-bold text-navy-900 mb-1">
                      E-Mail-Adresse * <span className="text-neutral-400 font-normal">(wird nicht veröffentlicht)</span>
                    </label>
                    <input
                      id="review-email"
                      type="email"
                      required
                      value={authorEmailInput}
                      onChange={(e) => setAuthorEmailInput(e.target.value)}
                      placeholder="name@beispiel.de"
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                    />
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 flex items-start gap-2">
                  <ShieldCheck size={16} className="text-electric-500 shrink-0 mt-0.5" />
                  <span>
                    Wenn Ihre angegebene E-Mail-Adresse mit einer getätigten Bestellung übereinstimmt, wird Ihre Bewertung automatisch als <strong>„{t('verifiedPurchase')}“</strong> ausgewiesen.
                  </span>
                </div>

                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-status-error flex items-center gap-2">
                    <AlertCircle size={16} />
                    {submitError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Wird gespeichert...
                      </>
                    ) : (
                      'Bewertung absenden'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary py-3 px-4 text-sm font-semibold cursor-pointer"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
