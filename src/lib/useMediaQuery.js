import { useEffect, useState } from "react";

export default function useMediaQuery(query) {
  const getMatch = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const mql = window.matchMedia(query);
    const listener = (event) => setMatches(event.matches);
    setMatches(mql.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", listener);
    } else if (typeof mql.addListener === "function") {
      mql.addListener(listener);
    }

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", listener);
      } else if (typeof mql.removeListener === "function") {
        mql.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}
