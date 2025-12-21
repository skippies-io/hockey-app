import { createContext, useContext, useEffect } from "react";

export const FilterSlotContext = createContext({ setFilters: () => {} });

export function useFilterSlot(content) {
  const ctx = useContext(FilterSlotContext);

  useEffect(() => {
    ctx?.setFilters?.(content || null);
    return () => ctx?.setFilters?.(null);
  }, [content, ctx]);
}
