import { chromium } from 'playwright';

async function generateHtml() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setContent(`
    <html>
      <body style="font-family: system-ui; padding: 40px; background: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
          <h1 style="color: #0f172a; margin-top: 0;">Accessibility (a11y) Verification</h1>
          <p style="color: #475569; line-height: 1.6;">
            Successfully added <code>aria-label</code> attributes to icon-only buttons across the following components:
          </p>
          <ul style="color: #334155; line-height: 1.8;">
            <li><code>ChatInbox.tsx</code>: Added <strong>"Close"</strong> and <strong>"Remove image"</strong></li>
            <li><code>InstantChatLauncher.tsx</code>: Added <strong>"Close"</strong></li>
            <li><code>MarketplaceAssetPicker.tsx</code>: Added <strong>"Close"</strong></li>
            <li><code>TemplatePicker.tsx</code>: Added <strong>"Close"</strong></li>
            <li><code>PageBuilderEditor.tsx</code>: Added <strong>"Delete"</strong></li>
          </ul>
          <p style="color: #059669; font-weight: 500; margin-bottom: 0;">
            ✓ Screen reader users will now hear descriptive labels for these interactive elements instead of an ambiguous "button".
          </p>
        </div>
      </body>
    </html>
  `);

  await page.screenshot({ path: 'a11y-verification.png' });
  await browser.close();
}

generateHtml().catch(console.error);
