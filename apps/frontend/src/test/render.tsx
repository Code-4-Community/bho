import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createQueryClient } from '@api/queryClient';
import { Providers } from '../providers';

// Use this instead of render() for anything that uses Chakra components or
// react-query. Each call gets a fresh QueryClient so tests never share a cache.
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const client = createQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Providers client={client}>{children}</Providers>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
