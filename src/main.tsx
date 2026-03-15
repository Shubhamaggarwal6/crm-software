import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import App from "./App.tsx";
import PublicShareView from "./pages/PublicShareView.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ShareRoute() {
  const { token } = useParams<{ token: string }>();
  return <PublicShareView token={token || ''} />;
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/share/:token" element={<ShareRoute />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);
