import axios, { AxiosError } from "axios";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = (configuredApiBaseUrl || "http://127.0.0.1:5000").replace(/\/$/, "");
export const AUTH_TOKEN_KEY = "wetask.auth.token";

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

apiClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const apiError = error as AxiosError<ApiResponse<unknown>>;
    const details = apiError.response?.data?.details;
    const firstDetail = details ? Object.values(details).flat()[0] : undefined;
    return firstDetail || apiError.response?.data?.message || apiError.message;
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
