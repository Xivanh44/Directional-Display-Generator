import { createContext, useContext, useState, useCallback } from "react";

interface ManagerAuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const ManagerAuthContext = createContext<ManagerAuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

const SESSION_KEY = "allergen_manager_auth";

export function ManagerAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });

  const login = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    setIsAuthenticated(false);
  }, []);

  return (
    <ManagerAuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </ManagerAuthContext.Provider>
  );
}

export function useManagerAuth() {
  return useContext(ManagerAuthContext);
}
