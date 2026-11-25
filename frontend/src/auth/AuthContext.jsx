import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { isNetworkError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user || null);
      setApiUnavailable(false);
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
        setApiUnavailable(false);
      } else if (isNetworkError(error) || error.response?.status >= 500) {
        setUser(null);
        setApiUnavailable(true);
        return false;
      } else {
        setUser(null);
        setApiUnavailable(false);
      }
      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let retryTimer;
    const checkHealth = async () => {
      try {
        const { data } = await api.get("/health");
        if (!active) return;
        if (!data.databaseReady) {
          setApiUnavailable(true);
          setLoading(false);
          retryTimer = window.setTimeout(checkHealth, 5000);
          return;
        }
        setApiUnavailable(false);
        const authAvailable = await refreshUser();
        if (active && !authAvailable) {
          retryTimer = window.setTimeout(checkHealth, 5000);
        }
      } catch {
        if (!active) return;
        setApiUnavailable(true);
        setLoading(false);
        retryTimer = window.setTimeout(checkHealth, 5000);
      }
    };
    void checkHealth();
    return () => {
      active = false;
      window.clearTimeout(retryTimer);
    };
  }, [refreshUser]);

  const authenticate = async (path, values) => {
    const { data } = await api.post(path, values);
    setUser(data.user);
    setApiUnavailable(false);
    return data.user;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, apiUnavailable, setApiUnavailable, authenticate, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
