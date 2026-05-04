'use client';

/**
 * PageBuilderEditor — GrapesJS integration for PandaMarket vendor dashboard.
 * ─────────────────────────────────────────────────────────────────────────
 * This component wraps GrapesJS in a React client component.
 * It loads the editor on mount, provides save/publish actions,
 * and communicates with the backend via the page-builder API.
 *
 * Design system compliance:
 *   - Panda Green (#16C784) for primary actions
 *   - Inter font
 *   - Lucide icons
 *   - Dark panel styling matching the GrapesJS dark theme
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Save, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';

// GrapesJS types
interface GrapesJSEditor {
  getHtml: () => string;
  getCss: () => string;
  getProjectData: () => Record<string, unknown>;
  loadProjectData: (data: Record<string, unknown>) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  destroy: () => void;
  DomComponents: { clear: () => void };
  setStyle: (css: string) => void;
}

interface PageBuilderEditorProps {
  pageId: string;
  storeId: string;
  initialData?: {
    builder_data: Record<string, unknown>;
    html: string;
    css: string;
    title: string;
    is_published: boolean;
  };
  onSave?: () => void;
  onBack?: () => void;
}

export function PageBuilderEditor({
  pageId,
  storeId,
  initialData,
  onSave,
  onBack,
}: PageBuilderEditorProps) {
  const editorRef = useRef<GrapesJSEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(initialData?.is_published ?? false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  // Initialize GrapesJS
  useEffect(() => {
    if (!containerRef.current) return;

    let editor: GrapesJSEditor | null = null;

    const initEditor = async () => {
      // Dynamic import to avoid SSR issues
      const grapesjs = (await import('grapesjs')).default;
      const blocksBasic = (await import('grapesjs-blocks-basic')).default;

      // Load GrapesJS CSS dynamically
      if (!document.getElementById('grapesjs-css')) {
        const link = document.createElement('link');
        link.id = 'grapesjs-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css';
        document.head.appendChild(link);
      }

      editor = grapesjs.init({
        container: containerRef.current!,
        height: '100%',
        width: 'auto',
        fromElement: false,
        storageManager: false, // We handle persistence ourselves
        plugins: [blocksBasic],
        pluginsOpts: {
          [blocksBasic as unknown as string]: {
            flexGrid: true,
            blocks: [
              'column1', 'column2', 'column3', 'column3-7',
              'text', 'link', 'image', 'video',
              'map', 'link-block', 'quote', 'text-basic',
            ],
          },
        },
        canvas: {
          styles: [
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
          ],
        },
        // Custom block categories for e-commerce
        blockManager: {
          appendTo: '#gjs-blocks',
        },
        layerManager: {
          appendTo: '#gjs-layers',
        },
        styleManager: {
          appendTo: '#gjs-styles',
          sectors: [
            {
              name: 'General',
              open: true,
              buildProps: [
                'float', 'display', 'position', 'top', 'right', 'left', 'bottom',
              ],
            },
            {
              name: 'Dimension',
              open: false,
              buildProps: [
                'width', 'height', 'max-width', 'min-height', 'margin', 'padding',
              ],
            },
            {
              name: 'Typography',
              open: false,
              buildProps: [
                'font-family', 'font-size', 'font-weight', 'letter-spacing',
                'color', 'line-height', 'text-align', 'text-decoration',
                'text-shadow',
              ],
            },
            {
              name: 'Decorations',
              open: false,
              buildProps: [
                'background-color', 'border-radius', 'border', 'box-shadow',
                'background',
              ],
            },
          ],
        },
        deviceManager: {
          devices: [
            { name: 'Desktop', width: '' },
            { name: 'Tablet', width: '768px', widthMedia: '992px' },
            { name: 'Mobile', width: '375px', widthMedia: '480px' },
          ],
        },
      }) as unknown as GrapesJSEditor;

      // Add custom e-commerce blocks
      addEcommerceBlocks(editor);

      // Load initial data if available
      if (initialData?.builder_data && Object.keys(initialData.builder_data).length > 0) {
        editor.loadProjectData(initialData.builder_data);
      }

      // Track changes
      editor.on('change:changesCount', () => {
        setHasUnsavedChanges(true);
      });

      editorRef.current = editor;
      setEditorReady(true);
    };

    initEditor();

    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add e-commerce specific blocks
  const addEcommerceBlocks = (editor: GrapesJSEditor) => {
    // GrapesJS BlockManager is not exposed in the public type definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bm = (editor as any).BlockManager;

    bm.add('hero-section', {
      label: '🎯 Hero Section',
      category: 'E-Commerce',
      content: `
        <section style="padding: 80px 24px; text-align: center; background: linear-gradient(135deg, #1A1A2E 0%, #16213E 100%); color: white;">
          <h1 style="font-size: 48px; font-weight: 800; margin-bottom: 16px; font-family: Inter, sans-serif;">
            Bienvenue dans notre boutique
          </h1>
          <p style="font-size: 18px; color: #94A3B8; margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">
            Découvrez nos produits de qualité, sélectionnés avec soin pour vous.
          </p>
          <a href="#" style="display: inline-block; padding: 14px 32px; background: #16C784; color: white; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">
            Explorer le catalogue
          </a>
        </section>
      `,
    });

    bm.add('product-grid', {
      label: '🛍️ Product Grid',
      category: 'E-Commerce',
      content: `
        <section style="padding: 48px 24px; max-width: 1200px; margin: 0 auto;">
          <h2 style="font-size: 30px; font-weight: 700; margin-bottom: 32px; font-family: Inter, sans-serif;">
            Nos Produits
          </h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px;">
            <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
              <div style="aspect-ratio: 1; background: #F3F4F6;"></div>
              <div style="padding: 16px;">
                <p style="font-weight: 600; margin-bottom: 4px;">Nom du produit</p>
                <p style="color: #16C784; font-weight: 700;">85.000 TND</p>
              </div>
            </div>
            <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
              <div style="aspect-ratio: 1; background: #F3F4F6;"></div>
              <div style="padding: 16px;">
                <p style="font-weight: 600; margin-bottom: 4px;">Nom du produit</p>
                <p style="color: #16C784; font-weight: 700;">120.000 TND</p>
              </div>
            </div>
            <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
              <div style="aspect-ratio: 1; background: #F3F4F6;"></div>
              <div style="padding: 16px;">
                <p style="font-weight: 600; margin-bottom: 4px;">Nom du produit</p>
                <p style="color: #16C784; font-weight: 700;">45.000 TND</p>
              </div>
            </div>
          </div>
        </section>
      `,
    });

    bm.add('testimonials', {
      label: '⭐ Testimonials',
      category: 'E-Commerce',
      content: `
        <section style="padding: 48px 24px; background: #F9FAFB;">
          <h2 style="font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 32px; font-family: Inter, sans-serif;">
            Ce que disent nos clients
          </h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; max-width: 1000px; margin: 0 auto;">
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #F5A623; margin-bottom: 8px;">★★★★★</p>
              <p style="color: #374151; margin-bottom: 12px;">"Excellent service et produits de qualité. Je recommande vivement !"</p>
              <p style="font-weight: 600; font-size: 14px;">— Client satisfait</p>
            </div>
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #F5A623; margin-bottom: 8px;">★★★★★</p>
              <p style="color: #374151; margin-bottom: 12px;">"Livraison rapide et emballage soigné. Très satisfait de mon achat."</p>
              <p style="font-weight: 600; font-size: 14px;">— Client fidèle</p>
            </div>
          </div>
        </section>
      `,
    });

    bm.add('cta-banner', {
      label: '📢 CTA Banner',
      category: 'E-Commerce',
      content: `
        <section style="padding: 48px 24px; background: #16C784; text-align: center; color: white;">
          <h2 style="font-size: 30px; font-weight: 700; margin-bottom: 12px; font-family: Inter, sans-serif;">
            Offre spéciale — Livraison gratuite !
          </h2>
          <p style="font-size: 16px; opacity: 0.9; margin-bottom: 24px;">
            Sur toutes les commandes de plus de 100 TND. Offre limitée.
          </p>
          <a href="#" style="display: inline-block; padding: 14px 32px; background: white; color: #16C784; border-radius: 8px; font-weight: 700; text-decoration: none;">
            En profiter maintenant
          </a>
        </section>
      `,
    });

    bm.add('footer', {
      label: '📋 Footer',
      category: 'E-Commerce',
      content: `
        <footer style="padding: 48px 24px; background: #1A1A2E; color: #94A3B8;">
          <div style="max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 32px;">
            <div>
              <h3 style="color: white; font-weight: 700; margin-bottom: 16px;">Notre Boutique</h3>
              <p style="font-size: 14px; line-height: 1.6;">Votre destination pour des produits de qualité en Tunisie.</p>
            </div>
            <div>
              <h3 style="color: white; font-weight: 700; margin-bottom: 16px;">Liens</h3>
              <ul style="list-style: none; padding: 0; font-size: 14px; line-height: 2;">
                <li><a href="#" style="color: #94A3B8; text-decoration: none;">Accueil</a></li>
                <li><a href="#" style="color: #94A3B8; text-decoration: none;">Catalogue</a></li>
                <li><a href="#" style="color: #94A3B8; text-decoration: none;">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 style="color: white; font-weight: 700; margin-bottom: 16px;">Contact</h3>
              <p style="font-size: 14px; line-height: 2;">contact@maboutique.tn<br/>+216 XX XXX XXX</p>
            </div>
          </div>
          <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #2D2D4A; font-size: 12px;">
            Propulsé par 🐼 PandaMarket
          </div>
        </footer>
      `,
    });
  };

  // Save handler
  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    setSaving(true);
    try {
      const editor = editorRef.current;
      const res = await fetch(`/api/pd/page-builder/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          builder_data: editor.getProjectData(),
          html: editor.getHtml(),
          css: editor.getCss(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Erreur de sauvegarde');
      }
      setHasUnsavedChanges(false);
      setLastSaved(new Date().toLocaleTimeString('fr-FR'));
      onSave?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [pageId, onSave]);

  // Publish/Unpublish handler
  const handleTogglePublish = useCallback(async () => {
    if (!editorRef.current) return;
    setPublishing(true);
    try {
      const editor = editorRef.current;
      const newPublished = !isPublished;

      // Save content + toggle publish in one call
      const res = await fetch(`/api/pd/page-builder/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          builder_data: editor.getProjectData(),
          html: editor.getHtml(),
          css: editor.getCss(),
          is_published: newPublished,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Erreur');
      }
      setIsPublished(newPublished);
      setHasUnsavedChanges(false);
      setLastSaved(new Date().toLocaleTimeString('fr-FR'));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPublishing(false);
    }
  }, [pageId, isPublished]);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  return (
    <div className="h-screen flex flex-col bg-[#1A1A2E]">
      {/* Top Toolbar */}
      <div className="h-14 bg-[#0F0F23] border-b border-[#2D2D4A] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div className="w-px h-6 bg-[#2D2D4A]" />
          <span className="text-sm font-medium text-white">
            {initialData?.title || 'Page sans titre'}
          </span>
          {hasUnsavedChanges && (
            <span className="text-xs text-yellow-400">● Non sauvegardé</span>
          )}
          {lastSaved && !hasUnsavedChanges && (
            <span className="text-xs text-gray-500">Sauvegardé à {lastSaved}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !editorReady}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#16C784] text-white text-sm font-semibold rounded-md hover:bg-[#14b876] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>

          {/* Publish/Unpublish Button */}
          <button
            onClick={handleTogglePublish}
            disabled={publishing || !editorReady}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${
              isPublished
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
            }`}
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPublished ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {publishing ? '...' : isPublished ? 'Dépublier' : 'Publier'}
          </button>
        </div>
      </div>

      {/* Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Blocks */}
        <div className="w-64 bg-[#0F0F23] border-r border-[#2D2D4A] overflow-y-auto flex-shrink-0">
          <div className="p-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Blocs
            </h3>
          </div>
          <div id="gjs-blocks" />
        </div>

        {/* Center — Canvas */}
        <div className="flex-1 overflow-hidden">
          {!editorReady && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-[#16C784] animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Chargement de l&apos;éditeur...</p>
              </div>
            </div>
          )}
          <div ref={containerRef} className="h-full" />
        </div>

        {/* Right Panel — Styles & Layers */}
        <div className="w-72 bg-[#0F0F23] border-l border-[#2D2D4A] overflow-y-auto flex-shrink-0">
          <div className="border-b border-[#2D2D4A]">
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Styles
              </h3>
            </div>
            <div id="gjs-styles" />
          </div>
          <div>
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Calques
              </h3>
            </div>
            <div id="gjs-layers" />
          </div>
        </div>
      </div>
    </div>
  );
}
