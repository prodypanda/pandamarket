import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares';
import { query } from '../db/pool';

const router = Router();

const PUBLIC_SETTING_DEFAULTS = {
  marketplace_name: 'PandaMarket',
  marketplace_tagline: 'Le marketplace tunisien pour boutiques modernes',
  marketplace_logo_url: '',
  marketplace_theme: 'panda',
  marketplace_support_email: 'support@pandamarket.tn',
  marketplace_support_phone: '',
  chat_bubble_enabled: 'true',
  chat_bubble_position: 'bottom-right',
  default_currency: 'TND',
  maintenance_enabled: 'false',
  maintenance_title: 'Maintenance en cours',
  maintenance_message: 'Notre plateforme est en cours de maintenance. Nous serons de retour très bientôt.',
  maintenance_eta: '',
  maintenance_block_storefronts: 'false',
};

const PUBLIC_SETTING_KEYS = Object.keys(PUBLIC_SETTING_DEFAULTS);

router.get(
  '/settings',
  asyncHandler(async (_req: Request, res: Response) => {
    const { rows } = await query<{ key: string; value: string }>(
      `SELECT key, value FROM pd_platform_config WHERE key = ANY($1::text[])`,
      [PUBLIC_SETTING_KEYS],
    );

    const settings: Record<string, string> = { ...PUBLIC_SETTING_DEFAULTS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.status(200).json({ data: settings });
  }),
);

export default router;
