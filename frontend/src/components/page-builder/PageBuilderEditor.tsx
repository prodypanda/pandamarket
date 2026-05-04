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

    bm.add('newsletter', { label: '📧 Newsletter', category: 'Marketing', content: `<section style="padding:48px 24px;background:#F0FDF4;text-align:center;"><h2 style="font-size:24px;font-weight:700;margin-bottom:8px;">Restez informé</h2><p style="color:#6B7280;margin-bottom:24px;font-size:14px;">Inscrivez-vous pour recevoir nos offres exclusives.</p><div style="display:flex;gap:8px;max-width:420px;margin:0 auto;"><input type="email" placeholder="votre@email.com" style="flex:1;padding:12px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;"/><button style="padding:12px 24px;background:#16C784;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">S'inscrire</button></div></section>` });

    bm.add('video-hero', { label: '🎬 Video Hero', category: 'Media', content: `<section style="padding:48px 24px;text-align:center;background:#0F0F23;color:white;"><h2 style="font-size:30px;font-weight:700;margin-bottom:24px;">Découvrez notre histoire</h2><div style="max-width:720px;margin:0 auto;aspect-ratio:16/9;background:#1A1A2E;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:48px;">▶️</div><p style="color:#94A3B8;margin-top:16px;font-size:14px;">Regardez comment nos produits sont fabriqués</p></section>` });

    bm.add('faq-accordion', { label: '❓ FAQ', category: 'Content', content: `<section style="padding:48px 24px;max-width:800px;margin:0 auto;"><h2 style="font-size:30px;font-weight:700;text-align:center;margin-bottom:32px;">Questions fréquentes</h2><div style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;"><div style="padding:20px 24px;border-bottom:1px solid #E5E7EB;"><p style="font-weight:600;margin:0;">Quels sont les délais de livraison ?</p><p style="color:#6B7280;margin-top:8px;font-size:14px;">3 à 5 jours ouvrables partout en Tunisie.</p></div><div style="padding:20px 24px;border-bottom:1px solid #E5E7EB;"><p style="font-weight:600;margin:0;">Comment retourner un produit ?</p><p style="color:#6B7280;margin-top:8px;font-size:14px;">14 jours pour retourner un produit non utilisé.</p></div><div style="padding:20px 24px;"><p style="font-weight:600;margin:0;">Quels modes de paiement ?</p><p style="color:#6B7280;margin-top:8px;font-size:14px;">Flouci, Konnect, Mandat Minute et COD.</p></div></div></section>` });

    bm.add('team-about', { label: '👥 Team / About', category: 'Content', content: `<section style="padding:48px 24px;text-align:center;"><h2 style="font-size:30px;font-weight:700;margin-bottom:8px;">Notre Équipe</h2><p style="color:#6B7280;margin-bottom:32px;">Des passionnés dédiés à vous offrir le meilleur.</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:700px;margin:0 auto;"><div><div style="width:80px;height:80px;border-radius:50%;background:#E5E7EB;margin:0 auto 12px;"></div><p style="font-weight:600;">Ahmed</p><p style="font-size:14px;color:#6B7280;">Fondateur</p></div><div><div style="width:80px;height:80px;border-radius:50%;background:#E5E7EB;margin:0 auto 12px;"></div><p style="font-weight:600;">Sarra</p><p style="font-size:14px;color:#6B7280;">Design</p></div><div><div style="width:80px;height:80px;border-radius:50%;background:#E5E7EB;margin:0 auto 12px;"></div><p style="font-weight:600;">Youssef</p><p style="font-size:14px;color:#6B7280;">Logistique</p></div></div></section>` });

    bm.add('countdown-timer', { label: '⏰ Countdown', category: 'Marketing', content: `<section style="padding:48px 24px;background:linear-gradient(135deg,#EA3943,#FF6B6B);text-align:center;color:white;"><p style="font-size:14px;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:8px;">Offre limitée</p><h2 style="font-size:36px;font-weight:800;margin-bottom:24px;">Soldes Flash !</h2><div style="display:flex;justify-content:center;gap:16px;margin-bottom:24px;"><div style="background:rgba(255,255,255,0.2);padding:16px 20px;border-radius:8px;min-width:70px;"><p style="font-size:32px;font-weight:800;margin:0;">02</p><p style="font-size:11px;margin:0;">JOURS</p></div><div style="background:rgba(255,255,255,0.2);padding:16px 20px;border-radius:8px;min-width:70px;"><p style="font-size:32px;font-weight:800;margin:0;">14</p><p style="font-size:11px;margin:0;">HEURES</p></div><div style="background:rgba(255,255,255,0.2);padding:16px 20px;border-radius:8px;min-width:70px;"><p style="font-size:32px;font-weight:800;margin:0;">37</p><p style="font-size:11px;margin:0;">MIN</p></div></div><a href="#" style="display:inline-block;padding:14px 32px;background:white;color:#EA3943;border-radius:8px;font-weight:700;text-decoration:none;">Voir les offres</a></section>` });

    bm.add('image-carousel', { label: '🖼️ Carousel', category: 'Media', content: `<section style="padding:48px 24px;"><div style="display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:16px;"><div style="min-width:300px;aspect-ratio:4/3;background:#F3F4F6;border-radius:12px;scroll-snap-align:start;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#9CA3AF;">Image 1</div><div style="min-width:300px;aspect-ratio:4/3;background:#F3F4F6;border-radius:12px;scroll-snap-align:start;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#9CA3AF;">Image 2</div><div style="min-width:300px;aspect-ratio:4/3;background:#F3F4F6;border-radius:12px;scroll-snap-align:start;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#9CA3AF;">Image 3</div><div style="min-width:300px;aspect-ratio:4/3;background:#F3F4F6;border-radius:12px;scroll-snap-align:start;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#9CA3AF;">Image 4</div></div></section>` });

    bm.add('brand-logos', { label: '🏢 Brand Logos', category: 'Marketing', content: `<section style="padding:32px 24px;background:#F9FAFB;text-align:center;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:0.15em;color:#9CA3AF;margin-bottom:24px;">Ils nous font confiance</p><div style="display:flex;justify-content:center;align-items:center;gap:40px;flex-wrap:wrap;opacity:0.5;"><div style="width:100px;height:40px;background:#D1D5DB;border-radius:4px;"></div><div style="width:100px;height:40px;background:#D1D5DB;border-radius:4px;"></div><div style="width:100px;height:40px;background:#D1D5DB;border-radius:4px;"></div><div style="width:100px;height:40px;background:#D1D5DB;border-radius:4px;"></div><div style="width:100px;height:40px;background:#D1D5DB;border-radius:4px;"></div></div></section>` });

    bm.add('pricing-table', { label: '💰 Pricing', category: 'Content', content: `<section style="padding:48px 24px;text-align:center;"><h2 style="font-size:30px;font-weight:700;margin-bottom:32px;">Nos Tarifs</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:24px;max-width:900px;margin:0 auto;"><div style="border:1px solid #E5E7EB;border-radius:12px;padding:32px 24px;"><h3 style="font-weight:600;margin-bottom:8px;">Basic</h3><p style="font-size:36px;font-weight:800;color:#16C784;margin-bottom:16px;">29 <span style="font-size:16px;">TND</span></p><ul style="list-style:none;padding:0;font-size:14px;color:#6B7280;line-height:2.2;text-align:left;"><li>✓ Feature 1</li><li>✓ Feature 2</li></ul><a href="#" style="display:block;margin-top:24px;padding:12px;background:#16C784;color:white;border-radius:8px;text-decoration:none;font-weight:600;text-align:center;">Choisir</a></div><div style="border:2px solid #16C784;border-radius:12px;padding:32px 24px;"><h3 style="font-weight:600;margin-bottom:8px;">Pro</h3><p style="font-size:36px;font-weight:800;color:#16C784;margin-bottom:16px;">59 <span style="font-size:16px;">TND</span></p><ul style="list-style:none;padding:0;font-size:14px;color:#6B7280;line-height:2.2;text-align:left;"><li>✓ Feature 1</li><li>✓ Feature 2</li><li>✓ Feature 3</li></ul><a href="#" style="display:block;margin-top:24px;padding:12px;background:#16C784;color:white;border-radius:8px;text-decoration:none;font-weight:600;text-align:center;">Choisir</a></div></div></section>` });

    bm.add('contact-form', { label: '📝 Contact Form', category: 'Content', content: `<section style="padding:48px 24px;max-width:600px;margin:0 auto;"><h2 style="font-size:30px;font-weight:700;text-align:center;margin-bottom:32px;">Contactez-nous</h2><form style="display:flex;flex-direction:column;gap:16px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;"><input type="text" placeholder="Nom" style="padding:12px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;"/><input type="email" placeholder="Email" style="padding:12px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;"/></div><input type="text" placeholder="Sujet" style="padding:12px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;"/><textarea placeholder="Votre message..." rows="5" style="padding:12px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;resize:vertical;"></textarea><button type="submit" style="padding:14px;background:#16C784;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:16px;">Envoyer</button></form></section>` });

    bm.add('map-embed', { label: '📍 Map', category: 'Content', content: `<section style="padding:48px 24px;"><h2 style="font-size:24px;font-weight:700;text-align:center;margin-bottom:24px;">Nous trouver</h2><div style="max-width:800px;margin:0 auto;aspect-ratio:16/9;background:#E5E7EB;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;"><p style="text-align:center;">📍 Intégrez votre carte Google Maps ici</p></div></section>` });

    bm.add('blog-section', { label: '📰 Blog', category: 'Content', content: `<section style="padding:48px 24px;max-width:1200px;margin:0 auto;"><h2 style="font-size:30px;font-weight:700;margin-bottom:32px;">Notre Blog</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;"><article style="border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;"><div style="aspect-ratio:16/9;background:#F3F4F6;"></div><div style="padding:20px;"><p style="font-size:12px;color:#16C784;font-weight:600;margin-bottom:8px;">CONSEILS</p><h3 style="font-weight:600;margin-bottom:8px;">Comment choisir le bon produit</h3><p style="font-size:14px;color:#6B7280;">Découvrez nos conseils...</p></div></article><article style="border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;"><div style="aspect-ratio:16/9;background:#F3F4F6;"></div><div style="padding:20px;"><p style="font-size:12px;color:#16C784;font-weight:600;margin-bottom:8px;">NOUVEAUTÉS</p><h3 style="font-weight:600;margin-bottom:8px;">Les tendances de la saison</h3><p style="font-size:14px;color:#6B7280;">Les dernières tendances...</p></div></article></div></section>` });

    bm.add('size-guide', { label: '📏 Size Guide', category: 'E-Commerce', content: `<section style="padding:48px 24px;max-width:800px;margin:0 auto;"><h2 style="font-size:24px;font-weight:700;text-align:center;margin-bottom:24px;">Guide des tailles</h2><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="background:#F3F4F6;"><th style="padding:12px 16px;text-align:left;border-bottom:2px solid #E5E7EB;">Taille</th><th style="padding:12px 16px;text-align:center;border-bottom:2px solid #E5E7EB;">Poitrine</th><th style="padding:12px 16px;text-align:center;border-bottom:2px solid #E5E7EB;">Taille</th><th style="padding:12px 16px;text-align:center;border-bottom:2px solid #E5E7EB;">Hanches</th></tr></thead><tbody><tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;font-weight:600;">S</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">86-91</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">66-71</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">91-96</td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;font-weight:600;">M</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">91-96</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">71-76</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">96-101</td></tr><tr><td style="padding:12px 16px;font-weight:600;">L</td><td style="padding:12px 16px;text-align:center;">96-101</td><td style="padding:12px 16px;text-align:center;">76-81</td><td style="padding:12px 16px;text-align:center;">101-106</td></tr></tbody></table></section>` });

    bm.add('shipping-info', { label: '🚚 Shipping Info', category: 'E-Commerce', content: `<section style="padding:48px 24px;background:#F9FAFB;"><h2 style="font-size:24px;font-weight:700;text-align:center;margin-bottom:32px;">Livraison & Retours</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:24px;max-width:900px;margin:0 auto;"><div style="text-align:center;padding:24px;"><div style="font-size:32px;margin-bottom:12px;">🚚</div><h3 style="font-weight:600;margin-bottom:8px;">Livraison rapide</h3><p style="font-size:14px;color:#6B7280;">3-5 jours ouvrables en Tunisie</p></div><div style="text-align:center;padding:24px;"><div style="font-size:32px;margin-bottom:12px;">🔄</div><h3 style="font-weight:600;margin-bottom:8px;">Retours gratuits</h3><p style="font-size:14px;color:#6B7280;">14 jours pour changer d'avis</p></div><div style="text-align:center;padding:24px;"><div style="font-size:32px;margin-bottom:12px;">🔒</div><h3 style="font-weight:600;margin-bottom:8px;">Paiement sécurisé</h3><p style="font-size:14px;color:#6B7280;">Flouci, Konnect, Mandat Minute</p></div></div></section>` });

    bm.add('return-policy', { label: '🔄 Return Policy', category: 'E-Commerce', content: `<section style="padding:48px 24px;max-width:800px;margin:0 auto;"><h2 style="font-size:30px;font-weight:700;text-align:center;margin-bottom:32px;">Politique de retour</h2><div style="background:#F9FAFB;border-radius:12px;padding:32px;"><div style="margin-bottom:24px;"><h3 style="font-weight:600;margin-bottom:8px;">📦 Délai de retour</h3><p style="font-size:14px;color:#6B7280;">14 jours à compter de la réception.</p></div><div style="margin-bottom:24px;"><h3 style="font-weight:600;margin-bottom:8px;">✅ Conditions</h3><p style="font-size:14px;color:#6B7280;">Produit non utilisé, emballage d'origine.</p></div><div><h3 style="font-weight:600;margin-bottom:8px;">💰 Remboursement</h3><p style="font-size:14px;color:#6B7280;">Sous 5-7 jours ouvrables après vérification.</p></div></div></section>` });

    bm.add('instagram-feed', { label: '📸 Instagram', category: 'Marketing', content: `<section style="padding:48px 24px;text-align:center;"><h2 style="font-size:24px;font-weight:700;margin-bottom:8px;">Suivez-nous sur Instagram</h2><p style="color:#6B7280;margin-bottom:24px;font-size:14px;">@votreboutique</p><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-width:600px;margin:0 auto;"><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div></div></section>` });
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
