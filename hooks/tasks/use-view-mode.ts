"use client";

import { useCallback, useState } from "react";
import {
  VIEW_COOKIE,
  VIEW_COOKIE_MAX_AGE,
  type ViewMode,
} from "@/lib/tasks/view";

// Seeded from the cookie the RSC read, so the first paint is already the right
// view — no flash.
export function useViewMode(defaultView: ViewMode) {
  const [view, _setView] = useState<ViewMode>(defaultView);

  const setView = useCallback((next: ViewMode) => {
    _setView(next);
    document.cookie = `${VIEW_COOKIE}=${next}; path=/; max-age=${VIEW_COOKIE_MAX_AGE}`;
  }, []);

  return [view, setView] as const;
}
