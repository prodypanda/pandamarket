/**
 * Unit tests for AuthService.
 * Tests registration, login, lockout, refresh, forgot/reset password.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
};
vi.mock('../db/redis', () => ({
  getRedis: vi.fn(() => mockRedis),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn(() => 'test-user-id'),
  sha256: vi.fn((input: string) => `sha256_${input}`),
}));

vi.mock('../utils/jwt', () => ({
  signAccessToken: vi.fn(() => 'mock-access-token'),
  signRefreshToken: vi.fn(() => 'mock-refresh-token'),
  verifyRefreshToken: vi.fn(() => ({ sub: 'user-1' })),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../config', () => ({
  config: {
    bcryptRounds: 4, // Low for test speed
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => 'hashed_password'),
    compare: vi.fn(async (plain: string, hash: string) => plain === 'correct_password'),
  },
}));

import { query } from '../db/pool';
import { getRedis } from '../db/redis';
import { AuthService } from '../services/auth.service';

const mockQuery = vi.mocked(query);

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  describe('register', () => {
    it('should register a new user with hashed password', async () => {
      // No existing user
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // Insert user
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-user-id',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          first_name: 'Test',
          last_name: 'User',
          role: 'Customer',
          store_id: null,
          email_verified: false,
          is_active: true,
          phone: null,
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const user = await authService.register({
        email: 'test@example.com',
        password: 'securepassword123',
        first_name: 'Test',
        last_name: 'User',
      });

      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('Customer');
    });

    it('should reject registration with existing email', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'securepassword123',
          first_name: 'Test',
          last_name: 'User',
        }),
      ).rejects.toThrow('An account already exists with this email');
    });

    it('should reject registration with short password', async () => {
      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'short',
          first_name: 'Test',
          last_name: 'User',
        }),
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should reject registration with invalid email', async () => {
      await expect(
        authService.register({
          email: 'not-an-email',
          password: 'securepassword123',
          first_name: 'Test',
          last_name: 'User',
        }),
      ).rejects.toThrow('Invalid email format');
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      mockRedis.get.mockResolvedValue(null);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          first_name: 'Test',
          last_name: 'User',
          role: 'Customer',
          store_id: null,
          email_verified: true,
          is_active: true,
          phone: null,
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // Update last_login_at
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const user = await authService.login('test@example.com', 'correct_password');
      expect(user.id).toBe('user-1');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should reject login with wrong password', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.incr.mockResolvedValue(1);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          first_name: 'Test',
          last_name: 'User',
          role: 'Customer',
          store_id: null,
          email_verified: true,
          is_active: true,
          phone: null,
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        authService.login('test@example.com', 'wrong_password'),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should lock account after 5 failed attempts', async () => {
      mockRedis.get.mockResolvedValue('5');
      mockRedis.ttl.mockResolvedValue(600);

      await expect(
        authService.login('test@example.com', 'any_password'),
      ).rejects.toThrow('Too many failed login attempts');
    });

    it('should reject login for suspended account', async () => {
      mockRedis.get.mockResolvedValue(null);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          password_hash: 'hashed_password',
          first_name: 'Test',
          last_name: 'User',
          role: 'Customer',
          store_id: null,
          email_verified: true,
          is_active: false,
          phone: null,
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        authService.login('test@example.com', 'correct_password'),
      ).rejects.toThrow('Your account has been suspended');
    });
  });

  describe('issueTokens', () => {
    it('should return access and refresh tokens', async () => {
      // Store refresh token
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const tokens = await authService.issueTokens({
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'hash',
        first_name: 'Test',
        last_name: 'User',
        role: 'Customer' as any,
        store_id: null,
        email_verified: true,
        is_active: true,
        phone: null,
      });

      expect(tokens.access_token).toBe('mock-access-token');
      expect(tokens.refresh_token).toBe('mock-refresh-token');
    });
  });

  describe('forgotPassword', () => {
    it('should not throw for non-existent email (prevent enumeration)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(authService.forgotPassword('nonexistent@example.com')).resolves.not.toThrow();
    });

    it('should store reset token in Redis for existing user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-1' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await authService.forgotPassword('test@example.com');

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('pd:reset_token:'),
        'user-1',
        'EX',
        3600,
      );
    });
  });

  describe('resetPassword', () => {
    it('should reject with invalid token', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        authService.resetPassword('invalid-token', 'newpassword123'),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should reject short password', async () => {
      await expect(
        authService.resetPassword('valid-token', 'short'),
      ).rejects.toThrow('Password must be at least 8 characters');
    });
  });

  describe('logout', () => {
    it('should revoke all refresh tokens', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 2,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      await authService.logout('user-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pd_refresh_tokens SET revoked_at'),
        ['user-1'],
      );
    });
  });
});
