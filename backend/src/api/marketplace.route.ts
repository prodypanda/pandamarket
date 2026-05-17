import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares';
import { platformConfigService } from '../services/platform-config.service';
import { getRequestIp, isMaintenanceAllowedIp } from '../middlewares/maintenance.middleware';

const router = Router();

router.get(
  '/settings',
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ data: await platformConfigService.getPublicSettings() });
  }),
);

router.get(
  '/maintenance',
  asyncHandler(async (req: Request, res: Response) => {
    const settings = await platformConfigService.getSettings();
    const maintenanceEnabled = Boolean(settings.maintenance_enabled);
    const clientAllowed = isMaintenanceAllowedIp(getRequestIp(req), String(settings.maintenance_allowed_ips || ''));
    res.status(200).json({
      data: {
        maintenance_enabled: maintenanceEnabled,
        maintenance_active_for_request: maintenanceEnabled && !clientAllowed,
        maintenance_title: String(settings.maintenance_title || ''),
        maintenance_message: String(settings.maintenance_message || ''),
        maintenance_illustration_url: String(settings.maintenance_illustration_url || ''),
        maintenance_eta: String(settings.maintenance_eta || ''),
        maintenance_block_storefronts: Boolean(settings.maintenance_block_storefronts),
        marketplace_name: String(settings.marketplace_name || ''),
        marketplace_logo_url: String(settings.marketplace_logo_url || ''),
        marketplace_logo_light_url: String(settings.marketplace_logo_light_url || ''),
        marketplace_logo_dark_url: String(settings.marketplace_logo_dark_url || ''),
        marketplace_public_url: String(settings.marketplace_public_url || ''),
      },
    });
  }),
);

export default router;
