"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const LoadingContext = createContext(null);
const INITIAL_LOADING_COUNT = 0;
const LOADING_COUNT_STEP = 1;

/**
 * Simplest global loading gate: any API call wrapped with `withLoading`
 * increments a shared counter, which flips on a full-screen overlay that
 * blocks all user interaction until every in-flight call finishes.
 */
export function LoadingProvider({ children }) {
  const [loadingCount, setLoadingCount] = useState(INITIAL_LOADING_COUNT);
  const isLoading = loadingCount > INITIAL_LOADING_COUNT;

  const withLoading = useCallback(async (asyncTask) => {
    setLoadingCount((count) => count + LOADING_COUNT_STEP);
    try {
      return await asyncTask();
    } finally {
      setLoadingCount((count) => count - LOADING_COUNT_STEP);
    }
  }, []);

  const contextValue = useMemo(
    () => ({ isLoading, withLoading }),
    [isLoading, withLoading]
  );

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {isLoading && (
        <div className="global-loading-overlay" role="alert" aria-busy="true" aria-live="assertive">
          <div className="global-loading-spinner" />
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
