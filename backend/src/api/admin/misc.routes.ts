import { asyncHandler, validate } from '../../middlewares';
import { accountSecurityService } from '../../services/account-security.service';
import { fileAssetService } from '../../services/file-asset.service';
import { urlOrPathSchema, userSecurityActivityParamsSchema } from './_shared';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** Misc admin routes (asset uploads, security activity) — extracted from the admin.route.ts header (E15). */

const router = Router();


router.get(
  '/users/:id/security-activity',
  validate(userSecurityActivityParamsSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const activity = await accountSecurityService.listAdminUserSecurityActivity(req.params.id);
    res.status(200).json({ data: activity, ...activity });
  }),
);

const assetListQuerySchema = z.object({
  type: z.enum(['image', 'document']).optional(),
  folder: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(60),
});

const registerAssetSchema = z.object({
  url: urlOrPathSchema,
  file_key: z.string().min(1).max(500),
  bucket: z.string().min(1).max(120),
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(100),
  file_size: z.number().int().min(0).nullable().optional(),
  purpose: z.string().min(1).max(40).default('marketplace_asset'),
  metadata: z.record(z.unknown()).optional(),
});

router.get(
  '/assets',
  validate(assetListQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const queryParams = req.query as unknown as {
      type?: 'image' | 'document';
      folder?: string;
      limit: number;
    };
    const assets = await fileAssetService.listAssets({
      scope: 'platform',
      type: queryParams.type,
      folder: queryParams.folder,
      limit: queryParams.limit,
    });
    res.status(200).json({ data: assets });
  }),
);

router.post(
  '/assets',
  validate(registerAssetSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const asset = await fileAssetService.registerAsset({
      scope: 'platform',
      purpose: req.body.purpose,
      url: req.body.url,
      file_key: req.body.file_key,
      bucket: req.body.bucket,
      filename: req.body.filename,
      content_type: req.body.content_type,
      file_size: req.body.file_size ?? null,
      owner_user_id: req.user!.id,
      store_id: null,
      metadata: req.body.metadata,
    });
    res.status(201).json({ asset });
  }),
);

export default router;
