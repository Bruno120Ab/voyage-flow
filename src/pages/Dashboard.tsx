import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bus, Users, TrendingUp, AlertTriangle, Calendar, Star, CheckCircle2, ArrowUpRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Stats {
  faturamento: number;
  embarquesFuturos: number;
  passageiros: number;
  veiculosOperando: number;
  proximos: any[];
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      const now = new Date().toISOString();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [emb, pax, veic, fat] = await Promise.all([
        supabase.from("embarques").select("*, veiculos(placa)").gte("data_saida", now).order("data_saida").limit(5),
        supabase.from("passageiros").select("id", { count: "exact", head: true }),
        supabase.from("veiculos").select("id", { count: "exact", head: true }).eq("status", "operando"),
        supabase.from("embarques").select("valor_operacao").gte("data_saida", monthStart),
      ]);
      const faturamento = (fat.data ?? []).reduce((s, e: any) => s + Number(e.valor_operacao || 0), 0);
      setStats({
        faturamento,
        embarquesFuturos: emb.data?.length ?? 0,
        passageiros: pax.count ?? 0,
        veiculosOperando: veic.count ?? 0,
        proximos: emb.data ?? [],
      });
    };
    load();
  }, []);

  if (!stats) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Faturamento do mês", value: `R$ ${stats.faturamento.toLocaleString("pt-BR")}`, trend: "Mês corrente", icon: TrendingUp, accent: true },
    { label: "Próximos embarques", value: String(stats.embarquesFuturos), trend: "Agendados", icon: Bus },
    { label: "Passageiros na base", value: stats.passageiros.toLocaleString("pt-BR"), trend: "Total cadastrado", icon: Users },
    { label: "Veículos operando", value: String(stats.veiculosOperando), trend: "Em rota agora", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero border border-border p-8">
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/80 font-medium mb-2">Bem-vindo de volta</p>
            <h1 className="font-display text-3xl lg:text-4xl font-bold">Olá, {profile?.nome?.split(" ")[0] || "agente"} 👋</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              {stats.embarquesFuturos > 0
                ? <>Você tem <span className="text-foreground font-medium">{stats.embarquesFuturos} embarques</span> agendados.</>
                : "Cadastre seu primeiro embarque para começar a operar."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Hoje</p>
            <p className="font-display font-semibold text-lg">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="glass-card p-5 hover:border-primary/40 transition-all group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                <p className={`mt-2 font-display text-2xl font-bold ${k.accent ? "text-gradient-gold" : ""}`}>{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />{k.trend}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <k.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-semibold text-lg">Próximos embarques</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Operacional dos próximos dias</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{stats.proximos.length}</Badge>
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
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{e.local_embarque || "—"}</p>
                    </div>
                    <Badge variant="outline" className="border-border">{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-warning/15 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <h3 className="font-display font-semibold">Comece por aqui</h3>
            </div>
            <div className="space-y-2.5 text-sm">
              <p className="text-muted-foreground">1. Cadastre seus veículos na <span className="text-foreground">Frota</span></p>
              <p className="text-muted-foreground">2. Adicione seus passageiros</p>
              <p className="text-muted-foreground">3. Crie seu primeiro embarque</p>
              <p className="text-muted-foreground">4. Aprove sua equipe em <span className="text-foreground">Equipe</span></p>
            </div>
          </Card>

          <Card className="glass-card p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-40 w-40 bg-gradient-glow rounded-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-primary" />
                <h3 className="font-display font-semibold">Dica</h3>
              </div>
              <p className="text-sm text-muted-foreground">A próxima fase ativa o WhatsApp integrado para confirmar embarques e fazer prospecção em massa automaticamente.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
