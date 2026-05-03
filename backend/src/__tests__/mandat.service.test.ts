/**
 * Unit tests for MandatService.
 * Tests proof upload, approval, rejection, listing, and retrieval
 * for the Mandat Minute (manual payment) workflow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies — must be before imports
vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn(() => 'test-mandat-id'),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../events/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
    setMaxListeners: vi.fn(),
  },
}));

vi.mock('../services/order.service', () => ({
  orderService: {
    markPaid: vi.fn(),
  },
}));

import { query } from '../db/pool';
import { MandatService } from '../services/mandat.service';
import { orderService } from '../services/order.service';
import { eventBus } from '../events/event-bus';
import { MandatStatus, MandatUploader, PaymentGateway } from '@pandamarket/types';

const mockQuery = vi.mocked(query);
const mockOrderService = vi.mocked(orderService);
const mockEventBus = vi.mocked(eventBus);

describe('MandatService', () => {
  let mandatService: MandatService;

  beforeEach(() => {
    vi.clearAllMocks();
    mandatService = new MandatService();
  });

  // =========================================================
  // uploadProof()
  // =========================================================
  describe('uploadProof()', () => {
    const validUploadOpts = {
      order_id: 'pd_order_123',
      uploaded_by: MandatUploader.Buyer,
      uploader_user_id: 'pd_user_456',
      image_url: 'https://s3.pandamarket.tn/proofs/proof.jpg',
      amount_expected: 85,
    };

    it('should create a new proof upload when no existing proof', async () => {
      // SELECT existing proof — none found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // INSERT new proof
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-mandat-id',
          order_id: 'pd_order_123',
          uploaded_by: MandatUploader.Buyer,
          uploader_user_id: 'pd_user_456',
          image_url: 'https://s3.pandamarket.tn/proofs/proof.jpg',
          amount_expected: '85.000',
          status: MandatStatus.Pending,
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await mandatService.uploadProof(validUploadOpts);

      expect(result.id).toBe('test-mandat-id');
      expect(result.status).toBe(MandatStatus.Pending);
      expect(result.order_id).toBe('pd_order_123');
      expect(result.uploaded_by).toBe(MandatUploader.Buyer);
      expect(mockEventBus.emit).toHaveBeenCalledWith('pd.mandat.uploaded', {
        proof_id: 'test-mandat-id',
        order_id: 'pd_order_123',
      });
    });

    it('should reject upload when a pending proof already exists', async () => {
      // SELECT existing proof — pending found
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-proof', status: MandatStatus.Pending }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        mandatService.uploadProof(validUploadOpts),
      ).rejects.toThrow('A pending proof already exists for this order');
    });

    it('should allow re-upload after previous proof was rejected', async () => {
      // SELECT existing proof — rejected found (allows re-upload)
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'rejected-proof', status: MandatStatus.Rejected }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // INSERT new proof
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-mandat-id',
          order_id: 'pd_order_123',
          uploaded_by: MandatUploader.Buyer,
          uploader_user_id: 'pd_user_456',
          image_url: 'https://s3.pandamarket.tn/proofs/new-proof.jpg',
          amount_expected: '85.000',
          status: MandatStatus.Pending,
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await mandatService.uploadProof({
        ...validUploadOpts,
        image_url: 'https://s3.pandamarket.tn/proofs/new-proof.jpg',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(MandatStatus.Pending);
      expect(mockEventBus.emit).toHaveBeenCalledWith('pd.mandat.uploaded', expect.any(Object));
    });

    it('should allow upload after previous proof was approved (new order scenario)', async () => {
      // SELECT existing proof — approved found (not pending, so allowed)
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'approved-proof', status: MandatStatus.Approved }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // INSERT new proof
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-mandat-id',
          order_id: 'pd_order_123',
          uploaded_by: MandatUploader.Vendor,
          uploader_user_id: 'pd_user_456',
          image_url: 'https://s3.pandamarket.tn/proofs/proof2.jpg',
          amount_expected: '100.000',
          status: MandatStatus.Pending,
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await mandatService.uploadProof({
        ...validUploadOpts,
        uploaded_by: MandatUploader.Vendor,
        image_url: 'https://s3.pandamarket.tn/proofs/proof2.jpg',
        amount_expected: 100,
      });

      expect(result).toBeDefined();
      expect(result.uploaded_by).toBe(MandatUploader.Vendor);
    });

    it('should reject upload with empty image_url', async () => {
      await expect(
        mandatService.uploadProof({
          ...validUploadOpts,
          image_url: '',
        }),
      ).rejects.toThrow('image_url is required');
    });
  });

  // =========================================================
  // approve()
  // =========================================================
  describe('approve()', () => {
    it('should approve a pending proof and capture payment', async () => {
      // UPDATE ... WHERE status = 'pending' RETURNING *
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'proof-1',
          order_id: 'pd_order_123',
          uploaded_by: MandatUploader.Buyer,
          uploader_user_id: 'pd_user_456',
          image_url: 'https://s3/proof.jpg',
          amount_expected: '85.000',
          status: MandatStatus.Approved,
          reviewed_by: 'admin-1',
          reviewed_at: new Date(),
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      // markPaid succeeds
      mockOrderService.markPaid.mockResolvedValue({ id: 'pd_order_123' } as any);

      await mandatService.approve('proof-1', 'admin-1');

      expect(mockOrderService.markPaid).toHaveBeenCalledWith(
        'pd_order_123',
        PaymentGateway.ManualMandat,
        'proof-1',
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('pd.payment.captured', {
        order_id: 'pd_order_123',
        gateway: PaymentGateway.ManualMandat,
        amount: 85,
      });
    });

    it('should throw when proof not found or already reviewed', async () => {
      // UPDATE returns no rows (proof doesn't exist or not pending)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        mandatService.approve('nonexistent-proof', 'admin-1'),
      ).rejects.toThrow('Proof not found or already reviewed');
    });

    it('should call markPaid with correct gateway and reference', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'proof-abc',
          order_id: 'pd_order_789',
          amount_expected: '120.500',
          status: MandatStatus.Approved,
          reviewed_by: 'admin-2',
          reviewed_at: new Date(),
        }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      mockOrderService.markPaid.mockResolvedValue({ id: 'pd_order_789' } as any);

      await mandatService.approve('proof-abc', 'admin-2');

      expect(mockOrderService.markPaid).toHaveBeenCalledWith(
        'pd_order_789',
        PaymentGateway.ManualMandat,
        'proof-abc',
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('pd.payment.captured', {
        order_id: 'pd_order_789',
        gateway: PaymentGateway.ManualMandat,
        amount: 120.5,
      });
    });
  });

  // =========================================================
  // reject()
  // =========================================================
  describe('reject()', () => {
    it('should reject a pending proof with a reason', async () => {
      // UPDATE succeeds
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        mandatService.reject('proof-1', 'admin-1', 'Blurry image, please re-upload'),
      ).resolves.not.toThrow();
    });

    it('should require a rejection reason', async () => {
      await expect(
        mandatService.reject('proof-1', 'admin-1', ''),
      ).rejects.toThrow('Rejection reason is required');
    });

    it('should throw when proof not found or already reviewed', async () => {
      // UPDATE returns rowCount 0
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        mandatService.reject('nonexistent-proof', 'admin-1', 'Invalid proof'),
      ).rejects.toThrow('Proof not found or already reviewed');
    });
  });

  // =========================================================
  // listByStatus()
  // =========================================================
  describe('listByStatus()', () => {
    it('should list mandats by status with pagination', async () => {
      // SELECT proofs with JOIN
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'proof-1',
            order_id: 'pd_order_1',
            status: MandatStatus.Pending,
            order_total: '85.000',
            order_currency: 'TND',
            customer_email: 'customer@test.tn',
            created_at: new Date(),
          },
          {
            id: 'proof-2',
            order_id: 'pd_order_2',
            status: MandatStatus.Pending,
            order_total: '120.000',
            order_currency: 'TND',
            customer_email: 'buyer@test.tn',
            created_at: new Date(),
          },
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      // COUNT query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '2' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await mandatService.listByStatus(MandatStatus.Pending, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total_pages).toBe(1);
    });

    it('should handle empty results', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await mandatService.listByStatus(MandatStatus.Approved, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(0);
    });

    it('should default to page 1 and limit 20', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await mandatService.listByStatus(MandatStatus.Rejected);

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should cap limit at 100', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await mandatService.listByStatus(MandatStatus.Pending, { limit: 500 });

      expect(result.meta.limit).toBe(100);
    });
  });

  // =========================================================
  // getById()
  // =========================================================
  describe('getById()', () => {
    it('should return a mandat proof by ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'proof-1',
          order_id: 'pd_order_123',
          uploaded_by: MandatUploader.Buyer,
          uploader_user_id: 'pd_user_456',
          image_url: 'https://s3/proof.jpg',
          amount_expected: '85.000',
          status: MandatStatus.Pending,
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await mandatService.getById('proof-1');

      expect(result.id).toBe('proof-1');
      expect(result.order_id).toBe('pd_order_123');
      expect(result.status).toBe(MandatStatus.Pending);
    });

    it('should throw PdNotFoundError when proof does not exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        mandatService.getById('nonexistent'),
      ).rejects.toThrow('Mandat proof not found');
    });
  });
});
