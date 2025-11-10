import { useCallback, useEffect, useMemo, useState } from "react";
import { getOverview } from "../../lib/api";
import { loadOverviewSnapshot, saveOverviewSnapshot, getAllCachedSeasons } from "../../lib/overviewStore";
import { computeLastUpdated, normalizeOverviewPayload } from "../../lib/overviewTypes";
import { getUserKey } from "../../lib/userKey";

const CURRENT_YEAR = new Date().getFullYear().toString();

export function useOverviewFeed(initialSeason) {
  const [season, setSeason] = useState(initialSeason || CURRENT_YEAR);
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
    source: "cache",
    lastUpdated: null,
  });
  const [availableSeasons, setAvailableSeasons] = useState(() => [season]);

  const userKey = useMemo(() => getUserKey(), []);

  const hydrate = useCallback(async (targetSeason, { forceNetwork = false } = {}) => {
    setState(prev => ({ ...prev, loading: prev.data === null, error: null }));
    const cached = await loadOverviewSnapshot(targetSeason);
    if (cached && !forceNetwork) {
      setState({
        data: cached,
        loading: false,
        error: null,
        source: "cache",
        lastUpdated: computeLastUpdated(cached.freshness),
      });
    }

    try {
      const fresh = await getOverview({ season: targetSeason, userKey });
      const normalized = normalizeOverviewPayload(fresh);
      await saveOverviewSnapshot(targetSeason, normalized);
      setState({
        data: normalized,
        loading: false,
        error: null,
        source: "network",
        lastUpdated: computeLastUpdated(normalized.freshness),
      });
      if (Array.isArray(normalized.availableSeasons) && normalized.availableSeasons.length) {
        setAvailableSeasons(normalized.availableSeasons);
      }
    } catch (err) {
      console.error("[overview] failed to fetch", err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
      }));
    }
  }, [userKey]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      const cachedSeasons = await getAllCachedSeasons();
      if (alive && cachedSeasons?.length) setAvailableSeasons(prev => Array.from(new Set([...prev, ...cachedSeasons])));
      await hydrate(season);
    })();
    return () => { alive = false; };
  }, [season, hydrate]);

  const refresh = useCallback(() => hydrate(season, { forceNetwork: true }), [hydrate, season]);

  return {
    overview: state.data,
    loading: state.loading,
    error: state.error,
    season,
    setSeason,
    refresh,
    lastUpdated: state.lastUpdated,
    source: state.source,
    availableSeasons,
  };
}
