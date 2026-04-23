import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { leads } from "@/lib/mock-data";
import { MessageCircle, Phone, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const columns = [
  { key: "novo", title: "Novo lead", color: "border-t-accent" },
  { key: "contato", title: "Contato realizado", color: "border-t-primary" },
  { key: "negociacao", title: "Em negociação", color: "border-t-warning" },
  { key: "aguardando", title: "Aguardando", color: "border-t-warning" },
  { key: "fechado", title: "Fechado", color: "border-t-success" },
  { key: "posVenda", title: "Pós-venda", color: "border-t-muted-foreground" },
] as const;

export default function CRM() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">CRM</p>
          <h1 className="font-display text-3xl font-bold">Funil de vendas</h1>
          <p className="text-muted-foreground mt-1">Pipeline visual com todas as oportunidades em andamento.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pipeline total</p>
          <p className="font-display text-2xl font-bold text-gradient-gold">R$ 42.400</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 scrollbar-thin">
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => {
            const cards = (leads as any)[col.key] as { id: string; nome: string; destino: string; valor: number; tel: string }[];
            const total = cards.reduce((s, c) => s + c.valor, 0);
            return (
              <div key={col.key} className={`w-72 shrink-0 rounded-xl bg-card-elevated/40 border border-border/40 border-t-2 ${col.color} p-3`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div>
                    <h3 className="font-display font-semibold text-sm">{col.title}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{cards.length} • R$ {total.toLocaleString("pt-BR")}</p>
                  </div>
                  <Badge variant="outline" className="text-xs border-border">{cards.length}</Badge>
                </div>
                <div className="space-y-2">
                  {cards.map((c) => (
                    <Card key={c.id} className="glass-card p-3 hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm leading-tight">{c.nome}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </div>
                      <p className="text-xs text-muted-foreground">→ {c.destino}</p>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                        <span className="font-display font-bold text-sm text-gradient-gold">R$ {c.valor.toLocaleString("pt-BR")}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-success"><MessageCircle className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary"><Phone className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
