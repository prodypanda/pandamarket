import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { addressService } from '../services/address.service';
import { asyncHandler, requireAuth, validate } from '../middlewares';

const router = Router();

router.use(requireAuth);

const addressSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(30),
  address_line_1: z.string().trim().min(1).max(200),
  address_line_2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().max(100).nullable().optional(),
  postal_code: z.string().trim().min(1).max(20),
  country: z.string().length(2).default('TN'),
  is_default: z.boolean().optional(),
});

const updateAddressSchema = addressSchema.partial();

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const addresses = await addressService.list(req.user!.id);
    res.status(200).json({ data: addresses, addresses });
  }),
);

router.post(
  '/',
  validate(addressSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.create(req.user!.id, req.body);
    res.status(201).json({ data: address, address });
  }),
);

router.put(
  '/:id',
  validate(updateAddressSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.update(req.user!.id, req.params.id, req.body);
    res.status(200).json({ data: address, address });
  }),
);

router.put(
  '/:id/default',
  asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.setDefault(req.user!.id, req.params.id);
    res.status(200).json({ data: address, address });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await addressService.delete(req.user!.id, req.params.id);
    res.status(200).json({ success: true });
  }),
);

export default router;
