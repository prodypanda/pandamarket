import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mocks.query,
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn((prefix: string) => `${prefix}_test_id`),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AdminNotesService Folders & Drag-and-Drop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a custom folder with name and color', async () => {
    const { adminNotesService } = await import('../services/admin-notes.service');

    const fakeFolder = {
      id: 'fld_123',
      admin_id: 'admin_1',
      name: 'Operations',
      color: 'blue',
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mocks.query.mockResolvedValueOnce({ rows: [fakeFolder] });

    const result = await adminNotesService.createFolder('admin_1', 'Operations', 'blue');

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO admin_note_folders'),
      ['admin_1', 'Operations', 'blue'],
    );
    expect(result).toEqual(fakeFolder);
  });

  it('lists folders for an admin sorted by sort_order', async () => {
    const { adminNotesService } = await import('../services/admin-notes.service');

    const fakeFolders = [
      { id: 'fld_1', admin_id: 'admin_1', name: 'Ops', color: 'blue', sort_order: 0 },
      { id: 'fld_2', admin_id: 'admin_1', name: 'Finance', color: 'green', sort_order: 1 },
    ];

    mocks.query.mockResolvedValueOnce({ rows: fakeFolders });

    const result = await adminNotesService.listFolders('admin_1');

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM admin_note_folders WHERE admin_id = $1'),
      ['admin_1'],
    );
    expect(result).toEqual(fakeFolders);
  });

  it('updates folder name, color, and sort_order', async () => {
    const { adminNotesService } = await import('../services/admin-notes.service');

    const updatedFolder = {
      id: 'fld_1',
      admin_id: 'admin_1',
      name: 'Operations & Logistics',
      color: 'red',
      sort_order: 2,
    };

    mocks.query.mockResolvedValueOnce({ rows: [updatedFolder] });

    const result = await adminNotesService.updateFolder('fld_1', 'admin_1', {
      name: 'Operations & Logistics',
      color: 'red',
      sort_order: 2,
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE admin_note_folders SET'),
      ['Operations & Logistics', 'red', 2, 'fld_1', 'admin_1'],
    );
    expect(result).toEqual(updatedFolder);
  });

  it('deletes a folder by id and adminId', async () => {
    const { adminNotesService } = await import('../services/admin-notes.service');

    mocks.query.mockResolvedValueOnce({ rowCount: 1 });

    const ok = await adminNotesService.deleteFolder('fld_1', 'admin_1');

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM admin_note_folders WHERE id = $1 AND admin_id = $2'),
      ['fld_1', 'admin_1'],
    );
    expect(ok).toBe(true);
  });

  it('moves a note to a folder', async () => {
    const { adminNotesService } = await import('../services/admin-notes.service');

    const movedNote = {
      id: 'note_1',
      admin_id: 'admin_1',
      folder_id: 'fld_1',
      title: 'Review inventory',
    };

    mocks.query.mockResolvedValueOnce({ rows: [movedNote] });

    const result = await adminNotesService.moveToFolder('note_1', 'admin_1', 'fld_1');

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE admin_notes SET folder_id = $1'),
      ['fld_1', 'note_1', 'admin_1'],
    );
    expect(result).toEqual(movedNote);
  });

  it('updates note sort orders in batch', async () => {
    const { adminNotesService } = await import('../services/admin-notes.service');

    mocks.query.mockResolvedValue({ rowCount: 1 });

    await adminNotesService.updateNoteSortOrder(
      [
        { id: 'note_1', sort_order: 0 },
        { id: 'note_2', sort_order: 1 },
      ],
      'admin_1',
    );

    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE admin_notes SET sort_order = $1'),
      [0, 'note_1', 'admin_1'],
    );
    expect(mocks.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE admin_notes SET sort_order = $1'),
      [1, 'note_2', 'admin_1'],
    );
  });

  it('creates note with folder_id and sort_order included in INSERT query', async () => {
    const { adminNotesService } = await import('../services/admin-notes.service');

    const createdNote = {
      id: 'note_1',
      admin_id: 'admin_1',
      folder_id: 'fld_99',
      sort_order: 3,
      type: 'note',
      title: 'Tax report',
      content: 'prepare Q3',
    };

    mocks.query
      .mockResolvedValueOnce({ rows: [createdNote] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // Activity log

    const result = await adminNotesService.create({
      admin_id: 'admin_1',
      type: 'note',
      title: 'Tax report',
      content: 'prepare Q3',
      folder_id: 'fld_99',
      sort_order: 3,
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO admin_notes'),
      expect.arrayContaining(['admin_1', 'note', 'Tax report', 'prepare Q3', 'fld_99', 3]),
    );
    expect(result).toEqual(createdNote);
  });

  it('filters list by folder_id or unorganized', async () => {
    const { adminNotesService } = await import('../services/admin-notes.service');

    mocks.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'note_1', folder_id: null }] });

    const result = await adminNotesService.list('admin_1', {
      folder_id: 'unorganized',
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('folder_id IS NULL'),
      expect.any(Array),
    );
    expect(result.data).toHaveLength(1);
  });
});
