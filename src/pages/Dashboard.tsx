import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bus, Users, TrendingUp, AlertTriangle, Calendar, Star, Cake, CheckCircle2, ArrowUpRight } from "lucide-react";
import { embarques, passageiros, prospeccoes } from "@/lib/mock-data";

const kpis = [
  { label: "Faturamento do mês", value: "R$ 284.500", trend: "+18,2%", icon: TrendingUp, accent: true },
  { label: "Embarques hoje", value: "7", trend: "2 em rota", icon: Bus },
  { label: "Passageiros ativos", value: "1.842", trend: "+126 este mês", icon: Users },
  { label: "Vendas concluídas", value: "92", trend: "+12 vs mês anterior", icon: CheckCircle2 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero border border-border p-8">
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/80 font-medium mb-2">Bem-vindo de volta</p>
            <h1 className="font-display text-3xl lg:text-4xl font-bold">Olá, Rafael 👋</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">Sua agência tem <span className="text-foreground font-medium">7 embarques hoje</span> e <span className="text-primary font-medium">5 oportunidades quentes</span> para revenda.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Hoje</p>
              <p className="font-display font-semibold text-lg">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="glass-card p-5 hover:border-primary/40 transition-all group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                <p className={`mt-2 font-display text-2xl font-bold ${k.accent ? "text-gradient-gold" : ""}`}>{k.value}</p>
                <p className="text-xs text-success mt-1.5 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />{k.trend}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <k.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximos embarques */}
        <Card className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-semibold text-lg">Próximos embarques</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Operacional dos próximos 14 dias</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{embarques.length} agendados</Badge>
          </div>
          <div className="space-y-3">
            {embarques.slice(0, 5).map((e) => {
              const ocupacao = Math.round((e.passageiros / e.capacidade) * 100);
              return (
                <div key={e.id} className="group flex items-center gap-4 p-3 rounded-xl bg-card-elevated/50 hover:bg-card-elevated border border-transparent hover:border-border transition-all">
                  <div className="flex flex-col items-center justify-center h-14 w-14 rounded-lg bg-gradient-gold text-primary-foreground shrink-0">
                    <span className="text-[10px] uppercase font-semibold opacity-80">{new Date(e.data).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
                    <span className="font-display font-bold text-lg leading-none">{new Date(e.data).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{e.destino}</p>
                      <Badge variant="outline" className="text-[10px] py-0 h-5 border-border">{e.hora}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{e.local}</p>
                  </div>
                  <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">Ocupação</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-gradient-gold" style={{ width: `${ocupacao}%` }} />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{ocupacao}%</span>
                    </div>
                  </div>
                  <Badge className={
                    e.status === "confirmado" ? "bg-success/15 text-success border-success/20" :
                    "bg-warning/15 text-warning border-warning/20"
                  } variant="outline">{e.status}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Alertas + prospecção */}
        <div className="space-y-4">
          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-warning/15 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <h3 className="font-display font-semibold">Alertas importantes</h3>
            </div>
            <div className="space-y-3">
              {[
                { txt: "3 check-ins pendentes para amanhã", t: "warning" },
                { txt: "Volvo XYZ-4F67 — revisão em 5 dias", t: "info" },
                { txt: "12 boletos vencem esta semana", t: "warning" },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${a.t === "warning" ? "bg-warning" : "bg-accent"}`} />
                  <p className="text-foreground/90">{a.txt}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass-card p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-40 w-40 bg-gradient-glow rounded-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-display font-semibold">Oportunidades quentes</h3>
              </div>
              <div className="space-y-3">
                {prospeccoes.slice(0, 3).map((p) => (
                  <div key={p.nome} className="p-3 rounded-lg bg-card-elevated/60 border border-border/50">
                    <p className="text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.motivo}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3"><Cake className="h-4 w-4 text-primary" /><h3 className="font-display font-semibold text-sm">Aniversariantes do mês</h3></div>
          <div className="space-y-2">
            {passageiros.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center text-xs font-bold text-primary-foreground">{p.nome[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.nome}</p>
                  <p className="text-[11px] text-muted-foreground">{p.cidade}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3"><Star className="h-4 w-4 text-primary" /><h3 className="font-display font-semibold text-sm">Passageiros VIP</h3></div>
          <div className="space-y-2">
            {passageiros.filter(p => p.tag === "VIP").slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <p className="text-sm truncate">{p.nome}</p>
                <span className="text-xs text-primary font-semibold">{p.viagens}x</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3"><Calendar className="h-4 w-4 text-primary" /><h3 className="font-display font-semibold text-sm">Retornos pendentes</h3></div>
          <p className="font-display text-3xl font-bold text-gradient-gold">23</p>
          <p className="text-xs text-muted-foreground mt-1">clientes prontos para nova viagem</p>
        </Card>
      </div>
    </div>
  );
}
