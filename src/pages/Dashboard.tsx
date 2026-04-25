import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bus, Users, TrendingUp, AlertTriangle, Calendar, Star, CheckCircle2, ArrowUpRight, Loader2, DollarSign, Wallet, Activity, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  faturamentoMes: number;
  custoMes: number;
  lucroMes: number;
  comissaoEstimada: number;
  
  valorEmNegociacao: number;
  comissaoPotencial: number;
  leadsAtivos: number;

  totalPassageiros: number;
  passageirosInativos: number;
  oportunidadesRetorno: number;

  veiculosOperando: number;
  veiculosManutencao: number;
  
  proximos: any[];
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const load = async () => {
      const now = new Date().toISOString();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      
      const [embMonth, embFuture, pax, lds, veics] = await Promise.all([
        supabase.from("embarques").select("valor_operacao, custo_operacao").gte("data_saida", monthStart),
        supabase.from("embarques").select("*, veiculos(placa)").gte("data_saida", now).order("data_saida").limit(5),
        supabase.from("passageiros").select("id, ticket_medio, tag, ultima_viagem, total_viagens"),
        supabase.from("leads").select("id, valor_estimado, etapa"),
        supabase.from("veiculos").select("id, status"),
      ]);

      // Financeiro
      const faturamentoMes = (embMonth.data ?? []).reduce((s, e) => s + Number(e.valor_operacao || 0), 0);
      const custoMes = (embMonth.data ?? []).reduce((s, e) => s + Number(e.custo_operacao || 0), 0);
      const lucroMes = faturamentoMes - custoMes;
      const comissaoEstimada = faturamentoMes * 0.08;

      // Comercial
      const leadsData = lds.data ?? [];
      const leadsAtivos = leadsData.filter(l => ["novo", "contato", "negociacao", "aguardando"].includes(l.etapa));
      const valorEmNegociacao = leadsAtivos.reduce((s, l) => s + Number(l.valor_estimado || 0), 0);
      const comissaoPotencial = valorEmNegociacao * 0.08;

      // Passageiros
      const paxData = pax.data ?? [];
      const oportunidadesRetorno = paxData.filter(p => p.tag === "retorno" || p.tag === "quente").length;
      const passageirosInativos = paxData.filter(p => {
        if (p.tag === "inativo") return true;
        if (!p.ultima_viagem) return Number(p.total_viagens) > 0;
        const D60 = 60 * 24 * 60 * 60 * 1000;
        return Date.now() - new Date(p.ultima_viagem).getTime() > D60;
      }).length;

      // Frota
      const veicData = veics.data ?? [];
      const veiculosOperando = veicData.filter(v => v.status === "operando").length;
      const veiculosManutencao = veicData.filter(v => v.status === "manutencao").length;

      setStats({
        faturamentoMes, custoMes, lucroMes, comissaoEstimada,
        valorEmNegociacao, comissaoPotencial, leadsAtivos: leadsAtivos.length,
        totalPassageiros: paxData.length, passageirosInativos, oportunidadesRetorno,
        veiculosOperando, veiculosManutencao,
        proximos: embFuture.data ?? [],
      });
    };
    load();
  }, []);

  if (!stats) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero border border-border p-8">
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/80 font-medium mb-2">Painel Consolidado</p>
            <h1 className="font-display text-3xl lg:text-4xl font-bold">Olá, {profile?.nome?.split(" ")[0] || "agente"} 👋</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Você tem <span className="text-foreground font-medium">{stats.proximos.length} embarques próximos</span> e <span className="text-foreground font-medium">{stats.leadsAtivos} leads</span> em andamento.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Hoje</p>
            <p className="font-display font-semibold text-lg">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Visão Financeira</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card p-5 hover:border-primary/40 transition-all border-l-4 border-l-primary group">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Faturamento do Mês</p>
            <p className="mt-2 font-display text-2xl font-bold text-gradient-gold">R$ {stats.faturamentoMes.toLocaleString("pt-BR")}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Comissão (8%):</span>
              <span className="text-success font-semibold">R$ {stats.comissaoEstimada.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </Card>
          <Card className="glass-card p-5 hover:border-primary/40 transition-all group">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex justify-between">Lucro da Empresa <Wallet className="h-4 w-4 opacity-50" /></p>
            <p className="mt-2 font-display text-2xl font-bold">R$ {stats.lucroMes.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground mt-2">Faturamento - Custos operacionais</p>
          </Card>
          <Card className="glass-card p-5 hover:border-primary/40 transition-all border-l-4 border-l-warning group">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pipeline em Negociação</p>
            <p className="mt-2 font-display text-2xl font-bold">R$ {stats.valorEmNegociacao.toLocaleString("pt-BR")}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Comissão Potencial:</span>
              <span className="text-success font-semibold">R$ {stats.comissaoPotencial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </Card>
          <Card className="glass-card p-5 hover:border-primary/40 transition-all group">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex justify-between">Leads Ativos <Activity className="h-4 w-4 opacity-50" /></p>
            <p className="mt-2 font-display text-2xl font-bold">{stats.leadsAtivos}</p>
            <p className="text-xs text-muted-foreground mt-2">Oportunidades quentes abertas</p>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-semibold text-lg flex items-center gap-2"><Bus className="h-5 w-5 text-primary" /> Operacional e Frota</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Veículos operando e próximos embarques</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">{stats.veiculosOperando} Operando</Badge>
                {stats.veiculosManutencao > 0 && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{stats.veiculosManutencao} Manutenção</Badge>}
              </div>
            </div>
            
            {stats.proximos.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                Nenhum embarque agendado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.proximos.map((e: any) => {
                  const dt = new Date(e.data_saida);
                  return (
                    <div key={e.id} className="flex items-center gap-4 p-3 rounded-xl bg-card-elevated/50 hover:bg-card-elevated border border-transparent hover:border-border transition-all">
                      <div className="flex flex-col items-center justify-center h-14 w-14 rounded-lg bg-gradient-gold text-primary-foreground shrink-0">
                        <span className="text-[10px] uppercase font-semibold opacity-80">{dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
                        <span className="font-display font-bold text-lg leading-none">{dt.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{e.origem} → {e.destino}</p>
                        <p className="text-xs text-muted-foreground flex gap-2 items-center mt-0.5">
                          <span>{e.local_embarque || "Local não definido"}</span>
                          {e.veiculos?.placa && <span>• Carro: {e.veiculos.placa}</span>}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-border bg-background">{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card p-6">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4"><Users className="h-5 w-5 text-primary" /> Base de Clientes</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border/50">
                <div>
                  <p className="font-medium">Total de Passageiros</p>
                  <p className="text-xs text-muted-foreground">Clientes cadastrados na base</p>
                </div>
                <p className="font-display font-bold text-lg">{stats.totalPassageiros}</p>
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-border/50">
                <div>
                  <p className="font-medium text-warning">Retornos Pendentes</p>
                  <p className="text-xs text-muted-foreground">Clientes para vender volta</p>
                </div>
                <Badge variant="secondary" className="bg-warning/15 text-warning">{stats.oportunidadesRetorno}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-muted-foreground">Passageiros Inativos</p>
                  <p className="text-xs text-muted-foreground">+60 dias sem viajar</p>
                </div>
                <Badge variant="outline">{stats.passageirosInativos}</Badge>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-6 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold">CRM Inteligente</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Seu funil de vendas tem <strong>{stats.leadsAtivos}</strong> leads aguardando uma ação. Acompanhe a área de CRM para fechamentos mais rápidos.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
