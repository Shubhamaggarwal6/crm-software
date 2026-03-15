import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/AuthProvider";
import { AppProvider } from "@/context/AppContext";
import { LanguageProvider } from "@/context/LanguageContext";
import MainApp from "@/pages/Index";

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <MainApp />
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
