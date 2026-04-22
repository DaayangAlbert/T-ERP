import { useCallback, useState } from "react";

import { httpClient } from "@/shared/api/httpClient";

export function useApiMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async ({ method = "post", url, data, params }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient.request({ method, url, data, params });
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Request failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error, setError };
}
