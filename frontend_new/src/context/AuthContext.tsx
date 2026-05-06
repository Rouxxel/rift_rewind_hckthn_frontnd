import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { storage } from "@/utils/storage";
import type { RiotUser, UserCredentials } from "@/types/user";

interface AuthState {
  isAuthenticated: boolean;
  puuid: string | null;
  userData: RiotUser | null;
  credentials: UserCredentials | null;
  login: (puuid: string) => void;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [puuid, setPuuid] = useState<string | null>(null);
  const [userData, setUserData] = useState<RiotUser | null>(null);
  const [credentials, setCredentials] = useState<UserCredentials | null>(null);

  const refresh = () => {
    const ud = storage.getUserData();
    const cr = storage.getUserCredentials();
    setUserData(ud);
    setCredentials(cr);
    setPuuid(ud?.puuid ?? null);
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = (newPuuid: string) => {
    setPuuid(newPuuid);
    refresh();
  };

  const logout = () => {
    storage.clearUserData();
    setPuuid(null);
    setUserData(null);
    setCredentials(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!puuid,
        puuid,
        userData,
        credentials,
        login,
        logout,
        refresh,
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
