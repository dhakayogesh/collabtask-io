import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import {
  AUTH_EXPIRED_EVENT,
  apiClient,
  AUTH_TOKEN_KEY,
  clearStoredAuthToken,
  getApiErrorMessage,
  type ApiResponse,
  type ApiUser,
  type AuthPayload,
} from "@/lib/api-client";
import { toast } from "sonner";

export type AppRole = "admin" | "member";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  role: AppRole;
};

type AuthSession = {
  token: string;
  user: AuthUser;
};

type LoginInput = {
  email: string;
  password: string;
};

type SignupInput = LoginInput & {
  name: string;
  role?: "ADMIN" | "MEMBER";
  adminPasscode?: string;
};

type ProfileInput = {
  name: string;
  phone?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
};

interface AuthCtx {
  user: AuthUser | null;
  session: AuthSession | null;
  token: string | null;
  role: AppRole | null;
  loading: boolean;
  restoreError: string | null;
  retrySession: () => Promise<void>;
  login: (input: LoginInput) => Promise<AuthUser>;
  signup: (input: SignupInput) => Promise<AuthUser>;
  updateProfile: (input: ProfileInput) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

function toAuthUser(user: ApiUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    address: user.address ?? null,
    bloodGroup: user.bloodGroup ?? null,
    role: user.role === "ADMIN" ? "admin" : "member",
  };
}

function storeToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

function clearToken() {
  clearStoredAuthToken();
}

function readToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  async function hydrateSession(options: { silent?: boolean } = {}) {
    const token = readToken();
    if (!token) {
      setSession(null);
      setRestoreError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setRestoreError(null);
    try {
      let data: ApiResponse<{ user: ApiUser }> | null = null;
      let lastError: unknown;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await apiClient.get<ApiResponse<{ user: ApiUser }>>("/auth/me");
          data = response.data;
          break;
        } catch (error) {
          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          if (status === 401 || status === 403) throw error;
          lastError = error;
          if (attempt < 2) await wait(900 * (attempt + 1));
        }
      }

      if (!data) throw lastError ?? new Error("Unable to restore session");
      const user = toAuthUser(data.data.user);
      setSession({ token, user });
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401) {
        clearToken();
        setSession(null);
        setRestoreError(null);
        if (!options.silent) toast.info("Your session expired. Please sign in again.");
        return;
      }

      setRestoreError(getApiErrorMessage(error));
      if (!options.silent) toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    hydrateSession({ silent: true });

    const onAuthExpired = () => {
      setSession(null);
      setRestoreError(null);
      setLoading(false);
      toast.info("Your session expired. Please sign in again.");
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  async function login(input: LoginInput) {
    const { data } = await apiClient.post<ApiResponse<AuthPayload>>("/auth/login", input);
    const user = toAuthUser(data.data.user);
    const nextSession = { token: data.data.token, user };
    storeToken(nextSession.token);
    setSession(nextSession);
    setRestoreError(null);
    return user;
  }

  async function signup(input: SignupInput) {
    const { data } = await apiClient.post<ApiResponse<AuthPayload>>("/auth/signup", input);
    const user = toAuthUser(data.data.user);
    const nextSession = { token: data.data.token, user };
    storeToken(nextSession.token);
    setSession(nextSession);
    setRestoreError(null);
    return user;
  }

  async function updateProfile(input: ProfileInput) {
    const { data } = await apiClient.patch<ApiResponse<{ user: ApiUser }>>("/auth/me", input);
    const user = toAuthUser(data.data.user);
    setSession((current) => {
      if (!current) return current;
      return { ...current, user };
    });
    return user;
  }

  async function signOut() {
    clearToken();
    setSession(null);
    setRestoreError(null);
  }

  const value = useMemo<AuthCtx>(
    () => ({
      user: session?.user ?? null,
      session,
      token: session?.token ?? null,
      role: session?.user.role ?? null,
      loading,
      restoreError,
      retrySession: hydrateSession,
      login,
      signup,
      updateProfile,
      signOut,
    }),
    [loading, restoreError, session],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
