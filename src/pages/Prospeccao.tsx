import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prospeccoes } from "@/lib/mock-data";
import { Sparkles, MessageCircle, TrendingUp } from "lucide-react";

export default function Prospeccao() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary mb-1">Inteligência</p>
        <h1 className="font-display text-3xl font-bold">Prospecção inteligente</h1>
        <p className="text-muted-foreground mt-1">Sugestões automáticas baseadas no histórico de cada cliente.</p>
      </div>

      <Card className="glass-card p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-60 w-60 bg-gradient-glow rounded-full" />
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg">23 oportunidades detectadas</h2>
            <p className="text-sm text-muted-foreground">Estimativa de receita: <span className="text-gradient-gold font-semibold">R$ 47.800</span> em revendas</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prospeccoes.map((p, i) => (
          <Card key={i} className="glass-card p-5 hover:border-primary/40 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm">{p.nome.split(" ").map(w => w[0]).slice(0,2).join("")}</div>
                <div>
                  <p className="font-medium">{p.nome}</p>
                  <Badge variant="outline" className={p.urgencia === "alta" ? "bg-destructive/15 text-destructive border-destructive/30 mt-1" : "bg-warning/15 text-warning border-warning/30 mt-1"}>
                    {p.urgencia === "alta" ? "Alta urgência" : "Média urgência"}
                  </Badge>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm text-foreground/80 mb-4">{p.motivo}</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-gradient-gold text-primary-foreground hover:opacity-90"><MessageCircle className="h-3.5 w-3.5 mr-1.5" />Contatar</Button>
              <Button size="sm" variant="outline" className="border-border">Adiar</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
