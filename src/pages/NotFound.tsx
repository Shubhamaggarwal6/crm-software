import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-primary mb-4">
          <span className="text-2xl font-display font-bold text-primary-foreground">B</span>
        </div>
        <h1 className="text-6xl font-display font-bold text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-1">Page not found</p>
        <p className="text-sm text-muted-foreground mb-6">
          Yeh page exist nahi karta ya coming soon hai.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href="/" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Home className="h-4 w-4" /> Go to Dashboard
          </a>
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
