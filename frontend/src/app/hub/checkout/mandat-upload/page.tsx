'use client';

import React, { useState, useRef, Suspense } from 'react';
import { Upload, FileText, CheckCircle, ArrowRight, Loader2, Info } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

function MandatUploadContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id');

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      // Mocking the S3 upload and API registration
      await new Promise(r => setTimeout(r, 2000));
      setSuccess(true);
    } catch (e) {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100 max-w-2xl mx-auto mt-20">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Proof Submitted!</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          We have received your payment proof. Your order will be processed as soon as our team verifies the Mandat transfer.
        </p>
        <button 
          onClick={() => router.push('/hub')}
          className="px-8 py-3 bg-gray-900 text-white font-medium rounded-full hover:bg-gray-800 transition-colors"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-sm border border-gray-100 max-w-3xl mx-auto mt-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Payment Proof</h1>
      <p className="text-gray-500 mb-8">
        Order ID: <strong className="text-gray-900">{orderId || 'Unknown'}</strong>
      </p>

      <div className="bg-[#16C784]/5 p-4 rounded-xl flex gap-4 mb-8">
        <Info className="w-6 h-6 text-[#16C784] flex-shrink-0" />
        <p className="text-sm text-gray-800">
          Please complete a Mandat Minute transfer at La Poste to <strong>PandaMarket SARL</strong> (CIN: 12345678). 
          Then, take a clear photo of your receipt and upload it here to validate your order.
        </p>
      </div>

      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 mb-8 ${
          file ? 'border-green-500 bg-green-50/30' : 'border-gray-300 hover:border-blue-400 bg-gray-50'
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
            <p className="text-sm text-gray-500 mt-1">Accepted formats: JPG, PNG, PDF (Max 5MB)</p>
          </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf" className="hidden" />

      <button 
        disabled={!file || uploading} 
        onClick={handleUpload}
        className="w-full bg-[#16C784] text-white font-bold text-lg py-4 rounded-xl hover:bg-[#14b876] transition-colors disabled:opacity-50 flex justify-center items-center"
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
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-[#16C784]" /></div>}>
        <MandatUploadContent />
      </Suspense>
    </div>
  );
}
