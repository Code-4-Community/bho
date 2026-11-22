import { QueryClient } from '@tanstack/react-query';

// A function so tests can build a fresh client (and cache) for every render.
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false },
    },
  });

export const queryClient = createQueryClient();
