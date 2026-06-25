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
import CropDoctor from "./pages/CropDoctor";
import CropRecommendation from "./pages/CropRecommendation";
import CommunityForum from "./pages/CommunityForum";
import AIChat from "./pages/AIChat";
import FarmingAdvisor from "./pages/FarmingAdvisor";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ProtectedRoute from "@/components/ProtectedRoute";
import MobileBottomNav from "@/components/MobileBottomNav";

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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route path="/market-prices" element={<MarketPrices />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/crop-calendar" element={<CropCalendar />} />
            <Route path="/crop-comparison" element={<CropComparison />} />
            <Route path="/crop-recommendation" element={<ProtectedRoute><CropRecommendation /></ProtectedRoute>} />
            <Route path="/government-schemes" element={<GovernmentSchemes />} />
            <Route path="/helpline" element={<Helpline />} />
            <Route path="/crop-doctor" element={<ProtectedRoute><CropDoctor /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityForum /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireRole="admin"><Admin /></ProtectedRoute>} />
            <Route path="/my-equipment" element={<ProtectedRoute><MyEquipment /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
            <Route path="/farming-advisor" element={<ProtectedRoute><FarmingAdvisor /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MobileBottomNav />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
