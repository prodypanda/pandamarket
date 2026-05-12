'use client';

import React, { useState, useRef, Suspense } from 'react';
import { Upload, FileText, CheckCircle, ArrowRight, Loader2, Info } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HubNavbar } from '../../../../components/hub/HubNavbar';
import { HubFooter } from '../../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../../hooks/useMarketplaceTheme';
import { fetchWithCsrf } from '../../../../lib/api';

type MarketplaceThemeClasses = ReturnType<typeof useMarketplaceTheme>['classes'];

function MandatUploadContent({ classes, isAliExpress }: { classes: MarketplaceThemeClasses; isAliExpress: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id');

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !orderId) return;
    setError('');
    setUploading(true);

    try {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        throw new Error('Please upload a JPG or PNG receipt image.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Receipt image must be smaller than 10 MB.');
      }

      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          purpose: 'mandat_proof',
        }),
      });
      if (!presignRes.ok) throw new Error('Failed to prepare upload.');
      const presignData = await presignRes.json();
      const uploadUrl = presignData.upload_url as string | undefined;
      const fileKey = presignData.file_key as string | undefined;

      if (!uploadUrl || !fileKey) {
        throw new Error('Upload URL was not returned by the server.');
      }

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Upload failed. Please try again.');

      const proofRes = await fetchWithCsrf('/api/pd/payments/mandat/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          order_id: orderId,
          image_url: fileKey,
        }),
      });
      if (!proofRes.ok) throw new Error('Failed to submit payment proof.');

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className={`${classes.panel} max-w-2xl mx-auto mt-20 p-12 text-center`}>
        <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${classes.primarySoft}`}>
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Proof Submitted!</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          We have received your payment proof. Your order will be processed as soon as our team verifies the Mandat transfer.
        </p>
        <button 
          onClick={() => router.push('/hub')}
          className={`px-8 py-3 font-black rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient}`}
        >
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className={`${classes.panel} max-w-3xl mx-auto mt-12 p-8 lg:p-12`}>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Payment Proof</h1>
      <p className="text-gray-500 mb-8">
        Order ID: <strong className="text-gray-900">{orderId || 'Unknown'}</strong>
      </p>

      {!orderId && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
          Missing order ID. Please return to checkout and try again.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className={`${classes.primarySoft} p-4 rounded-2xl flex gap-4 mb-8`}>
        <Info className="w-6 h-6 flex-shrink-0" />
        <p className="text-sm text-gray-800">
          Please complete a Mandat Minute transfer at La Poste to <strong>PandaMarket SARL</strong> (CIN: 12345678). 
          Then, take a clear photo of your receipt and upload it here to validate your order.
        </p>
      </div>

      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 mb-8 ${
          file ? `${classes.primaryBorder} ${classes.primarySoft}` : isAliExpress ? 'border-orange-200 hover:border-[#ff4747] bg-orange-50/30' : 'border-gray-300 hover:border-[#16C784] bg-gray-50'
        }`}
      >
        {file ? (
          <div>
            <FileText className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-gray-900">{file.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Click to replace</p>
          </div>
        ) : (
          <div>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-gray-900">Upload your receipt</h3>
            <p className="text-sm text-gray-500 mt-1">Accepted formats: JPG, PNG (Max 10MB)</p>
          </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png" className="hidden" />

      <button
        disabled={!file || !orderId || uploading}
        onClick={handleUpload}
        className={`w-full text-white font-black text-lg py-4 rounded-full transition-all disabled:opacity-50 flex justify-center items-center hover:-translate-y-0.5 hover:shadow-lg ${classes.primaryGradient}`}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <>Submit for Validation <ArrowRight className="w-5 h-5 ml-2" /></>
        )}
      </button>
    </div>
  );
}

export default function MandatUploadPage() {
  const { settings, classes, isAliExpress } = useMarketplaceTheme();

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className={`w-8 h-8 animate-spin ${classes.primaryText}`} /></div>}>
          <MandatUploadContent classes={classes} isAliExpress={isAliExpress} />
        </Suspense>
      </div>
      <HubFooter {...settings} />
    </div>
  );
}
