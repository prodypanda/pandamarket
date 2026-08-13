'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageBuilderEditor as PlatformPageBuilderEditor } from '@/components/page-builder/PlatformPageBuilderEditor';
import Link from 'next/link';

export default function CmsEditorPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [initialData, setInitialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/pd/marketplace/cms/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setInitialData(data.data);
        } else {
          setError('Page not found');
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading editor...</div>;
  }

  if (error || !initialData) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>{error || 'Failed to load page'}</p>
        <Link href="/cms" className="mt-4 inline-block text-blue-500 underline">Back to CMS</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* PlatformPageBuilderEditor internally manages its own save and back actions via the onBack prop */}
      <PlatformPageBuilderEditor
        pageId={id}
        initialData={initialData}
        onBack={() => router.push('/cms')}
        onSave={() => {
          // Revalidate or show toast if needed, the editor handles the PUT request
        }}
      />
    </div>
  );
}
