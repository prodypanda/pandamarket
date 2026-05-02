/**
 * JWT helpers — sign and verify access/refresh tokens.
 */

import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { PdAuthenticationError, PdErrorCode } from '../errors';
import { UserRole } from '@pandamarket/types';

export interface AccessTokenPayload extends JwtPayload {
  sub: string; // user id
  role: UserRole;
  store_id: string | null;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  type: 'refresh';
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = { expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwt.secret, options);
}

export function signRefreshToken(userId: string): string {
  const options: SignOptions = { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId, type: 'refresh' }, config.jwt.secret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as AccessTokenPayload;
    if (!payload.sub || !payload.role) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Malformed access token');
    }
    return payload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_EXPIRED, 'Access token expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Invalid access token');
    }
    throw err;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as RefreshTokenPayload;
    if (payload.type !== 'refresh') {
      throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Not a refresh token');
    }
    return payload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_REFRESH_EXPIRED, 'Refresh token expired');
    }
    throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Invalid refresh token');
  }
}
