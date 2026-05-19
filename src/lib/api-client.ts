import axios, { AxiosError } from "axios";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = (configuredApiBaseUrl || "http://127.0.0.1:5000").replace(/\/$/, "");
export const AUTH_TOKEN_KEY = "wetask.auth.token";
export const AUTH_EXPIRED_EVENT = "wetask:auth-expired";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  details?: Record<string, string[]>;
};

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  role: "ADMIN" | "MEMBER";
  createdAt?: string;
  updatedAt?: string;
};

export type AuthPayload = {
  user: ApiUser;
  token: string;
};

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export function clearStoredAuthToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

apiClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/signup");

    if (status === 401 && !isAuthEndpoint) {
      clearStoredAuthToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      }
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const apiError = error as AxiosError<ApiResponse<unknown>>;
    if (!apiError.response) {
      return "Unable to reach the server. Please check your connection and try again.";
    }

    if (apiError.response.status >= 500) {
      return "The server is temporarily unavailable. Please try again in a moment.";
    }

    const details = apiError.response?.data?.details;
    const firstDetail = details ? Object.values(details).flat()[0] : undefined;
    return firstDetail || apiError.response.data?.message || "Something went wrong. Please try again.";
  }

  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export function getApiFieldErrors(error: unknown) {
  if (!axios.isAxiosError(error)) return {};

  const details = (error as AxiosError<ApiResponse<unknown>>).response?.data?.details;
  if (!details) return {};

  return Object.fromEntries(
    Object.entries(details).map(([field, messages]) => [field, messages[0] || "Invalid value"]),
  );
}
