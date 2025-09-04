import { useEffect, useState, useCallback } from "react";

export function useProcessedFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/get-processed-files/", {
        credentials: "include", // keep session cookies
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
      } else {
        setError(data.error || "Failed to load files");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchFiles();

    return () => controller.abort(); // cleanup
  }, [fetchFiles]);

  return { files, loading, error, refreshFiles: fetchFiles };
}
