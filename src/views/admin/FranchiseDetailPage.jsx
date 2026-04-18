import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFranchise, getFranchiseTeams, updateFranchise } from '../../lib/franchiseApi';
import { getVenues } from '../../lib/venueApi';

const fieldStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--hj-radius-md)',
  border: '1px solid var(--hj-color-border-subtle)',
  background: 'var(--hj-color-surface-1)',
  color: 'var(--hj-color-text-primary)',
  fontSize: 'inherit',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  marginBottom: 'var(--hj-space-1)',
  fontWeight: 'var(--hj-font-weight-semibold)',
  fontSize: 'var(--hj-font-size-sm)',
  color: 'var(--hj-color-text-primary)',
};

const fieldGroupStyle = {
  marginBottom: 'var(--hj-space-4)',
};

export default function FranchiseDetailPage() {
  const { franchiseId } = useParams();
  const navigate = useNavigate();

  const [franchise, setFranchise] = useState(null);
  const [venues, setVenues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    logo_url: '',
    manager_name: '',
    manager_photo_url: '',
    manager_bio: '',
    contact_phone: '',
    contact_email: '',
    home_venue_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [openSeason, setOpenSeason] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getFranchise(franchiseId), getVenues()])
      .then(([f, v]) => {
        if (!alive) return;
        setFranchise(f);
        setForm({
          name: f.name || '',
          logo_url: f.logo_url || '',
          manager_name: f.manager_name || '',
          manager_photo_url: f.manager_photo_url || '',
          manager_bio: f.manager_bio || '',
          contact_phone: f.contact_phone || '',
          contact_email: f.contact_email || '',
          home_venue_id: f.home_venue_id || '',
        });
        setVenues(v);
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(err.message);
      });
    return () => { alive = false; };
  }, [franchiseId]);

  useEffect(() => {
    let alive = true;
    getFranchiseTeams(franchiseId)
      .then((data) => {
        if (!alive) return;
        setTeams(data);
        setTeamsLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setTeamsLoading(false);
      });
    return () => { alive = false; };
  }, [franchiseId]);

  const teamsBySeason = useMemo(() => {
    const map = new Map();
    for (const t of teams) {
      const s = t.season || 'No season';
      if (!map.has(s)) map.set(s, []);
      map.get(s).push(t);
    }
    return map;
  }, [teams]);

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await updateFranchise(franchiseId, {
        name: form.name,
        logo_url: form.logo_url || null,
        manager_name: form.manager_name || null,
        manager_photo_url: form.manager_photo_url || null,
        manager_bio: form.manager_bio || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        home_venue_id: form.home_venue_id || null,
      });
      setFranchise(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div role="alert" style={{ color: '#c00', padding: 'var(--hj-space-4)' }}>
        {loadError}
      </div>
    );
  }

  if (!franchise) {
    return <div style={{ padding: 'var(--hj-space-4)' }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <button
        type="button"
        onClick={() => navigate('/admin/franchises')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--hj-color-brand-primary)',
          padding: 0,
          fontSize: 'var(--hj-font-size-sm)',
        }}
      >
        ← Back to Franchises
      </button>

      <h1 style={{ marginTop: 'var(--hj-space-3)', marginBottom: 'var(--hj-space-6)' }}>
        {franchise.name}
      </h1>

      {/* ── Profile ── */}
      <section style={{ marginBottom: 'var(--hj-space-8)' }}>
        <h2 style={{ marginBottom: 'var(--hj-space-4)', fontSize: 'var(--hj-font-size-lg)' }}>
          Profile
        </h2>

        <form onSubmit={handleSave} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--hj-space-4)' }}>

            <div style={{ ...fieldGroupStyle, gridColumn: '1 / -1' }}>
              <label htmlFor="fd-name" style={labelStyle}>Franchise name *</label>
              <input
                id="fd-name"
                type="text"
                value={form.name}
                onChange={setField('name')}
                required
                style={fieldStyle}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label htmlFor="fd-logo-url" style={labelStyle}>Logo URL</label>
              <input
                id="fd-logo-url"
                type="url"
                value={form.logo_url}
                onChange={setField('logo_url')}
                placeholder="https://…"
                style={fieldStyle}
              />
              {form.logo_url && (
                <img
                  src={form.logo_url}
                  alt="Logo preview"
                  style={{ marginTop: 'var(--hj-space-2)', height: 48, objectFit: 'contain' }}
                />
              )}
            </div>

            <div style={fieldGroupStyle}>
              <label htmlFor="fd-home-venue" style={labelStyle}>Home venue</label>
              <select
                id="fd-home-venue"
                value={form.home_venue_id}
                onChange={setField('home_venue_id')}
                style={fieldStyle}
              >
                <option value="">— None —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label htmlFor="fd-manager-name" style={labelStyle}>Manager name</label>
              <input
                id="fd-manager-name"
                type="text"
                value={form.manager_name}
                onChange={setField('manager_name')}
                style={fieldStyle}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label htmlFor="fd-manager-photo" style={labelStyle}>Manager photo URL</label>
              <input
                id="fd-manager-photo"
                type="url"
                value={form.manager_photo_url}
                onChange={setField('manager_photo_url')}
                placeholder="https://…"
                style={fieldStyle}
              />
              {form.manager_photo_url && (
                <img
                  src={form.manager_photo_url}
                  alt="Manager photo preview"
                  style={{ marginTop: 'var(--hj-space-2)', height: 48, width: 48, objectFit: 'cover', borderRadius: '50%' }}
                />
              )}
            </div>

            <div style={{ ...fieldGroupStyle, gridColumn: '1 / -1' }}>
              <label htmlFor="fd-manager-bio" style={labelStyle}>Manager bio</label>
              <textarea
                id="fd-manager-bio"
                value={form.manager_bio}
                onChange={setField('manager_bio')}
                rows={3}
                style={{ ...fieldStyle, resize: 'vertical' }}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label htmlFor="fd-phone" style={labelStyle}>Phone</label>
              <input
                id="fd-phone"
                type="tel"
                value={form.contact_phone}
                onChange={setField('contact_phone')}
                style={fieldStyle}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label htmlFor="fd-email" style={labelStyle}>Email</label>
              <input
                id="fd-email"
                type="email"
                value={form.contact_email}
                onChange={setField('contact_email')}
                style={fieldStyle}
              />
            </div>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--hj-space-3)', marginTop: 'var(--hj-space-2)' }}>
            <button
              type="submit"
              disabled={saving}
              className="admin-btn-primary"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && (
              <span style={{ color: 'var(--hj-color-success, #16a34a)', fontSize: 'var(--hj-font-size-sm)' }}>
                Saved.
              </span>
            )}
            {saveError && (
              <span style={{ color: '#c00', fontSize: 'var(--hj-font-size-sm)' }}>
                {saveError}
              </span>
            )}
          </div>
        </form>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--hj-color-border-subtle)', marginBottom: 'var(--hj-space-8)' }} />

      {/* ── Teams registry ── */}
      <section>
        <h2 style={{ marginBottom: 'var(--hj-space-4)', fontSize: 'var(--hj-font-size-lg)' }}>
          Teams
        </h2>

        {teamsLoading && <div>Loading teams…</div>}

        {!teamsLoading && teams.length === 0 && (
          <div style={{ color: 'var(--hj-color-text-secondary)', fontSize: 'var(--hj-font-size-sm)' }}>
            No teams linked to this franchise yet.
          </div>
        )}

        {!teamsLoading && teams.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-2)' }}>
            {[...teamsBySeason.entries()].map(([season, seasonTeams]) => (
              <div
                key={season}
                style={{
                  border: '1px solid var(--hj-color-border-subtle)',
                  borderRadius: 'var(--hj-radius-md)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenSeason(openSeason === season ? null : season)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--hj-space-3) var(--hj-space-4)',
                    background: openSeason === season ? 'var(--hj-color-surface-2)' : 'var(--hj-color-surface-1)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 'var(--hj-font-weight-semibold)',
                    color: 'var(--hj-color-text-primary)',
                  }}
                >
                  <span>{season}</span>
                  <span style={{ color: 'var(--hj-color-text-secondary)', fontSize: 'var(--hj-font-size-sm)' }}>
                    {seasonTeams.length} team{seasonTeams.length !== 1 ? 's' : ''} {openSeason === season ? '▲' : '▼'}
                  </span>
                </button>

                {openSeason === season && (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--hj-color-border-subtle)', background: 'var(--hj-color-surface-muted)' }}>
                        <th style={{ padding: 'var(--hj-space-2) var(--hj-space-4)', textAlign: 'left', fontSize: 'var(--hj-font-size-sm)', fontWeight: 'var(--hj-font-weight-semibold)' }}>Team</th>
                        <th style={{ padding: 'var(--hj-space-2) var(--hj-space-4)', textAlign: 'left', fontSize: 'var(--hj-font-size-sm)', fontWeight: 'var(--hj-font-weight-semibold)' }}>Division</th>
                        <th style={{ padding: 'var(--hj-space-2) var(--hj-space-4)', textAlign: 'left', fontSize: 'var(--hj-font-size-sm)', fontWeight: 'var(--hj-font-weight-semibold)' }}>Tournament</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonTeams.map((t) => (
                        <tr key={`${t.tournament_id}-${t.team_id}`} style={{ borderBottom: '1px solid var(--hj-color-border-subtle)' }}>
                          <td style={{ padding: 'var(--hj-space-2) var(--hj-space-4)', fontSize: 'var(--hj-font-size-sm)' }}>{t.team_name}</td>
                          <td style={{ padding: 'var(--hj-space-2) var(--hj-space-4)', fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-text-secondary)' }}>{t.group_id}</td>
                          <td style={{ padding: 'var(--hj-space-2) var(--hj-space-4)', fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-text-secondary)' }}>{t.tournament_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
