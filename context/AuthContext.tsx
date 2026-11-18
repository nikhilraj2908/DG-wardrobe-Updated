// D:\nikhil\MyFirstApp\context\AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from "react";
import { storage } from "../utils/storage";
import { router } from "expo-router";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrated: boolean;
  authInProgress: boolean;   // ✅ ADD
  profileCompleted: boolean | null;
  login: (token: string, profileCompleted: boolean) => Promise<void>;
  logout: () => Promise<void>;
  clearAuth: () => Promise<void>;
  setAuthInProgress: (v: boolean) => void; // ✅ ADD
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [authInProgress, setAuthInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = await storage.getItem("token");
        const storedProfileCompleted = await storage.getItem("profileCompleted");

        console.log("🔐 TOKEN FOUND:", storedToken);
        console.log("📋 Profile Completed:", storedProfileCompleted);

        if (storedToken) {
          setToken(storedToken);
          setProfileCompleted(storedProfileCompleted === "true");
        } else {
          setToken(null);
          setProfileCompleted(null);
        }
      } catch (error) {
        console.error("Error loading auth data:", error);
      } finally {
        setHydrated(true);   // ✅ THIS IS THE KEY
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);


  // In AuthContext.tsx
  const login = async (jwt: string, completed: boolean) => {
    console.log("💾 AuthContext.login called");
    console.log("   Token:", jwt.substring(0, 20) + "...");
    console.log("   Profile completed:", completed);

    try {
      await storage.setItem("token", jwt);
      console.log("   ✅ Token saved to SecureStorage");

      await storage.setItem("profileCompleted", completed ? 'true' : 'false');
      console.log("   ✅ ProfileCompleted saved to SecureStorage");

      setToken(jwt);
      setProfileCompleted(completed);
      setAuthInProgress(false);
      console.log("   ✅ State updated in AuthContext");
      console.log("   ✅ Login completed successfully");
    } catch (error) {
      console.log("   ❌ Error in login function:", error);
      throw error;
    }
  };

  const logout = async () => {
    await storage.removeItem("token");
    await storage.removeItem("profileCompleted");
    setToken(null);
    setProfileCompleted(null);
    router.replace("/(auth)/welcome");
  };

  const clearAuth = async () => {
    await storage.removeItem("token");
    await storage.removeItem("profileCompleted");
    setToken(null);
    setProfileCompleted(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        isLoading,
        hydrated,
        authInProgress,
        profileCompleted,
        login,
        logout,
        clearAuth,
        setAuthInProgress,
      }}
    >

      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};