import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fleet, FleetStatus } from "@/lib/mock-data";
import { Bus, MapPin, User, Plus, Filter } from "lucide-react";

const statusStyle: Record<FleetStatus, string> = {
  operando: "bg-success/15 text-success border-success/30",
  agendado: "bg-accent/15 text-accent border-accent/30",
  finalizado: "bg-muted text-muted-foreground border-border",
  manutencao: "bg-warning/15 text-warning border-warning/30",
};

const statusLabel: Record<FleetStatus, string> = {
  operando: "Em operação",
  agendado: "Agendado",
  finalizado: "Finalizado",
  manutencao: "Manutenção",
};

export default function Frota() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Frota</p>
          <h1 className="font-display text-3xl font-bold">Gestão de carros</h1>
          <p className="text-muted-foreground mt-1">Controle todos os veículos: operando, agendados e finalizados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border"><Filter className="h-4 w-4 mr-2" />Filtros</Button>
          <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo veículo</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["operando", "agendado", "finalizado", "manutencao"] as FleetStatus[]).map((s) => {
          const count = fleet.filter(f => f.status === s).length;
          return (
            <Card key={s} className="glass-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{statusLabel[s]}</p>
              <p className="font-display text-3xl font-bold mt-1">{count}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {fleet.map((v) => {
          const lucro = v.valor - v.custo;
          return (
            <Card key={v.id} className="glass-card p-5 hover:border-primary/40 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Bus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-base">{v.placa}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{v.modelo}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusStyle[v.status]}>{statusLabel[v.status]}</Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-foreground">{v.motorista}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-foreground">{v.origem} → {v.destino}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <span>Saída: <span className="text-foreground">{v.saida}</span></span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Valor</p>
                  <p className="text-sm font-semibold mt-0.5">R$ {v.valor.toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Custo</p>
                  <p className="text-sm font-semibold mt-0.5">R$ {v.custo.toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Lucro</p>
                  <p className={`text-sm font-bold mt-0.5 ${lucro > 0 ? "text-gradient-gold" : "text-muted-foreground"}`}>R$ {lucro.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
