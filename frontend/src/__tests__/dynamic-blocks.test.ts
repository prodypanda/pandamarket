import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { SafePageRenderer } from '../components/page-builder/SafePageRenderer';
import { renderPageBuilderDynamicBlocks, type PageBuilderDynamicContext } from '../components/page-builder/dynamic-blocks';

const baseContext: PageBuilderDynamicContext = {
  storeName: 'Panda Test Store',
  primaryColor: '#16C784',
  shippingMode: 'platform_unified',
  shippingPolicy: 'Livraison sous 48h avec suivi.',
  returnsPolicy: 'Retours acceptés sous 7 jours.',
  paymentPolicy: 'Paiement à la livraison et Mandat Minute acceptés.',
  products: [],
};

const productContext: PageBuilderDynamicContext = {
  ...baseContext,
  storePathBase: '/store/demo',
  products: [{
    id: 'prod_1',
    title: 'Cool Shoes',
    slug: 'cool-shoes',
    price: 129,
    thumbnail: '/pd-product-images/cool-shoes.jpg',
    category: 'Shoes',
  }],
};

describe('Page Builder dynamic policy blocks', () => {
  it('renders shipping policy with configured store policy text', () => {
    const html = renderPageBuilderDynamicBlocks(
      '<section data-pd-block="shipping-policy" data-pd-title="Infos livraison"></section>',
      baseContext,
    );

    expect(html).toContain('data-pd-rendered-block="shipping-policy"');
    expect(html).toContain('Infos livraison');
    expect(html).toContain('Livraison unifiée PandaMarket');
    expect(html).toContain('Livraison sous 48h avec suivi.');
  });

  it('renders payment policy without exposing provider configuration secrets', () => {
    const html = renderPageBuilderDynamicBlocks(
      '<section data-pd-block="payment-policy" data-pd-title="Paiement"></section>',
      baseContext,
    );

    expect(html).toContain('data-pd-rendered-block="payment-policy"');
    expect(html).toContain('Flouci');
    expect(html).toContain('Konnect');
    expect(html).toContain('Paiement à la livraison et Mandat Minute acceptés.');
    expect(html).not.toContain('payment_config');
    expect(html).not.toContain('secret');
  });

  it('renders combined store policies with shipping, returns, and payment text', () => {
    const html = renderPageBuilderDynamicBlocks(
      '<section data-pd-block="store-policies" data-pd-subtitle="Avant de commander"></section>',
      baseContext,
    );

    expect(html).toContain('data-pd-rendered-block="store-policies"');
    expect(html).toContain('Avant de commander');
    expect(html).toContain('Livraison sous 48h avec suivi.');
    expect(html).toContain('Retours acceptés sous 7 jours.');
    expect(html).toContain('Paiement à la livraison et Mandat Minute acceptés.');
  });

  it('renders store policies when GrapesJS nests them inside another dynamic section', () => {
    const html = renderPageBuilderDynamicBlocks(
      '<section data-pd-block="payment-policy"><div>Paiement placeholder</div><section data-pd-block="store-policies" data-pd-title="Politiques imbriquées"><div>Placeholder</div></section></section>',
      baseContext,
    );

    expect(html).toContain('data-pd-rendered-block="payment-policy"');
    expect(html).toContain('data-pd-rendered-block="store-policies"');
    expect(html).toContain('Politiques imbriquées');
    expect(html).toContain('Retours acceptés sous 7 jours.');
  });

  it('includes dynamic policy content in the initial renderer markup', () => {
    const html = renderToString(createElement(SafePageRenderer, {
      html: '<section data-pd-block="shipping-policy" data-pd-title="SSR livraison"></section><script>alert("xss")</script>',
      css: '',
      dynamicContext: baseContext,
    }));

    expect(html).toContain('data-pd-rendered-block="shipping-policy"');
    expect(html).toContain('SSR livraison');
    expect(html).toContain('Livraison sous 48h avec suivi.');
    expect(html).not.toContain('<script>');
  });

  it('renders store hero background images from media attributes safely', () => {
    const html = renderPageBuilderDynamicBlocks(
      '<section data-pd-block="store-hero" data-pd-title="Hero média" data-pd-image-url="http://localhost:9100/pd-product-images/hero.jpg" data-pd-image-position="center top" data-pd-image-fit="contain"></section><section data-pd-block="store-hero" data-pd-image-url="javascript:alert(1)"></section>',
      baseContext,
    );

    expect(html).toContain('Hero média');
    expect(html).toContain("url('/pd-product-images/hero.jpg')");
    expect(html).toContain('background-position:center center,center top');
    expect(html).toContain('background-size:cover,contain');
    expect(html).not.toContain('javascript:alert');
  });

  it('adds analytics markers to product grid product links and CTA links', () => {
    const html = renderPageBuilderDynamicBlocks(
      '<section data-pd-block="product-grid" data-pd-title="Produits"></section>',
      productContext,
    );

    expect(html).toContain('data-pd-rendered-block="product-grid"');
    expect(html).toContain('href="/store/demo/products/shoes/cool-shoes"');
    expect(html).toContain('data-pd-analytics="product_click"');
    expect(html).toContain('data-pd-product-id="prod_1"');
    expect(html).toContain('href="/store/demo/products"');
    expect(html).toContain('data-pd-analytics="cta_click"');
  });

  it('adds analytics markers to store hero CTA links', () => {
    const html = renderPageBuilderDynamicBlocks(
      '<section data-pd-block="store-hero" data-pd-title="Bienvenue"></section>',
      productContext,
    );

    expect(html).toContain('data-pd-rendered-block="store-hero"');
    expect(html).toContain('href="/store/demo/products"');
    expect(html).toContain('data-pd-analytics="cta_click"');
    expect(html).toContain('Explorer la boutique');
  });

  it('preserves analytics data attributes through initial renderer sanitization', () => {
    const html = renderToString(createElement(SafePageRenderer, {
      html: '<a href="/products/cool-shoes" data-pd-analytics="product_click" data-pd-product-id="prod_1" onclick="alert(1)">Cool Shoes</a><script>alert("xss")</script>',
      css: '',
      dynamicContext: baseContext,
    }));

    expect(html).toContain('data-pd-analytics="product_click"');
    expect(html).toContain('data-pd-product-id="prod_1"');
    expect(html).toContain('href="/products/cool-shoes"');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<script>');
  });

  it('keeps preset template display markup inert and scopes template CSS to page content', () => {
    const html = renderToString(createElement(SafePageRenderer, {
      html: '<form style="display: flex; flex-direction: column;"><input type="email" placeholder="Email" /><button>Envoyer</button></form>',
      css: '*, *::before { box-sizing: border-box; } section { overflow-x: hidden; } @media (max-width: 639px) { section { padding-left: 16px !important; } }',
      dynamicContext: baseContext,
    }));

    expect(html).toContain('data-pd-form-placeholder');
    expect(html).toContain('placeholder="Email"');
    expect(html).not.toContain('<form');
    expect(html).toContain('.gjs-page-content *');
    expect(html).toContain('.gjs-page-content section');
  });

  it('strips full-document body wrappers before rendering inside page content', () => {
    const html = renderToString(createElement(SafePageRenderer, {
      html: '<body><section><h1>Merci pour votre commande !</h1></section></body>',
      css: '',
      dynamicContext: baseContext,
    }));

    expect(html).toContain('Merci pour votre commande !');
    expect(html).not.toContain('<body>');
    expect(html).not.toContain('</body>');
  });

  it('hardens initial renderer markup against risky urls and inline styles', () => {
    const html = renderToString(createElement(SafePageRenderer, {
      html: '<img src=" javascript:alert(1)" srcset="javascript:alert(1) 1x, /pd-product-images/safe.jpg 2x" style="background:url(javascript:alert(1));color:red;behavior:url(x)" /><a href="vbscript:alert(1)" style="background-image:url(data:text/html,<svg></svg>);color:blue">Lien</a>',
      css: '@import url("https://evil.test/x.css"); section { background:url("vbscript:alert(1)"); } .x { background:url(data:text/html,<svg>); color:red; }',
      dynamicContext: baseContext,
    }));

    expect(html).toContain('/pd-product-images/safe.jpg 2x');
    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('vbscript:alert');
    expect(html).not.toContain('data:text/html');
    expect(html).not.toContain('@import');
    expect(html).not.toContain('behavior:url');
  });
});
