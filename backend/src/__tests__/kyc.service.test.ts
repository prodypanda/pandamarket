/**
 * Unit tests for KycService.
 * Tests KYC submission, status retrieval, approval, rejection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn(() => 'test-kyc-id'),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../services/store.service', () => ({
  storeService: {
    markVerified: vi.fn(),
  },
}));

import { query, transaction } from '../db/pool';
import { KycService } from '../services/kyc.service';

const mockQuery = vi.mocked(query);

describe('KycService', () => {
  let kycService: KycService;

  beforeEach(() => {
    vi.clearAllMocks();
    kycService = new KycService();
  });

  describe('submit', () => {
    it('should create a new KYC submission', async () => {
      // getByStore returns null (no existing submission)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // Insert
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-kyc-id',
          store_id: 'store-1',
          rc_document_url: 'https://s3/rc.pdf',
          cin_document_url: 'https://s3/cin.pdf',
          phone_number: '+21698765432',
          phone_verified: false,
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          notes: null,
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await kycService.submit({
        store_id: 'store-1',
        rc_document_url: 'https://s3/rc.pdf',
        cin_document_url: 'https://s3/cin.pdf',
        phone_number: '+21698765432',
      });

      expect(result.status).toBe('pending');
      expect(result.store_id).toBe('store-1');
    });

    it('should reject submission when already approved', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'kyc-1',
          store_id: 'store-1',
          status: 'approved',
          created_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        kycService.submit({
          store_id: 'store-1',
          rc_document_url: 'https://s3/rc.pdf',
          cin_document_url: 'https://s3/cin.pdf',
          phone_number: '+21698765432',
        }),
      ).rejects.toThrow('Your store is already verified');
    });

    it('should reject submission when already pending', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'kyc-1',
          store_id: 'store-1',
          status: 'pending',
          created_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        kycService.submit({
          store_id: 'store-1',
          rc_document_url: 'https://s3/rc.pdf',
          cin_document_url: 'https://s3/cin.pdf',
          phone_number: '+21698765432',
        }),
      ).rejects.toThrow('Documents already submitted');
    });

    it('should allow re-submission after rejection', async () => {
      // Existing rejected submission
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'kyc-1',
          store_id: 'store-1',
          status: 'rejected',
          created_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // Update
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'kyc-1',
          store_id: 'store-1',
          status: 'pending',
          rc_document_url: 'https://s3/new-rc.pdf',
          cin_document_url: 'https://s3/new-cin.pdf',
          phone_number: '+21698765432',
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const result = await kycService.submit({
        store_id: 'store-1',
        rc_document_url: 'https://s3/new-rc.pdf',
        cin_document_url: 'https://s3/new-cin.pdf',
        phone_number: '+21698765432',
      });

      expect(result.status).toBe('pending');
    });

    it('should reject submission with missing documents', async () => {
      await expect(
        kycService.submit({
          store_id: 'store-1',
          rc_document_url: '',
          cin_document_url: 'https://s3/cin.pdf',
          phone_number: '+21698765432',
        }),
      ).rejects.toThrow('All documents and phone number are required');
    });
  });

  describe('getByStore', () => {
    it('should return null when no verification exists', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await kycService.getByStore('store-1');
      expect(result).toBeNull();
    });
  });

  describe('reject', () => {
    it('should require a rejection reason', async () => {
      await expect(
        kycService.reject('kyc-1', 'admin-1', ''),
      ).rejects.toThrow('Rejection reason is required');
    });

    it('should reject a pending verification', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'kyc-1',
          store_id: 'store-1',
          status: 'rejected',
          rejection_reason: 'Documents unclear',
        }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        kycService.reject('kyc-1', 'admin-1', 'Documents unclear'),
      ).resolves.not.toThrow();
    });
  });
});
