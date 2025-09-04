import { useEffect } from "react";

function useUnloadCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // Skip cleanup in development to avoid accidental 404s / state resets
      return;
    }

    const handleUnload = () => {
      const url = "/api/clear_user_data/";
      // sendBeacon ensures the request is sent even when tab is closing
      navigator.sendBeacon(url);
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);
}

export default useUnloadCleanup;

