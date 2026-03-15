import { describe, it, expect, vi, beforeEach } from 'vitest';
import process from 'node:process';

// Use vi.hoisted to ensure the mock function is available before the mock factory runs
const mocks = vi.hoisted(() => ({
    query: vi.fn(),
}));

vi.mock('pg', () => {
    const Pool = class {
        constructor() {
            this.query = mocks.query;
            this.connect = vi.fn();
            this.on = vi.fn();
        }
    };
    return { Pool };
});

// Mock environment variables
process.env.PROVIDER_MODE = 'db';
process.env.DATABASE_URL = 'postgres://fake';

// Import the module under test
import { requestHandler, fixturesCache, standingsCache, getFixturesCacheKey } from '../../server/index.mjs';

describe('API Endpoints (Mocked DB)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fixturesCache.clear();
        standingsCache.clear();
    });

    it('GET /api/announcements returns data on successful query', async () => {
        mocks.query.mockResolvedValueOnce({
            rows: [
                { id: '1', title: 'Test', body: 'Body', severity: 'info', is_published: true, tournament_id: 't1' }
            ]
        });

        const req = {
            method: 'GET',
            url: '/api/announcements',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).toHaveBeenCalled();
        expect(res.writeHead).toHaveBeenCalledWith(200);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.ok).toBe(true);
        expect(responseBody.data).toHaveLength(1);
        expect(responseBody.data[0].id).toBe('1');
    });

    it('GET /api/announcements passes tournamentId filter', async () => {
        mocks.query.mockResolvedValueOnce({ rows: [] });

        const req = {
            method: 'GET',
            url: '/api/announcements?tournamentId=specific-tourney',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE is_published = true'),
            ['specific-tourney']
        );
    });

    it('GET /api/meta returns last_sync_at', async () => {
        mocks.query.mockResolvedValueOnce({ rows: [{ last_sync_at: '2026-03-12T00:00:00.000Z' }] });

        const req = {
            method: 'GET',
            url: '/api/meta',
            headers: { host: 'localhost' },
            on: vi.fn(),
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('MAX(ingested_at)'));
        expect(res.writeHead).toHaveBeenCalledWith(200);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.ok).toBe(true);
        expect(responseBody.last_sync_at).toBeTruthy();
    });

    it('GET /api/meta returns 500 when DB query fails', async () => {
        mocks.query.mockRejectedValueOnce(new Error('DB fail'));

        const req = {
            method: 'GET',
            url: '/api/meta',
            headers: { host: 'localhost' },
            on: vi.fn(),
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(500);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.ok).toBe(false);
    });

    it('GET /api/meta returns 405 for non-GET methods', async () => {
        const req = {
            method: 'POST',
            url: '/api/meta',
            headers: { host: 'localhost' },
            on: vi.fn(),
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(405);
    });

    it('GET /api/tournaments returns data', async () => {
        mocks.query.mockResolvedValueOnce({
            rows: [
                { id: 't1', name: 'Tourney 1' },
                { id: 't2', name: 'Tourney 2' }
            ]
        });

        const req = {
            method: 'GET',
            url: '/api/tournaments',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT id, name, season FROM tournament'),
            []
        );
        expect(res.writeHead).toHaveBeenCalledWith(200);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.data).toHaveLength(2);
    });

    it('GET /api/announcements handles DB errors', async () => {
        mocks.query.mockRejectedValueOnce(new Error('DB Connection Failed'));

        const req = {
            method: 'GET',
            url: '/api/announcements',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(500);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.ok).toBe(false);
        expect(responseBody.error).toBe('DB Error');
    });

    it('GET /api/tournaments handles DB errors', async () => {
        mocks.query.mockRejectedValueOnce(new Error('DB Fail'));

        const req = {
            method: 'GET',
            url: '/api/tournaments',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(500);
    });

    it('GET /api/groups returns data', async () => {
        mocks.query.mockResolvedValueOnce({
            rows: [
                { id: 'U12', label: 'U12 Boys' },
                { id: 'U14', label: 'U14 Girls' }
            ]
        });

        const req = {
            method: 'GET',
            url: '/api?groups=1',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).toHaveBeenCalledWith(
            `SELECT id, label
     FROM groups
     WHERE tournament_id = $1
     ORDER BY id`,
            ['hj-indoor-allstars-2025']
        );
        expect(res.writeHead).toHaveBeenCalledWith(200);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.groups).toHaveLength(2);
    });

    it('GET /api/fixtures returns data with params', async () => {
        mocks.query.mockResolvedValueOnce({
            rows: [
                { date: '2026-01-01', time: '10:00', team1: 'Team A', team2: 'Team B', score1: 1, score2: 2, pool: 'A', venue: 'Field 1', round: 'Round 1', age: 'U12' }
            ]
        });

        const req = {
            method: 'GET',
            url: '/api?sheet=Fixtures&age=U12',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT'),
            ['hj-indoor-allstars-2025', 'U12']
        );
        expect(res.writeHead).toHaveBeenCalledWith(200);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.rows).toHaveLength(1);
    });

    it('GET /api/fixtures returns cached data when available', async () => {
        const cacheKey = getFixturesCacheKey('Fixtures', 'U12', 'hj-indoor-allstars-2025');
        const cachedPayload = { rows: [{ date: '2026-01-01', time: '10:00', team1: 'Team A', team2: 'Team B' }] };
        fixturesCache.set(cacheKey, {
            expiresAt: Date.now() + 60000, // Future expiry
            payload: cachedPayload
        });

        const req = {
            method: 'GET',
            url: '/api?sheet=Fixtures&age=U12',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).not.toHaveBeenCalled(); // Should not hit DB
        expect(res.writeHead).toHaveBeenCalledWith(200);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody).toEqual(cachedPayload);
    });

    it('GET /api/fixtures calls DB when cache is expired', async () => {
        const cacheKey = getFixturesCacheKey('Fixtures', 'U12', 'hj-indoor-allstars-2025');
        const cachedPayload = { rows: [{ date: '2026-01-01', time: '10:00', team1: 'Team A', team2: 'Team B' }] };
        fixturesCache.set(cacheKey, {
            expiresAt: Date.now() - 1000, // Expired
            payload: cachedPayload
        });

        mocks.query.mockResolvedValueOnce({
            rows: [
                { date: '2026-01-01', time: '10:00', team1: 'Team A', team2: 'Team B', score1: 1, score2: 2, pool: 'A', venue: 'Field 1', round: 'Round 1', age: 'U12' }
            ]
        });

        const req = {
            method: 'GET',
            url: '/api?sheet=Fixtures&age=U12',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).toHaveBeenCalled(); // Should hit DB
        expect(res.writeHead).toHaveBeenCalledWith(200);
    });

    it('GET /api/fixtures returns 400 when age parameter is missing', async () => {
        const req = {
            method: 'GET',
            url: '/api?sheet=Fixtures',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).not.toHaveBeenCalled();
        expect(res.writeHead).toHaveBeenCalledWith(400);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.ok).toBe(false);
        expect(responseBody.error).toBe('Missing age parameter');
    });

    it('GET /api/standings returns 400 when age parameter is missing', async () => {
        const req = {
            method: 'GET',
            url: '/api?sheet=Standings',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).not.toHaveBeenCalled();
        expect(res.writeHead).toHaveBeenCalledWith(400);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.ok).toBe(false);
        expect(responseBody.error).toBe('Missing age parameter');
    });

    it('GET /api returns 400 when sheet parameter is missing', async () => {
        const req = {
            method: 'GET',
            url: '/api',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).not.toHaveBeenCalled();
        expect(res.writeHead).toHaveBeenCalledWith(400);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.ok).toBe(false);
        expect(responseBody.error).toBe('Missing sheet parameter');
    });

    it('GET /api returns 400 for unknown sheet parameter', async () => {
        const req = {
            method: 'GET',
            url: '/api?sheet=Unknown',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).not.toHaveBeenCalled();
        expect(res.writeHead).toHaveBeenCalledWith(400);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.ok).toBe(false);
        expect(responseBody.error).toBe('Unknown sheet: Unknown');
    });

    it('GET /api/fixtures handles server errors', async () => {
        mocks.query.mockRejectedValueOnce(new Error('Unexpected DB error'));

        const req = {
            method: 'GET',
            url: '/api?sheet=Fixtures&age=U12',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(500);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.ok).toBe(false);
        expect(responseBody.error).toBe('Server error');
    });

    it('GET /api/standings returns data with params', async () => {
        mocks.query.mockResolvedValueOnce({
            rows: [
                { Team: 'Team A', Rank: 1, Points: 10, GF: 5, GA: 2, GD: 3, GP: 4, W: 3, D: 1, L: 0, Pool: 'A', Age: 'U12' }
            ]
        });

        const req = {
            method: 'GET',
            url: '/api?sheet=Standings&age=U12',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT'),
            ['hj-indoor-allstars-2025', 'U12']
        );
        expect(res.writeHead).toHaveBeenCalledWith(200);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.rows).toHaveLength(1);
    });

    it('GET /api/fixtures_all returns data', async () => {
        mocks.query.mockResolvedValueOnce({
            rows: [
                { date: '2026-01-01', time: '10:00', team1: 'Team A', team2: 'Team B', score1: 1, score2: 2, pool: 'A', venue: 'Field 1', round: 'Round 1', age: 'U12' }
            ]
        });

        const req = {
            method: 'GET',
            url: '/api?sheet=Fixtures_All',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT'),
            ['hj-indoor-allstars-2025']
        );
        expect(res.writeHead).toHaveBeenCalledWith(200);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.rows).toHaveLength(1);
    });

    it('GET /api/standings_all returns data', async () => {
        mocks.query.mockResolvedValueOnce({
            rows: [
                { Team: 'Team A', Rank: 1, Points: 10, GF: 5, GA: 2, GD: 3, GP: 4, W: 3, D: 1, L: 0, Pool: 'A', Age: 'U12' }
            ]
        });

        const req = {
            method: 'GET',
            url: '/api?sheet=Standings_All',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(mocks.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT'),
            ['hj-indoor-allstars-2025']
        );
        expect(res.writeHead).toHaveBeenCalledWith(200);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.rows).toHaveLength(1);
    });

    it('OPTIONS /api/announcements returns 204 for CORS', async () => {
        const req = {
            method: 'OPTIONS',
            url: '/api/announcements',
            headers: { host: 'localhost', origin: 'http://localhost:5173' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173');
        expect(res.writeHead).toHaveBeenCalledWith(204);
    });

    it('POST /api/announcements returns 405 Method Not Allowed', async () => {
        const req = {
            method: 'POST',
            url: '/api/announcements',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(405);
    });

    it('OPTIONS /api/tournaments returns 204 for CORS', async () => {
        const req = {
            method: 'OPTIONS',
            url: '/api/tournaments',
            headers: { host: 'localhost', origin: 'http://localhost:5173' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173');
        expect(res.writeHead).toHaveBeenCalledWith(204);
    });

    it('GET /api/fixtures.ics returns ICS content for a specific age group', async () => {
        mocks.query.mockResolvedValueOnce({
            rows: [{
                date: '2026-03-15', time: '10:00',
                team1: 'Tigers', team2: 'Lions',
                score1: null, score2: null,
                result_status: null, alert_message: null,
                pool: 'A', venue: 'Pitch 1', round: 'Round 1', age: 'U12',
            }],
        });

        const req = {
            method: 'GET',
            url: '/api/fixtures.ics?age=U12&tournamentId=t1',
            headers: { host: 'localhost' },
            on: vi.fn(),
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/calendar; charset=utf-8');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="fixtures.ics"');
        expect(res.writeHead).toHaveBeenCalledWith(200);
        const body = res.end.mock.calls[0][0];
        expect(body).toContain('BEGIN:VCALENDAR');
        expect(body).toContain('Tigers vs Lions');
    });

    it('GET /api/fixtures.ics returns all fixtures when age=all', async () => {
        mocks.query.mockResolvedValueOnce({
            rows: [
                { date: '2026-03-15', time: '09:00', team1: 'A', team2: 'B', score1: null, score2: null, result_status: null, alert_message: null, pool: '', venue: '', round: '', age: 'U12' },
                { date: '2026-03-15', time: '11:00', team1: 'C', team2: 'D', score1: null, score2: null, result_status: null, alert_message: null, pool: '', venue: '', round: '', age: 'U14' },
            ],
        });

        const req = {
            method: 'GET',
            url: '/api/fixtures.ics?age=all&tournamentId=t1',
            headers: { host: 'localhost' },
            on: vi.fn(),
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(200);
        const body = res.end.mock.calls[0][0];
        expect(body.split('BEGIN:VEVENT').length - 1).toBe(2);
    });

    it('GET /api/fixtures.ics returns all fixtures when no age param', async () => {
        mocks.query.mockResolvedValueOnce({ rows: [] });

        const req = {
            method: 'GET',
            url: '/api/fixtures.ics',
            headers: { host: 'localhost' },
            on: vi.fn(),
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(200);
        const body = res.end.mock.calls[0][0];
        expect(body).toContain('BEGIN:VCALENDAR');
    });

    it('POST /api/fixtures.ics returns 405', async () => {
        const req = {
            method: 'POST',
            url: '/api/fixtures.ics',
            headers: { host: 'localhost' },
            on: vi.fn(),
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(405);
    });

    it('GET /api/fixtures.ics returns 500 on DB error', async () => {
        mocks.query.mockRejectedValueOnce(new Error('DB down'));

        const req = {
            method: 'GET',
            url: '/api/fixtures.ics?age=U12',
            headers: { host: 'localhost' },
            on: vi.fn(),
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(500);
    });

    it('OPTIONS /api/fixtures.ics returns 204 for CORS preflight', async () => {
        const req = {
            method: 'OPTIONS',
            url: '/api/fixtures.ics',
            headers: { host: 'localhost', origin: 'http://localhost:5173' },
            on: vi.fn(),
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173');
        expect(res.writeHead).toHaveBeenCalledWith(204);
    });

    it('POST /api/tournaments returns 405 Method Not Allowed', async () => {
        const req = {
            method: 'POST',
            url: '/api/tournaments',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(405);
    });

    it('GET /version returns version info', async () => {
        const req = {
            method: 'GET',
            url: '/version',
            headers: { host: 'localhost' },
            on: vi.fn()
        };
        const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

        await requestHandler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(200);
        const responseBody = JSON.parse(res.end.mock.calls[0][0]);
        expect(responseBody.ok).toBe(true);
        expect(responseBody.sha).toBeDefined();
    });
});
