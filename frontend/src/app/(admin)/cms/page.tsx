'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
// Audit P1-9: mutating calls must go through the CSRF helper like everywhere else.
import { fetchWithCsrf } from '@/lib/api';
import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { AdminReGoCms } from '@/components/admin/rego/AdminReGoCms';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
  const { adminTheme } = useAdminTheme();
  const [pages, setPages] = useState<PlatformPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadPages = useCallback(() => {
    setIsLoading(true);
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

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const createNewPage = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const res = await fetchWithCsrf('/api/pd/marketplace/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, is_published: false })
      });
      const json = await res.json();
      if (json.data?.id) {
        setCreateOpen(false);
        window.location.href = `/cms/${json.data.id}`;
      } else {
        setCreateOpen(false);
        setActionError('Failed to create page');
      }
    } catch (e) {
      setCreateOpen(false);
      setActionError('Error creating page');
    } finally {
      setCreating(false);
    }
  };

  const handleCreatePageModal = async (title: string, slug: string, isPublished: boolean) => {
    try {
      const res = await fetchWithCsrf('/api/pd/marketplace/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, is_published: isPublished }),
      });
      const json = await res.json();
      if (json.data?.id) {
        window.location.href = `/cms/${json.data.id}`;
      } else {
        setActionError('Failed to create page');
      }
    } catch {
      setActionError('Error creating page');
    }
  };

  const requestDeletePage = async (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeletePage = async () => {
    if (!deleteTargetId) return;
    try {
      await fetchWithCsrf(`/api/pd/marketplace/cms/${deleteTargetId}`, { method: 'DELETE' });
      setPages(pages.filter(p => p.id !== deleteTargetId));
    } catch (e) {
      setActionError('Error deleting page');
    } finally {
      setDeleteTargetId(null);
    }
  };

  if (adminTheme === 'rego') {
    return (
      <>
        {actionError && (
          <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-8">
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300" role="alert">
              {actionError}
            </div>
          </div>
        )}
        <AdminReGoCms
          pages={pages}
          isLoading={isLoading}
          onCreatePage={handleCreatePageModal}
          onDeletePage={requestDeletePage}
          onRefresh={loadPages}
        />
        <ConfirmDialog
          isOpen={Boolean(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          onConfirm={() => void confirmDeletePage()}
          title="Delete Page"
          description="Are you sure you want to delete this page?"
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          variant="danger"
        />
      </>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Platform CMS Pages</h1>
          <p className="mt-1 text-sm text-slate-500">Manage pages for the Marketplace Hub (About, FAQ, Terms, etc.)</p>
        </div>
        <button
          onClick={() => {
            setNewTitle('');
            setCreateOpen(true);
          }}
          className="rounded-xl bg-[#B91C1C] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#991818]"
        >
          + Create Page
        </button>
      </div>

      {actionError && (
        <div className="mb-6 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300" role="alert">
          {actionError}
        </div>
      )}

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
                    <button onClick={() => requestDeletePage(page.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create a new page" maxWidth="md">
        <div className="space-y-3">
          <label htmlFor="new-page-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Title</label>
          <input
            id="new-page-title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Terms of Service"
            data-autofocus
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void createNewPage()}
            disabled={!newTitle.trim() || creating}
            className="rounded-xl bg-[#B91C1C] px-5 py-2 text-xs font-bold text-white transition-all hover:bg-[#991818] disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => void confirmDeletePage()}
        title="Delete Page"
        description="Are you sure you want to delete this page?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
