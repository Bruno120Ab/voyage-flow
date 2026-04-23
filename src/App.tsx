import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth";
import Aguardando from "./pages/Aguardando";
import Frota from "./pages/Frota";
import Embarques from "./pages/Embarques";
import Agenda from "./pages/Agenda";
import Passageiros from "./pages/Passageiros";
import CRM from "./pages/CRM";
import Prospeccao from "./pages/Prospeccao";
import Equipe from "./pages/Equipe";
import Placeholder from "./pages/Placeholder";

const queryClient = new QueryClient();

const protectedLayout = (node: React.ReactNode) => (
  <ProtectedRoute><AppLayout>{node}</AppLayout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/aguardando" element={<Aguardando />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/frota" element={protectedLayout(<Frota />)} />
            <Route path="/embarques" element={protectedLayout(<Embarques />)} />
            <Route path="/agenda" element={protectedLayout(<Agenda />)} />
            <Route path="/passageiros" element={protectedLayout(<Passageiros />)} />
            <Route path="/crm" element={protectedLayout(<CRM />)} />
            <Route path="/prospeccao" element={protectedLayout(<Prospeccao />)} />
            <Route path="/equipe" element={protectedLayout(<Equipe />)} />
            <Route path="/financeiro" element={protectedLayout(<Placeholder title="Financeiro" subtitle="Contas a receber, comissões, fluxo de caixa e lucro por viagem." />)} />
            <Route path="/relatorios" element={protectedLayout(<Placeholder title="Relatórios inteligentes" subtitle="Melhores rotas, ranking de motoristas, margem por viagem." />)} />
            <Route path="/whatsapp" element={protectedLayout(<Placeholder title="WhatsApp integrado" subtitle="Lembretes, cobrança automática, campanhas de retorno." />)} />
            <Route path="/configuracoes" element={protectedLayout(<Placeholder title="Configurações" subtitle="Preferências da agência, integrações e personalização." />)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
