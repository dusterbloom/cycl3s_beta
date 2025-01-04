import React, { createContext, useContext, useState, useEffect } from "react";
import { loginWithBluesky } from "../services/bluesky";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage with a proper fallback
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem("bluesky_session");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Failed to parse stored session:", error);
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Fix the session persistence useEffect
  useEffect(() => {
    if (session) {
      console.log("Persisting session:", session);
      localStorage.setItem("bluesky_session", JSON.stringify(session));
    } else {
      // Only remove if explicitly logged out
      const stored = localStorage.getItem("bluesky_session");
      if (!stored) {
        console.log("No session found, maintaining stored session");
        try {
          const storedSession = JSON.parse(stored);
          if (storedSession?.handle) {
            setSession(storedSession);
          }
        } catch (error) {
          console.error("Failed to restore session:", error);
        }
      }
    }
    setLoading(false);
  }, [session]);

  const login = async (identifier, password) => {
    try {
      const response = await loginWithBluesky(identifier, password);
      console.log("Login response:", response);

      if (response.success && response.data) {
        const sessionData = response.data;
        console.log("Setting session with:", sessionData);
        setSession(sessionData);
        localStorage.setItem("bluesky_session", JSON.stringify(sessionData));
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      console.error("Auth context login error:", error);
      return {
        success: false,
        error: error.message || "Failed to login",
      };
    }
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem("bluesky_session");
  };

  const value = {
    session,
    login,
    logout,
    loading,
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
