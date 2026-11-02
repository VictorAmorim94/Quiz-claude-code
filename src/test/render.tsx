import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routerFuture, routes } from '../App';
import { QuizProvider } from '../features/quiz/QuizProvider';

/** Renderiza a aplicação inteira numa rota, com os mesmos providers do main.tsx. */
export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path], future: routerFuture });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <QuizProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </QuizProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router };
}
