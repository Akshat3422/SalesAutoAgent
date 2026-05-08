import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import WorkflowSidebar from './components/WorkflowSidebar';
import MainPanel from './components/MainPanel';
import MetricsPanel from './components/MetricsPanel';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 3000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex flex-col bg-surface-alt">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <WorkflowSidebar />
          <MainPanel />
          <MetricsPanel />
        </div>
      </div>
    </QueryClientProvider>
  );
}
