import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { OverviewPage } from './pages/OverviewPage';
import { DataExplorerPage } from './pages/DataExplorerPage';
import { DataQualityPage } from './pages/DataQualityPage';
import { InvestigationStudioPage } from './pages/InvestigationStudioPage';
import { NarrativeIntelligencePage } from './pages/NarrativeIntelligencePage';
import { SqlWorkbenchPage } from './pages/SqlWorkbenchPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* App Layout Routes */}
          <Route element={<Layout />}>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/explorer" element={<DataExplorerPage />} />
            <Route path="/quality" element={<DataQualityPage />} />
            <Route path="/investigations" element={<InvestigationStudioPage />} />
            <Route path="/narratives" element={<NarrativeIntelligencePage />} />
            <Route path="/workbench" element={<SqlWorkbenchPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
