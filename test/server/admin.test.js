import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAdminRequest } from '../../server/admin.mjs';

describe('handleAdminRequest', () => {
    let mockReq;
    let mockRes;
    let mockPool;
    let mockSendJson;

    beforeEach(() => {
        mockReq = {
            method: 'GET',
            on: vi.fn((event, cb) => {
                if (event === 'end') cb();
            }),
        };
        mockRes = {};
        mockPool = {
            query: vi.fn(),
        };
        mockSendJson = vi.fn();
    });

    const setReqBody = (req, body) => {
        req.on = vi.fn((event, cb) => {
            if (event === 'data') cb(body);
            if (event === 'end') cb();
        });
    };

    it('GET /announcements returns all announcements', async () => {
        const url = new URL('http://localhost/api/admin/announcements');
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.objectContaining({
            ok: true,
            data: expect.any(Array)
        }));
    });

    it('POST /announcements creates new announcement', async () => {
        const url = new URL('http://localhost/api/admin/announcements');
        mockReq.method = 'POST';
        const body = JSON.stringify({ title: 'New', body: 'Body', severity: 'info' });

        // Mock readBody
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(body);
            if (event === 'end') cb();
        });

        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 2, title: 'New' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 201, expect.objectContaining({
            ok: true,
            data: expect.objectContaining({ id: 2 })
        }));
    });

    it('PUT /announcements/:id updates announcement', async () => {
        const url = new URL('http://localhost/api/admin/announcements/1');
        mockReq.method = 'PUT';
        const body = JSON.stringify({ title: 'Updated', body: 'Body', severity: 'info', refresh_date: true });

        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(body);
            if (event === 'end') cb();
        });

        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Updated' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE announcements'),
            expect.arrayContaining(['Updated'])
        );
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('created_at = NOW()'),
            expect.any(Array)
        );
    });

    it('DELETE /announcements/:id deletes announcement', async () => {
        const url = new URL('http://localhost/api/admin/announcements/1');
        mockReq.method = 'DELETE';

        mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.objectContaining({
            ok: true,
            deleted: '1'
        }));
    });

    it('returns 404 for unknown route', async () => {
        const url = new URL('http://localhost/api/admin/unknown');
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 404, expect.any(Object));
    });

    it('handles database errors', async () => {
        const url = new URL('http://localhost/api/admin/announcements');
        mockPool.query.mockRejectedValueOnce(new Error('DB Fail'));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 500, expect.objectContaining({
            ok: false,
            error: 'DB Fail'
        }));
    });

    it('PUT returns 404 if not found', async () => {
        const url = new URL('http://localhost/api/admin/announcements/999');
        mockReq.method = 'PUT';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(JSON.stringify({ title: 't', body: 'b' }));
            if (event === 'end') cb();
        });
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 404, expect.any(Object));
    });

    it('DELETE returns 404 if not found', async () => {
        const url = new URL('http://localhost/api/admin/announcements/999');
        mockReq.method = 'DELETE';
        mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 404, expect.any(Object));
    });

    it('handles invalid JSON body', async () => {
        const url = new URL('http://localhost/api/admin/announcements');
        mockReq.method = 'POST';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb('invalid-json');
            if (event === 'end') cb();
        });
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 500, expect.any(Object));
    });

    it('POST returns 400 if title or body missing', async () => {
        const url = new URL('http://localhost/api/admin/announcements');
        mockReq.method = 'POST';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(JSON.stringify({ title: '' }));
            if (event === 'end') cb();
        });
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 400, expect.any(Object));
    });

    it('PUT returns 400 if title or body missing', async () => {
        const url = new URL('http://localhost/api/admin/announcements/1');
        mockReq.method = 'PUT';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(JSON.stringify({ title: 'T', body: '' }));
            if (event === 'end') cb();
        });
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 400, expect.any(Object));
    });

    it('POST handles db error during insert', async () => {
        const url = new URL('http://localhost/api/admin/announcements');
        mockReq.method = 'POST';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(JSON.stringify({ title: 't', body: 'b' }));
            if (event === 'end') cb();
        });
        mockPool.query.mockRejectedValueOnce(new Error('INSERT FAIL'));
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 500, expect.any(Object));
    });

    it('PUT handles db error', async () => {
        const url = new URL('http://localhost/api/admin/announcements/1');
        mockReq.method = 'PUT';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(JSON.stringify({ title: 't', body: 'b' }));
            if (event === 'end') cb();
        });
        mockPool.query.mockRejectedValueOnce(new Error('UPDATE FAIL'));
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 500, expect.any(Object));
    });

    it('DELETE handles db error', async () => {
        const url = new URL('http://localhost/api/admin/announcements/1');
        mockReq.method = 'DELETE';
        mockPool.query.mockRejectedValueOnce(new Error('DELETE FAIL'));
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 500, expect.any(Object));
    });

    it('returns 501 when DB is not configured', async () => {
        const url = new URL('http://localhost/api/admin/announcements');
        await handleAdminRequest(mockReq, mockRes, { url, pool: null, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 501, expect.any(Object));
    });

    it('POST uses null tournament_id for general announcements', async () => {
        const url = new URL('http://localhost/api/admin/announcements');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ title: 't', body: 'b', tournament_id: 'general' }));
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 3, title: 't' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO announcements'),
            expect.arrayContaining([null])
        );
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 201, expect.any(Object));
    });

    it('POST returns 500 when insert returns no rows', async () => {
        const url = new URL('http://localhost/api/admin/announcements');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ title: 't', body: 'b' }));
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            500,
            expect.objectContaining({ error: 'Insert failed to return data' })
        );
    });
});
