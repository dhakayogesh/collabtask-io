import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  apiClient,
  AUTH_TOKEN_KEY,
  type ApiResponse,
  type ApiUser,
  type AuthPayload,
} from "@/lib/api-client";

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
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function readToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      const token = readToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const { data } = await apiClient.get<ApiResponse<{ user: ApiUser }>>("/auth/me");
        if (cancelled) return;

        const user = toAuthUser(data.data.user);
        setSession({ token, user });
      } catch {
        clearToken();
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    hydrateSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(input: LoginInput) {
    const { data } = await apiClient.post<ApiResponse<AuthPayload>>("/auth/login", input);
    const user = toAuthUser(data.data.user);
    const nextSession = { token: data.data.token, user };
    storeToken(nextSession.token);
    setSession(nextSession);
    return user;
  }

  async function signup(input: SignupInput) {
    const { data } = await apiClient.post<ApiResponse<AuthPayload>>("/auth/signup", input);
    const user = toAuthUser(data.data.user);
    const nextSession = { token: data.data.token, user };
    storeToken(nextSession.token);
    setSession(nextSession);
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
  }

  const value = useMemo<AuthCtx>(
    () => ({
      user: session?.user ?? null,
      session,
      token: session?.token ?? null,
      role: session?.user.role ?? null,
      loading,
      login,
      signup,
      updateProfile,
      signOut,
    }),
    [loading, session],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
