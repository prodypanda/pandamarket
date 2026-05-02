/**
 * Type augmentation: attach `req.user` and `req.requestId`.
 */

import 'express';
import { UserRole } from '@pandamarket/types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      role: UserRole;
      store_id: string | null;
    };
    requestId?: string;
    apiKey?: {
      id: string;
      store_id: string;
      scopes: string[];
    };
  }
}
