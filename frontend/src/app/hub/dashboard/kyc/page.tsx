'use client';

import { fetchWithCsrf } from '@/lib/api';
import { updateOnboardingStep } from '@/lib/onboarding';
import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Upload, Clock, FileText, AlertCircle } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

interface Verification {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rc_document_url: string | null;
  cin_document_url: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function getKycMetadata(verification: Verification) {
  return {
    status: verification.status,
    verification_id: verification.id,
    has_rc_document: Boolean(verification.rc_document_url),
    has_cin_document: Boolean(verification.cin_document_url),
    phone_number: verification.phone_number,
    phone_verified: verification.phone_verified,
    submitted_at: verification.created_at,
    reviewed_at: verification.reviewed_at,
    rejection_reason: verification.rejection_reason,
  };
}

export default function KycPage() {
  const { t, locale, dir } = useLocale();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [rcDocUrl, setRcDocUrl] = useState('');
  const [cinDocUrl, setCinDocUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [uploadingRc, setUploadingRc] = useState(false);
  const [uploadingCin, setUploadingCin] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/verification/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const nextVerification = (data.verification || null) as Verification | null;
        setVerification(nextVerification);
        if (nextVerification) {
          updateOnboardingStep('kyc', {
            completed: nextVerification.status === 'approved',
            metadata: getKycMetadata(nextVerification),
          }).catch(() => undefined);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleFileUpload = async (
    file: File,
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void,
  ) => {
    setUploading(true);
    setError('');
    try {
      if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
        throw new Error(t('dashboardPages.kyc.errorInvalidFormat'));
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(t('dashboardPages.kyc.errorFileTooLarge'));
      }

      // Get presigned URL
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          purpose: 'kyc_document',
        }),
      });
      if (!presignRes.ok) {
        throw new Error(t('dashboardPages.kyc.errorPresignFailed'));
      }
      const { upload_url, file_key } = await presignRes.json();

      if (!upload_url || !file_key) {
        throw new Error(t('dashboardPages.kyc.errorNoUploadUrl'));
      }

      // Upload to presigned URL
      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error(t('dashboardPages.kyc.errorUploadFailed'));
      }

      setUrl(file_key);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('dashboardPages.kyc.errorUploadGeneric'),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!rcDocUrl || !cinDocUrl || !phone) {
      setError(t('dashboardPages.kyc.errorAllFieldsRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchWithCsrf('/api/pd/verification/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rc_document_url: rcDocUrl,
          cin_document_url: cinDocUrl,
          phone_number: phone,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const nextVerification = data.verification as Verification;
        setVerification(nextVerification);
        updateOnboardingStep('kyc', {
          completed: nextVerification.status === 'approved',
          metadata: getKycMetadata(nextVerification),
        }).catch(() => undefined);
        setSuccess(t('dashboardPages.kyc.submitSuccess'));
      } else {
        const data = await res.json();
        setError(data.error?.message || t('dashboardPages.kyc.errorSubmitFailed'));
      }
    } catch {
      setError(t('dashboardPages.kyc.errorNetwork'));
    } finally {
      setSubmitting(false);
    }
  };

  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  if (loading) {
    return (
      <div dir={dir} className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('kyc.title')}</h1>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-2xs">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
            <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Approved state
  if (verification?.status === 'approved') {
    return (
      <div dir={dir} className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('kyc.title')}</h1>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-2xs">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('kyc.status.approved')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">{t('dashboardPages.kyc.approvedDescription')}</p>
          {verification.reviewed_at && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {t('dashboardPages.kyc.approvedOn', {
                date: new Date(verification.reviewed_at).toLocaleDateString(dateLocale),
              })}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Pending state
  if (verification?.status === 'pending') {
    return (
      <div dir={dir} className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('kyc.title')}</h1>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-2xs">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {t('dashboardPages.kyc.inReviewTitle')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">{t('dashboardPages.kyc.inReviewDescription')}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {t('dashboardPages.kyc.submittedOn', {
              date: new Date(verification.created_at).toLocaleDateString(dateLocale),
            })}
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('kyc.step1')}</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <FileText className="w-4 h-4" /> {t('kyc.uploaded')}
              </p>
            </div>
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('kyc.step2')}</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <FileText className="w-4 h-4" /> {t('kyc.uploaded')}
              </p>
            </div>
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {t('dashboardPages.kyc.phone')}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{verification.phone_number}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rejected or not submitted
  return (
    <div dir={dir} className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('kyc.title')}</h1>

      {verification?.status === 'rejected' && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-800 dark:text-rose-300">{t('dashboardPages.kyc.rejectedTitle')}</p>
            <p className="text-sm text-rose-700 dark:text-rose-400 mt-1">
              {verification.rejection_reason ||
                t('dashboardPages.kyc.resubmitPrompt')}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-2xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-slate-900 dark:text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-lg">{t('dashboardPages.kyc.completeTitle')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('kyc.instructions')}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-sm rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* RC Document */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t('dashboardPages.kyc.step1Label', { number: 1 })}
            </label>
            {rcDocUrl ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                  {t('dashboardPages.kyc.documentUploaded')}
                </span>
                <button
                  type="button"
                  onClick={() => setRcDocUrl('')}
                  className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                >
                  {t('dashboardPages.kyc.change')}
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white bg-slate-50/40 dark:bg-slate-800/20 rounded-xl cursor-pointer transition-colors">
                <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {uploadingRc
                    ? t('dashboardPages.common.loading')
                    : t('dashboardPages.kyc.uploadRcPrompt')}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  disabled={uploadingRc}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, setRcDocUrl, setUploadingRc);
                  }}
                />
              </label>
            )}
          </div>

          {/* CIN Document */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t('dashboardPages.kyc.step2Label', { number: 2 })}
            </label>
            {cinDocUrl ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                  {t('dashboardPages.kyc.documentUploaded')}
                </span>
                <button
                  type="button"
                  onClick={() => setCinDocUrl('')}
                  className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                >
                  {t('dashboardPages.kyc.change')}
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white bg-slate-50/40 dark:bg-slate-800/20 rounded-xl cursor-pointer transition-colors">
                <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {uploadingCin
                    ? t('dashboardPages.common.loading')
                    : t('dashboardPages.kyc.uploadCinPrompt')}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  disabled={uploadingCin}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, setCinDocUrl, setUploadingCin);
                  }}
                />
              </label>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t('dashboardPages.kyc.step3Label', { number: 3 })}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('dashboardPages.kyc.phonePlaceholder')}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none transition"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('kyc.step3Desc')}</p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !rcDocUrl || !cinDocUrl || !phone}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl shadow-2xs transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('dashboardPages.kyc.submitting') : t('kyc.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
