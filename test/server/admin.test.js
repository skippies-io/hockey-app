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
        mockClient.query.mockImplementation(async (sql, params = []) => {
            if (sql.includes('SELECT 1 FROM tournament')) {
                return { rowCount: 0, rows: [] };
            }
            if (sql.includes('FROM venue_directory')) {
                const names = Array.isArray(params[0]) ? params[0] : [];
                return {
                    rowCount: names.length,
                    rows: names.map((name) => ({
                        name,
                        address: null,
                        location_map_url: null,
                        website_url: null,
                    })),
                };
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

    it('POST /tournament-wizard returns 500 when db connect fails', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify(buildWizardPayload()));
        mockPool.connect.mockRejectedValueOnce(new Error('connect failed'));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            500,
            expect.objectContaining({ ok: false })
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

    it('POST /tournament-wizard rejects fixtures missing team names', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        const payload = buildWizardPayload({
            fixtures: [
                {
                    group_id: 'U11B',
                    date: '2026-01-08',
                    time: '',
                    venue: 'Beaulieu College',
                    round: 'Round 1',
                    pool: 'A',
                    team1: '',
                    team2: '',
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
            expect.objectContaining({ error: expect.stringContaining('team1 and team2 are required') })
        );
    });

    it('POST /tournament-wizard rejects fixtures with unknown teams', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        const payload = buildWizardPayload({
            fixtures: [
                {
                    group_id: 'U11B',
                    date: '2026-01-08',
                    time: '',
                    venue: 'Beaulieu College',
                    round: 'Round 1',
                    pool: 'A',
                    team1: 'Missing Team',
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
            expect.objectContaining({ error: expect.stringContaining('Fixture teams not found') })
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

    it('POST /tournament-wizard returns 500 when transaction fails', async () => {
        const url = new URL('http://localhost/api/admin/tournament-wizard');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify(buildWizardPayload()));
        mockClient.query.mockImplementation(async (sql) => {
            if (sql === 'BEGIN' || sql === 'ROLLBACK') {
                return { rowCount: 0, rows: [] };
            }
            throw new Error('transaction failed');
        });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            500,
            expect.objectContaining({ ok: false })
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

    it('POST /venues creates a venue directory entry', async () => {
        const url = new URL('http://localhost/api/admin/venues');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ name: 'Beaulieu College' }));
        mockPool.query.mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 'beaulieu-college', name: 'Beaulieu College' }],
        });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            201,
            expect.objectContaining({ ok: true })
        );
    });

    it('POST /venues requires name', async () => {
        const url = new URL('http://localhost/api/admin/venues');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({}));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ ok: false })
        );
    });

    it('POST /venues returns 409 when venue exists', async () => {
        const url = new URL('http://localhost/api/admin/venues');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ name: 'Beaulieu College' }));
        mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            409,
            expect.objectContaining({ ok: false })
        );
    });

    it('PUT /venues returns method not allowed', async () => {
        const url = new URL('http://localhost/api/admin/venues');
        mockReq.method = 'PUT';

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            405,
            expect.objectContaining({ error: expect.stringContaining('Method not allowed') })
        );
    });

    it('PUT /venues/:id updates a venue directory entry', async () => {
        const url = new URL('http://localhost/api/admin/venues/venue-1');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ name: 'Venue One', address: '123 Road' }));
        mockPool.query.mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 'venue-1', name: 'Venue One' }],
        });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true })
        );
    });

    it('DELETE /venues/:id removes a venue directory entry', async () => {
        const url = new URL('http://localhost/api/admin/venues/venue-1');
        mockReq.method = 'DELETE';
        mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'venue-1' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ deleted: 'venue-1' })
        );
    });

    it('GET /groups returns directory list', async () => {
        const url = new URL('http://localhost/api/admin/groups');
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'U11B', label: 'U11 Boys' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true, data: expect.any(Array) })
        );
    });

    it('POST /groups creates a group directory entry', async () => {
        const url = new URL('http://localhost/api/admin/groups');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ id: 'U11B', label: 'U11 Boys', format: 'Round-robin' }));
        mockPool.query.mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 'U11B', label: 'U11 Boys', format: 'Round-robin' }],
        });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            201,
            expect.objectContaining({ ok: true })
        );
    });

    it('POST /groups requires id and label', async () => {
        const url = new URL('http://localhost/api/admin/groups');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({}));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ ok: false })
        );
    });

    it('POST /groups returns 409 when group exists', async () => {
        const url = new URL('http://localhost/api/admin/groups');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ id: 'U11B', label: 'U11 Boys' }));
        mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            409,
            expect.objectContaining({ ok: false })
        );
    });

    it('PUT /groups/:id updates a group directory entry', async () => {
        const url = new URL('http://localhost/api/admin/groups/U11B');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ label: 'U11 Boys Updated', format: 'Round-robin' }));
        mockPool.query.mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 'U11B', label: 'U11 Boys Updated' }],
        });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true })
        );
    });

    it('DELETE /groups/:id removes a group directory entry', async () => {
        const url = new URL('http://localhost/api/admin/groups/U11B');
        mockReq.method = 'DELETE';
        mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'U11B' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ deleted: 'U11B' })
        );
    });

    it('GET /franchises returns franchise list', async () => {
        const url = new URL('http://localhost/api/admin/franchises?tournamentId=hj-test');
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'fr-1', name: 'Purple Panthers' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true, data: expect.any(Array) })
        );
    });

    it('POST /franchises creates a franchise', async () => {
        const url = new URL('http://localhost/api/admin/franchises');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 'hj-test', name: 'Purple Panthers' }));
        mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'fr-1', name: 'Purple Panthers' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            201,
            expect.objectContaining({ ok: true })
        );
    });

    it('POST /franchises requires tournament_id and name', async () => {
        const url = new URL('http://localhost/api/admin/franchises');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({}));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ ok: false })
        );
    });

    it('POST /franchises returns 409 when franchise exists', async () => {
        const url = new URL('http://localhost/api/admin/franchises');
        mockReq.method = 'POST';
        setReqBody(mockReq, JSON.stringify({ tournament_id: 'hj-test', name: 'Purple Panthers' }));
        mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            409,
            expect.objectContaining({ ok: false })
        );
    });

    it('PUT /franchises/:id updates a franchise', async () => {
        const url = new URL('http://localhost/api/admin/franchises/fr-1?tournamentId=hj-test');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ name: 'Purple Panthers Updated' }));
        mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'fr-1', name: 'Purple Panthers Updated' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ ok: true })
        );
    });

    it('PUT /franchises/:id requires tournamentId', async () => {
        const url = new URL('http://localhost/api/admin/franchises/fr-1');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ name: 'Purple Panthers Updated' }));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ ok: false })
        );
    });

    it('PUT /franchises/:id requires name', async () => {
        const url = new URL('http://localhost/api/admin/franchises/fr-1?tournamentId=hj-test');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({}));

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ ok: false })
        );
    });

    it('PUT /franchises/:id returns 404 when missing', async () => {
        const url = new URL('http://localhost/api/admin/franchises/fr-1?tournamentId=hj-test');
        mockReq.method = 'PUT';
        setReqBody(mockReq, JSON.stringify({ name: 'Purple Panthers Updated' }));
        mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            404,
            expect.objectContaining({ ok: false })
        );
    });

    it('DELETE /franchises/:id removes a franchise', async () => {
        const url = new URL('http://localhost/api/admin/franchises/fr-1?tournamentId=hj-test');
        mockReq.method = 'DELETE';
        mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'fr-1' }] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            200,
            expect.objectContaining({ deleted: 'fr-1' })
        );
    });

    it('DELETE /franchises/:id requires tournamentId', async () => {
        const url = new URL('http://localhost/api/admin/franchises/fr-1');
        mockReq.method = 'DELETE';

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            400,
            expect.objectContaining({ ok: false })
        );
    });

    it('DELETE /franchises/:id returns 404 when missing', async () => {
        const url = new URL('http://localhost/api/admin/franchises/fr-1?tournamentId=hj-test');
        mockReq.method = 'DELETE';
        mockPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        await handleAdminRequest(mockReq, mockRes, { url, pool: mockPool, sendJson: mockSendJson });

        expect(mockSendJson).toHaveBeenCalledWith(
            mockReq,
            mockRes,
            404,
            expect.objectContaining({ ok: false })
        );
    });
});
