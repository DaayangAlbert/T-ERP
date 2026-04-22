import { useCallback, useEffect, useRef, useState } from "react";

import { httpClient } from "@/shared/api/httpClient";

export function useApiQuery(url, { params, enabled = true, ignoreStatuses = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const paramsKey = JSON.stringify(params || {});
  const ignoreStatusesKey = JSON.stringify(ignoreStatuses || []);
  const controllerRef = useRef(null);
  const ignoredStatusRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!enabled || ignoredStatusRef.current) {
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient.get(url, { params, signal: controller.signal });
      ignoredStatusRef.current = false;
      setData(response.data);
    } catch (err) {
      if (err.name !== "CanceledError") {
        const status = Number(err.response?.status || 0);
        if ((ignoreStatuses || []).includes(status)) {
          ignoredStatusRef.current = true;
          setError(null);
          return;
        }

        setError(err.response?.data?.message || err.message || "Request failed");
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, ignoreStatusesKey, paramsKey, url]);

  useEffect(() => {
    ignoredStatusRef.current = false;
  }, [enabled, ignoreStatusesKey, paramsKey, url]);

  useEffect(() => {
    fetchData();

    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
