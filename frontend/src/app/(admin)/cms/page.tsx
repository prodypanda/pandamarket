'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/components/admin/SectionHeader';
// Audit P1-9: mutating calls must go through the CSRF helper like everywhere else.
import { fetchWithCsrf } from '@/lib/api';

interface PlatformPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  show_in_footer: boolean;
  show_in_header: boolean;
  updated_at: string;
}

export default function CmsPagesPage() {
  const [pages, setPages] = useState<PlatformPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pd/marketplace/cms')
      .then((res) => res.json())
      .then((data) => {
        setPages(data.data || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const createNewPage = async () => {
    try {
      const title = prompt('Enter a title for the new page (e.g. Terms of Service)');
      if (!title) return;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const res = await fetchWithCsrf('/api/pd/marketplace/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, is_published: false })
      });
      const json = await res.json();
      if (json.data?.id) {
        window.location.href = `/cms/${json.data.id}`;
      } else {
        alert('Failed to create page');
      }
    } catch (e) {
      alert('Error creating page');
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      await fetchWithCsrf(`/api/pd/marketplace/cms/${id}`, { method: 'DELETE' });
      setPages(pages.filter(p => p.id !== id));
    } catch (e) {
      alert('Error deleting page');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Platform CMS Pages</h1>
          <p className="mt-1 text-sm text-slate-500">Manage pages for the Marketplace Hub (About, FAQ, Terms, etc.)</p>
        </div>
        <button
          onClick={createNewPage}
          className="rounded-xl bg-[#B91C1C] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#991818]"
        >
          + Create Page
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
            <tr>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : pages.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No pages found. Create one to get started.</td></tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-800">{page.title}</td>
                  <td className="px-6 py-4 text-slate-500">/hub/pages/{page.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${page.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {page.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <Link href={`/cms/${page.id}`} className="text-blue-600 hover:text-blue-800 font-semibold text-sm">
                      Edit
                    </Link>
                    <button onClick={() => deletePage(page.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
