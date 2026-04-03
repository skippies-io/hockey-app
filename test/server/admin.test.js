import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAdminRequest } from '../../server/admin.mjs';

describe('handleAdminRequest', () => {
    let mockReq;
    let mockRes;
    let mockPool;
    let mockSendJson;
    let mockClient;

    beforeEach(() => {
        mockReq = {
            method: 'GET',
            on: vi.fn((event, cb) => {
                if (event === 'end') cb();
            }),
        };
        mockRes = {};
        mockClient = {
            query: vi.fn(),
            release: vi.fn(),
        };
        mockPool = {
            query: vi.fn(),
            connect: vi.fn(async () => mockClient),
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

    const buildWizardPayload = (overrides = {}) => ({
        tournament: { id: 'hj-test-2026', name: 'HJ Test 2026', season: '2026' },
        venues: [{ name: 'Beaulieu College' }],
        groups: [{ id: 'U11B', label: 'U11 Boys', format: '' }],
        groupVenues: [{ group_id: 'U11B', venue_name: 'Beaulieu College' }],
        franchises: [{ name: 'Purple Panthers' }, { name: 'Knights' }],
        teams: [
            { group_id: 'U11B', name: 'PP Amber', franchise_name: 'Purple Panthers', is_placeholder: false },
            { group_id: 'U11B', name: 'Knights Orange', franchise_name: 'Knights', is_placeholder: false },
        ],
        fixtures: [
            {
                group_id: 'U11B',
                date: '2026-01-08',
                time: '',
                venue: 'Beaulieu College',
                round: 'Round 1',
                pool: 'A',
                team1: 'PP Amber',
                team2: 'Knights Orange',
            },
        ],
        ...overrides,
    });

    function mockWizardDbHappyPath() {
        mockClient.query.mockImplementation(async (sql) => {
            if (sql.includes('SELECT 1 FROM tournament')) {
                return { rowCount: 0, rows: [] };
            }
            return { rowCount: 1, rows: [] };
        });
    }

    it('POST /tournament-wizard creates tournament in a transaction', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify(buildWizardPayload()));
        mockWizardDbHappyPath();

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            201,
            expect.objectContaining({ ok: true, tournament_id: 'hj-test-2026' })
        );
    });

    it('POST /tournament-wizard rejects missing tournament name', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        const payload = buildWizardPayload({ tournament: { id: 'hj-test-2026', name: '' } });
        setReqBody(mockReq, JSON.stringify(payload));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ error: expect.stringContaining('tournament.id and tournament.name') })
        );
    });

    it('POST /tournament-wizard rejects missing groups', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        const payload = buildWizardPayload({ groups: [] });
        setReqBody(mockReq, JSON.stringify(payload));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ error: expect.stringContaining('At least one group') })
        );
    });

    it('POST /tournament-wizard rejects fixtures without date or pool', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        const payload = buildWizardPayload({
            fixtures: [
                {
                    group_id: 'U11B',
                    date: '',
                    time: '',
                    venue: 'Beaulieu College',
                    round: 'Round 1',
                    pool: '',
                    team1: 'PP Amber',
                    team2: 'Knights Orange',
                },
            ],
        });
        setReqBody(mockReq, JSON.stringify(payload));
        mockWizardDbHappyPath();

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ error: expect.stringContaining('Fixture date is required') })
        );
    });

    it('POST /tournament-wizard rejects placeholder teams in fixtures', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        const payload = buildWizardPayload({
            teams: [
                { group_id: 'U11B', name: 'Winner QF1', franchise_name: '', is_placeholder: true },
                { group_id: 'U11B', name: 'Knights Orange', franchise_name: 'Knights', is_placeholder: false },
            ],
            fixtures: [
                {
                    group_id: 'U11B',
                    date: '2026-01-08',
                    time: '',
                    venue: 'Beaulieu College',
                    round: 'Round 1',
                    pool: 'A',
                    team1: 'Winner QF1',
                    team2: 'Knights Orange',
                },
            ],
        });
        setReqBody(mockReq, JSON.stringify(payload));
        mockWizardDbHappyPath();

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ error: expect.stringContaining('placeholder teams') })
        );
    });

    it('POST /tournament-wizard rejects duplicate fixtures', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        const fixture = {
            group_id: 'U11B',
            date: '2026-01-08',
            time: '',
            venue: 'Beaulieu College',
            round: 'Round 1',
            pool: 'A',
            team1: 'PP Amber',
            team2: 'Knights Orange',
        };
        const payload = buildWizardPayload({ fixtures: [fixture, fixture] });
        setReqBody(mockReq, JSON.stringify(payload));
        mockWizardDbHappyPath();

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ error: expect.stringContaining('Duplicate fixture') })
        );
    });

    it('POST /tournament-wizard rejects time slots missing date/time/venue', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        const payload = buildWizardPayload({
            timeSlots: [{ date: '', time: '09:00', venue: 'Beaulieu College', label: 'Court 1' }],
        });
        setReqBody(mockReq, JSON.stringify(payload));
        mockWizardDbHappyPath();

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ error: expect.stringContaining('Time slots require date') })
        );
    });

    it('POST /tournament-wizard rejects duplicate group ids', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        const payload = buildWizardPayload({
            groups: [
                { id: 'U11B', label: 'U11 Boys', format: '' },
                { id: 'U11B', label: 'Duplicate', format: '' },
            ],
        });
        setReqBody(mockReq, JSON.stringify(payload));
        mockWizardDbHappyPath();

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ error: expect.stringContaining('Duplicate group id') })
        );
    });

    it('POST /tournament-wizard rejects time slots with unknown venues', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        const payload = buildWizardPayload({
            timeSlots: [{ date: '2026-01-08', time: '09:00', venue: 'Unknown Venue', label: '' }],
        });
        setReqBody(mockReq, JSON.stringify(payload));
        mockWizardDbHappyPath();

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ error: expect.stringContaining('Unknown venue') })
        );
    });

    it('GET /venues returns venue list', async () => {
        const url = new URL('http://localhost/api/admin/venues');
        mockPool.query.mockResolvedValueOnce({ rows: [{ name: 'Beaulieu College' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true, data: expect.any(Array) })
        );
    });

    it('POST /venues returns method not allowed', async () => {
        const url = new URL('http://localhost/api/admin/venues');
        mockReq.method = 'POST';

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            405,
            expect.objectContaining({ error: expect.stringContaining('Method not allowed') })
        );
    });

    it('GET /franchises returns list', async () => {
        const url = new URL('http://localhost/api/admin/franchises');
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'f1', name: 'Alpha' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true, data: [{ id: 'f1', name: 'Alpha' }] })
        );
    });

    it('POST /franchises creates franchise', async () => {
        const url = new URL('http://localhost/api/admin/franchises');
        mockReq.method = 'POST';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from(JSON.stringify({ name: 'alpha' })));
            if (event === 'end') cb();
        });

        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'f1', name: 'Alpha' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson, caches: { actorEmail: 'test@example.com' } });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            201,
            expect.objectContaining({ ok: true, data: expect.objectContaining({ id: 'f1', name: 'Alpha' }) })
        );
    });

    it('PATCH /franchises/:id updates franchise', async () => {
        const url = new URL('http://localhost/api/admin/franchises/f1');
        mockReq.method = 'PATCH';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from(JSON.stringify({ name: 'Alpha Updated' })));
            if (event === 'end') cb();
        });

        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'f1', name: 'Alpha Updated' }], rowCount: 1 });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson, caches: { actorEmail: 'test@example.com' } });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true, data: expect.objectContaining({ id: 'f1', name: 'Alpha Updated' }) })
        );
    });

    it('DELETE /franchises/:id deletes franchise', async () => {
        const url = new URL('http://localhost/api/admin/franchises/f1');
        mockReq.method = 'DELETE';
        mockPool.query
            .mockResolvedValueOnce({ rows: [{ id: 'f1', name: 'Alpha' }], rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson, caches: { actorEmail: 'test@example.com' } });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true })
        );
    });

    it('POST /franchises/import inserts franchises', async () => {
        const url = new URL('http://localhost/api/admin/franchises/import');
        mockReq.method = 'POST';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from(JSON.stringify({ names: 'Alpha\nBeta' })));
            if (event === 'end') cb();
        });

        mockPool.query
            .mockResolvedValueOnce({ rows: [{ id: 'f1', name: 'Alpha' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson, caches: { actorEmail: 'test@example.com' } });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            201,
            expect.objectContaining({ ok: true, data: [expect.objectContaining({ id: 'f1', name: 'Alpha' })] })
        );
    });

    it('GET /franchises returns 501 when DB is not configured', async () => {
        const url = new URL('http://localhost/api/admin/franchises');

        await handleAdminRequest(mockReq, mockRes, { url, pool: null, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            501,
            expect.objectContaining({ ok: false, error: expect.stringContaining('DB not configured') })
        );
    });

    it('PUT /franchises returns 405', async () => {
        const url = new URL('http://localhost/api/admin/franchises');
        mockReq.method = 'PUT';

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            405,
            expect.objectContaining({ ok: false, error: expect.stringContaining('Method not allowed') })
        );
    });

    it('POST /franchises returns 400 when name missing', async () => {
        const url = new URL('http://localhost/api/admin/franchises');
        mockReq.method = 'POST';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from(JSON.stringify({})));
            if (event === 'end') cb();
        });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ ok: false, error: expect.stringContaining('name is required') })
        );
    });

    it('PATCH /franchises/:id returns 404 when not found', async () => {
        const url = new URL('http://localhost/api/admin/franchises/missing');
        mockReq.method = 'PATCH';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from(JSON.stringify({ name: 'Alpha' })));
            if (event === 'end') cb();
        });

        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            404,
            expect.objectContaining({ ok: false, error: expect.stringContaining('Franchise not found') })
        );
    });

    it('DELETE /franchises/:id returns 404 when not found', async () => {
        const url = new URL('http://localhost/api/admin/franchises/missing');
        mockReq.method = 'DELETE';

        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            404,
            expect.objectContaining({ ok: false, error: expect.stringContaining('Franchise not found') })
        );
    });

    it('POST /franchises/import returns 400 when no names provided', async () => {
        const url = new URL('http://localhost/api/admin/franchises/import');
        mockReq.method = 'POST';
        mockReq.on = vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from(JSON.stringify({ names: '' })));
            if (event === 'end') cb();
        });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ ok: false })
        );
    });

    it('GET /franchises returns 500 on DB error', async () => {
        const url = new URL('http://localhost/api/admin/franchises');
        mockPool.query.mockRejectedValueOnce(new Error('DB down'));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            500,
            expect.objectContaining({ ok: false })
        );
    });

    it('GET /fixtures returns 400 when missing tournamentId', async () => {
        const url = new URL('http://localhost/api/admin/fixtures?groupId=U11B');
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ ok: false, error: expect.stringContaining('tournamentId') })
        );
    });

    it('GET /fixtures returns fixtures list', async () => {
        const url = new URL('http://localhost/api/admin/fixtures?tournamentId=t1&groupId=U11B');
        mockPool.query.mockResolvedValueOnce({ rows: [{ fixture_id: 'fx1', team1: 'A', team2: 'B' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockPool.query).toHaveBeenCalled();
        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true, data: expect.any(Array) })
        );
    });

    it('GET /fixtures returns 400 when missing groupId', async () => {
        const url = new URL('http://localhost/api/admin/fixtures?tournamentId=t1');
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 400, expect.any(Object));
    });

    it('GET /fixtures returns 500 on DB error', async () => {
        const url = new URL('http://localhost/api/admin/fixtures?tournamentId=t1&groupId=U11B');
        mockPool.query.mockRejectedValueOnce(new Error('DB down'));
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            500,
            expect.objectContaining({ ok: false })
        );
    });

    it('PUT /results upserts a result', async () => {
        const url = new URL('http://localhost/api/admin/results');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 't1', fixture_id: 'fx1', score1: 2, score2: 1 }));

        mockPool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] }) // fixture exists
            .mockResolvedValueOnce({ rows: [{ tournament_id: 't1', fixture_id: 'fx1', score1: 2, score2: 1 }] }); // upsert

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson, caches: { fixturesCache: new Map(), standingsCache: new Map() } });

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT 1 FROM fixture'),
            ['t1', 'fx1']
        );
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO result'),
            expect.any(Array)
        );
        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true })
        );
    });

    it('PUT /results returns 400 on invalid score type', async () => {
        const url = new URL('http://localhost/api/admin/results');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 't1', fixture_id: 'fx1', score1: 'abc', score2: 1 }));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 400, expect.any(Object));
    });

    it('PUT /results returns 400 on out-of-range score', async () => {
        const url = new URL('http://localhost/api/admin/results');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 't1', fixture_id: 'fx1', score1: 100, score2: 1 }));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 400, expect.any(Object));
    });

    it('PUT /results returns 404 when fixture not found', async () => {
        const url = new URL('http://localhost/api/admin/results');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 't1', fixture_id: 'fx-missing', score1: 1, score2: 1 }));

        mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 404, expect.any(Object));
    });

    it('PUT /results returns 500 on upsert DB error', async () => {
        const url = new URL('http://localhost/api/admin/results');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 't1', fixture_id: 'fx1', score1: 1, score2: 1 }));

        mockPool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] }) // fixture exists
            .mockRejectedValueOnce(new Error('UPSERT FAIL'));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 500, expect.any(Object));
    });

    it('PUT /results returns 400 for invalid alert_status', async () => {
        const url = new URL('http://localhost/api/admin/results');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 't1', fixture_id: 'fx1', score1: null, score2: null, alert_status: 'BadValue' }));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 400, expect.objectContaining({ ok: false, error: expect.stringContaining('alert_status') }));
    });

    it('PUT /results accepts valid alert_status and saves it', async () => {
        const url = new URL('http://localhost/api/admin/results');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 't1', fixture_id: 'fx1', score1: null, score2: null, alert_status: 'Postponed', alert_message: 'Ice damage' }));

        mockPool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] })
            .mockResolvedValueOnce({ rows: [{ tournament_id: 't1', fixture_id: 'fx1', score1: null, score2: null, status: 'Postponed', alert_message: 'Ice damage' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson, caches: { fixturesCache: new Map(), standingsCache: new Map() } });

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO result'),
            expect.arrayContaining(['Postponed', 'Ice damage'])
        );
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.objectContaining({ ok: true }));
    });

    it('PUT /results alert_status wins over score-derived Final status', async () => {
        const url = new URL('http://localhost/api/admin/results');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 't1', fixture_id: 'fx1', score1: 3, score2: 1, alert_status: 'Cancelled' }));

        mockPool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] })
            .mockResolvedValueOnce({ rows: [{ tournament_id: 't1', fixture_id: 'fx1', score1: 3, score2: 1, status: 'Cancelled' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson, caches: { fixturesCache: new Map(), standingsCache: new Map() } });

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO result'),
            expect.arrayContaining(['Cancelled'])
        );
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.objectContaining({ ok: true }));
    });

    it('PUT /results returns 200 when clearing scores (null)', async () => {
        const url = new URL('http://localhost/api/admin/results');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 't1', fixture_id: 'fx1', score1: null, score2: null }));

        mockPool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] })
            .mockResolvedValueOnce({ rows: [{ tournament_id: 't1', fixture_id: 'fx1', score1: null, score2: null }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.any(Object));
    });

    // --- /audit-log endpoint ---

    it('GET /audit-log returns audit entries', async () => {
        const url = new URL('http://localhost/api/admin/audit-log');
        const rows = [{ id: 1, actor_email: 'a@b.com', action: 'announcement.create' }];
        mockPool.query.mockResolvedValueOnce({ rows });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.objectContaining({ ok: true, data: rows }));
    });

    it('GET /audit-log filters by tournamentId', async () => {
        const url = new URL('http://localhost/api/admin/audit-log?tournamentId=t1');
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('$1::text IS NULL OR tournament_id = $1'),
            ['t1', 50]
        );
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.objectContaining({ ok: true }));
    });

    it('POST /audit-log returns 405', async () => {
        const url = new URL('http://localhost/api/admin/audit-log');
        mockReq.method = 'POST';

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 405, expect.objectContaining({ ok: false }));
    });

    it('GET /audit-log returns 501 when DB not configured', async () => {
        const url = new URL('http://localhost/api/admin/audit-log');

        await handleAdminRequest(mockReq, mockRes, { url, pool: null, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 501, expect.objectContaining({ ok: false }));
    });

    it('GET /audit-log returns 500 on DB error', async () => {
        const url = new URL('http://localhost/api/admin/audit-log');
        mockPool.query.mockRejectedValueOnce(new Error('DB error'));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 500, expect.objectContaining({ ok: false }));
    });

    // --- writeAuditLog error path ---

    it('audit log write failure does not block main response', async () => {
        const url = new URL('http://localhost/api/admin/announcements');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ title: 'T', body: 'B' }));

        mockPool.query
            .mockResolvedValueOnce({ rows: [{ id: 5, title: 'T' }] })  // INSERT INTO announcements
            .mockRejectedValueOnce(new Error('audit DB down'));           // INSERT INTO audit_log

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson, caches: { actorEmail: 'x@y.com' } });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 201, expect.objectContaining({ ok: true }));
    });

    // --- /allowlist endpoint ---

    it('GET /allowlist returns the list of allowed emails', async () => {
        const url = new URL('http://localhost/api/admin/allowlist');
        const rows = [{ email: 'leroybarnes@me.com', note: 'Initial test account', added_at: new Date() }];
        mockPool.query.mockResolvedValueOnce({ rows });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.objectContaining({ ok: true, data: rows }));
    });

    it('POST /allowlist adds an email', async () => {
        const url = new URL('http://localhost/api/admin/allowlist');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ email: 'newadmin@example.com', note: 'New admin' }));
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 201, expect.objectContaining({ ok: true, email: 'newadmin@example.com' }));
    });

    it('POST /allowlist returns 400 when email is missing', async () => {
        const url = new URL('http://localhost/api/admin/allowlist');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ note: 'No email provided' }));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 400, expect.objectContaining({ ok: false }));
    });

    it('DELETE /allowlist/:email removes an email', async () => {
        const url = new URL('http://localhost/api/admin/allowlist/leroybarnes%40me.com');
        mockReq.method = 'DELETE';
        mockPool.query.mockResolvedValueOnce({ rows: [{ email: 'leroybarnes@me.com' }], rowCount: 1 });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.objectContaining({ ok: true, deleted: 'leroybarnes@me.com' }));
    });

    it('DELETE /allowlist/:email returns 404 when email not found', async () => {
        const url = new URL('http://localhost/api/admin/allowlist/nobody%40nowhere.com');
        mockReq.method = 'DELETE';
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 404, expect.objectContaining({ ok: false }));
    });

    it('PUT /allowlist returns 405', async () => {
        const url = new URL('http://localhost/api/admin/allowlist');
        mockReq.method = 'PUT';

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 405, expect.objectContaining({ ok: false }));
    });

    // ── Digest share links ────────────────────────────────────────────────────

    it('POST /digests creates a share link and returns token', async () => {
        const url = new URL('http://localhost/api/admin/digests');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 't-1', age_id: 'U12', label: 'Test' }));
        mockPool.query
            .mockResolvedValueOnce({ rows: [] })  // INSERT digest_share
            .mockResolvedValueOnce({ rows: [] }); // audit_log

        await handleAdminRequest(mockReq, mockRes, {
            url, pool: mockPool, sendJson: mockSendJson,
            caches: { actorEmail: 'admin@example.com' },
        });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 201, expect.objectContaining({
            ok: true,
            token: expect.stringMatching(/^[0-9a-f]{64}$/),
            expires_at: expect.any(String),
        }));
    });

    it('POST /digests returns 400 when tournament_id is missing', async () => {
        const url = new URL('http://localhost/api/admin/digests');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ age_id: 'U12' }));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 400, expect.objectContaining({ ok: false }));
    });

    it('GET /digests returns list of share links', async () => {
        const url = new URL('http://localhost/api/admin/digests');
        mockPool.query.mockResolvedValueOnce({
            rows: [
                { id: 'abc', tournament_id: 't-1', age_id: 'U12', label: 'Test', created_by: 'a@b.com',
                  created_at: new Date().toISOString(), expires_at: new Date().toISOString(), revoked_at: null },
            ],
        });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.objectContaining({
            ok: true,
            data: expect.arrayContaining([expect.objectContaining({ id: 'abc' })]),
        }));
    });

    it('DELETE /digests revokes a share link by id', async () => {
        const url = new URL('http://localhost/api/admin/digests?id=abc-123');
        mockReq.method = 'DELETE';
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('revoked_at'),
            ['abc-123']
        );
        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 200, expect.objectContaining({ ok: true }));
    });

    it('DELETE /digests returns 400 when id is missing', async () => {
        const url = new URL('http://localhost/api/admin/digests');
        mockReq.method = 'DELETE';

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 400, expect.objectContaining({ ok: false }));
    });

    it('POST /digests returns 405 for unsupported method', async () => {
        const url = new URL('http://localhost/api/admin/digests');
        mockReq.method = 'PUT';

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 405, expect.objectContaining({ ok: false }));
    });

    it('GET /digests returns 500 when DB query fails', async () => {
        const url = new URL('http://localhost/api/admin/digests');
        mockPool.query.mockRejectedValueOnce(new Error('DB connection lost'));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 500, expect.objectContaining({
            ok: false,
            error: 'Failed to list share links',
        }));
    });

    it('DELETE /digests returns 500 when DB query fails', async () => {
        const url = new URL('http://localhost/api/admin/digests?id=abc-123');
        mockReq.method = 'DELETE';
        mockPool.query.mockRejectedValueOnce(new Error('DB connection lost'));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(mockReq, mockRes, 500, expect.objectContaining({
            ok: false,
            error: 'Failed to revoke share link',
        }));
    });
});
