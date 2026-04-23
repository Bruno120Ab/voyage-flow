import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Frota from "./pages/Frota";
import Agenda from "./pages/Agenda";
import Passageiros from "./pages/Passageiros";
import CRM from "./pages/CRM";
import Prospeccao from "./pages/Prospeccao";
import Placeholder from "./pages/Placeholder";

const queryClient = new QueryClient();

const wrap = (node: React.ReactNode) => <AppLayout>{node}</AppLayout>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/frota" element={wrap(<Frota />)} />
          <Route path="/agenda" element={wrap(<Agenda />)} />
          <Route path="/passageiros" element={wrap(<Passageiros />)} />
          <Route path="/crm" element={wrap(<CRM />)} />
          <Route path="/prospeccao" element={wrap(<Prospeccao />)} />
          <Route path="/financeiro" element={wrap(<Placeholder title="Financeiro" subtitle="Contas a receber, comissões, fluxo de caixa e lucro por viagem." />)} />
          <Route path="/relatorios" element={wrap(<Placeholder title="Relatórios inteligentes" subtitle="Melhores rotas, ranking de motoristas, margem por viagem." />)} />
          <Route path="/whatsapp" element={wrap(<Placeholder title="WhatsApp integrado" subtitle="Lembretes, cobrança automática, campanhas de retorno." />)} />
          <Route path="/configuracoes" element={wrap(<Placeholder title="Configurações" subtitle="Equipe, permissões, perfis e integrações." />)} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
