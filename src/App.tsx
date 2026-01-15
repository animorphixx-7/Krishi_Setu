import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Equipment from "./pages/Equipment";
import EquipmentDetail from "./pages/EquipmentDetail";
import MarketPrices from "./pages/MarketPrices";
import Weather from "./pages/Weather";
import CropCalendar from "./pages/CropCalendar";
import CropComparison from "./pages/CropComparison";
import GovernmentSchemes from "./pages/GovernmentSchemes";
import Helpline from "./pages/Helpline";
import Admin from "./pages/Admin";
import MyEquipment from "./pages/MyEquipment";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route path="/market-prices" element={<MarketPrices />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/crop-calendar" element={<CropCalendar />} />
            <Route path="/crop-comparison" element={<CropComparison />} />
            <Route path="/government-schemes" element={<GovernmentSchemes />} />
            <Route path="/helpline" element={<Helpline />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/my-equipment" element={<MyEquipment />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/profile" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
