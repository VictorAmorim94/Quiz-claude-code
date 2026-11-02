import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routerFuture, routes } from './App';
import { QuizProvider } from './features/quiz/QuizProvider';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

const router = createBrowserRouter(routes, { future: routerFuture });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <QuizProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </QuizProvider>
    </QueryClientProvider>
  </StrictMode>,
);
