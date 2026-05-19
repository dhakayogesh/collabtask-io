import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { getApiErrorMessage } from "@/lib/api-client";
import { toast } from "sonner";
import axios from "axios";

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (typeof window !== "undefined") toast.error(getApiErrorMessage(error));
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.options.onError) return;
        if (typeof window !== "undefined") toast.error(getApiErrorMessage(error));
      },
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          if (status === 401 || status === 403 || status === 404) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        throwOnError: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
