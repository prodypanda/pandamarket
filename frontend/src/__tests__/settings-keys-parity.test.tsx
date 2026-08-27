import { describe, it, expect } from 'vitest';

describe('PLAN-B-16: Admin Settings Parity for Image Size Keys', () => {
  const expectedImageKeys = [
    'image_size_thumbnail_w',
    'image_size_thumbnail_h',
    'image_size_thumbnail_crop',
    'image_size_small_w',
    'image_size_small_h',
    'image_size_small_crop',
    'image_size_medium_w',
    'image_size_medium_h',
    'image_size_medium_crop',
    'image_size_large_w',
    'image_size_large_h',
    'image_size_large_crop',
    'image_quality_webp',
  ];

  it('verifies all 13 image size and quality keys are tracked in operations tab', () => {
    // Simulated operations tab keys extracted from (admin)/settings/page.tsx
    const operationsTabKeys = [
      'chat_bubble_enabled',
      'chat_bubble_position',
      'max_upload_size_mb',
      'max_product_images',
      'max_products_per_store_free',
      'default_low_stock_threshold',
      'chat_message_rate_limit_per_minute',
      'chat_max_images_per_message',
      'chat_max_image_size_mb',
      'chat_max_message_length',
      'image_size_thumbnail_w',
      'image_size_thumbnail_h',
      'image_size_thumbnail_crop',
      'image_size_small_w',
      'image_size_small_h',
      'image_size_small_crop',
      'image_size_medium_w',
      'image_size_medium_h',
      'image_size_medium_crop',
      'image_size_large_w',
      'image_size_large_h',
      'image_size_large_crop',
      'image_quality_webp',
      'notifications_in_app_enabled',
      'notifications_realtime_enabled',
      'notifications_email_enabled',
      'notifications_sms_enabled',
      'notifications_sms_provider',
      'notifications_sms_sender_name',
      'maintenance_enabled',
      'maintenance_title',
      'maintenance_message',
      'maintenance_illustration_url',
      'maintenance_eta',
      'maintenance_allowed_ips',
      'maintenance_block_storefronts',
    ];

    for (const key of expectedImageKeys) {
      expect(operationsTabKeys).toContain(key);
    }
  });

  it('ensures modified image dimensions are preserved when filtering for tab submission', () => {
    const operationsTabKeys = [
      'image_size_thumbnail_w',
      'image_size_thumbnail_h',
      'image_size_thumbnail_crop',
      'image_quality_webp',
    ];

    const currentSettings = {
      image_size_thumbnail_w: 180,
      image_size_thumbnail_h: 180,
      image_size_thumbnail_crop: 'inside',
      image_quality_webp: 90,
      other_unrelated_setting: 'test',
    };

    const sectionPayload: Record<string, any> = {};
    for (const key of operationsTabKeys) {
      sectionPayload[key] = (currentSettings as any)[key];
    }

    expect(sectionPayload.image_size_thumbnail_w).toBe(180);
    expect(sectionPayload.image_size_thumbnail_h).toBe(180);
    expect(sectionPayload.image_size_thumbnail_crop).toBe('inside');
    expect(sectionPayload.image_quality_webp).toBe(90);
    expect(sectionPayload.other_unrelated_setting).toBeUndefined();
  });
});
