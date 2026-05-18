'use client';

import { fetchWithCsrf } from '@/lib/api';
import { updateOnboardingStep } from '@/lib/onboarding';
import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Upload, Clock, FileText, AlertCircle } from 'lucide-react';

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
        throw new Error('Format de fichier invalide. Utilisez JPG, PNG ou PDF.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Le fichier doit être inférieur à 10 MB.');
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
        throw new Error('Failed to get upload URL');
      }
      const { upload_url, file_key } = await presignRes.json();

      if (!upload_url || !file_key) {
        throw new Error('Upload URL was not returned by the server.');
      }

      // Upload to presigned URL
      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error('Failed to upload file');
      }

      setUrl(file_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload du fichier');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!rcDocUrl || !cinDocUrl || !phone) {
      setError('Tous les champs sont requis');
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
        setSuccess('Documents soumis avec succès ! Nous les examinerons sous 48h.');
      } else {
        const data = await res.json();
        setError(data.error?.message || 'Erreur lors de la soumission');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Vérification de Compte</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
            <div className="h-40 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Approved state
  if (verification?.status === 'approved') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Vérification de Compte</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-[#B91C1C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#B91C1C]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Compte Vérifié ✓</h2>
          <p className="text-gray-500 mb-4">
            Votre compte a été vérifié avec succès. Vos produits sont publiés instantanément.
          </p>
          {verification.reviewed_at && (
            <p className="text-sm text-gray-400">
              Approuvé le {new Date(verification.reviewed_at).toLocaleDateString('fr-TN')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Pending state
  if (verification?.status === 'pending') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Vérification de Compte</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">En cours de vérification</h2>
          <p className="text-gray-500 mb-4">
            Vos documents ont été soumis et sont en cours d&apos;examen. Notre équipe vous contactera sous 48h.
          </p>
          <p className="text-sm text-gray-400">
            Soumis le {new Date(verification.created_at).toLocaleDateString('fr-TN')}
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 mb-1">Registre de Commerce</p>
              <p className="text-sm text-[#B91C1C] flex items-center gap-1">
                <FileText className="w-4 h-4" /> Uploadé
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 mb-1">Carte d&apos;Identité</p>
              <p className="text-sm text-[#B91C1C] flex items-center gap-1">
                <FileText className="w-4 h-4" /> Uploadé
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 mb-1">Téléphone</p>
              <p className="text-sm text-gray-700">{verification.phone_number}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rejected or not submitted
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Vérification de Compte</h1>

      {verification?.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Vérification rejetée</p>
            <p className="text-sm text-red-700 mt-1">
              {verification.rejection_reason || 'Veuillez resoumettre vos documents.'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#B91C1C]/10 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#B91C1C]" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Complétez votre vérification</h2>
            <p className="text-sm text-gray-500">
              Pour publier vos produits instantanément, soumettez vos documents.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* RC Document */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Registre de Commerce (RC)
            </label>
            {rcDocUrl ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <FileText className="w-5 h-5 text-[#B91C1C]" />
                <span className="text-sm text-[#B91C1C] font-medium">Document uploadé</span>
                <button
                  onClick={() => setRcDocUrl('')}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-700"
                >
                  Changer
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#B91C1C] transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">
                  {uploadingRc ? 'Upload en cours...' : 'Cliquez pour uploader votre RC'}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Carte d&apos;Identité Nationale (CIN)
            </label>
            {cinDocUrl ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <FileText className="w-5 h-5 text-[#B91C1C]" />
                <span className="text-sm text-[#B91C1C] font-medium">Document uploadé</span>
                <button
                  onClick={() => setCinDocUrl('')}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-700"
                >
                  Changer
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#B91C1C] transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">
                  {uploadingCin ? 'Upload en cours...' : 'Cliquez pour uploader votre CIN'}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              3. Numéro de téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+216 XX XXX XXX"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Notre équipe vous contactera pour vérification téléphonique.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !rcDocUrl || !cinDocUrl || !phone}
            className="w-full py-3 bg-[#B91C1C] text-white font-semibold rounded-xl hover:bg-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Envoi en cours...' : 'Soumettre pour vérification'}
          </button>
        </div>
      </div>
    </div>
  );
}
