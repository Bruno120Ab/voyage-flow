import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Passageiro = Database["public"]["Tables"]["passageiros"]["Row"];

interface ProspeccaoItem {
  id: string;
  nome: string;
  motivo: string;
  urgencia: "alta" | "media";
  whatsapp: string | null;
  ticket: number;
}

export default function Prospeccao() {
  const [items, setItems] = useState<ProspeccaoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("passageiros").select("*");
      const pax = (data ?? []) as Passageiro[];
      const hoje = new Date();
      const result: ProspeccaoItem[] = [];

      pax.forEach(p => {
        const ultima = p.ultima_viagem ? new Date(p.ultima_viagem) : null;
        const diasDesde = ultima ? Math.floor((hoje.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24)) : null;

        if (p.tag === "quente") {
          result.push({ id: p.id, nome: p.nome, motivo: "Cliente quente — pronto para fechar venda", urgencia: "alta", whatsapp: p.whatsapp || p.telefone, ticket: Number(p.ticket_medio || 0) });
        } else if (p.tag === "vip" && p.total_viagens >= 5) {
          result.push({ id: p.id, nome: p.nome, motivo: `VIP com ${p.total_viagens} viagens — campanha de fidelidade`, urgencia: "media", whatsapp: p.whatsapp || p.telefone, ticket: Number(p.ticket_medio || 0) });
        } else if (p.tag === "retorno" || (diasDesde !== null && diasDesde >= 60 && diasDesde <= 120)) {
          result.push({ id: p.id, nome: p.nome, motivo: diasDesde ? `Comprou há ${diasDesde} dias — perfil para revenda` : "Marcado para vender a volta", urgencia: "alta", whatsapp: p.whatsapp || p.telefone, ticket: Number(p.ticket_medio || 0) });
        } else if (p.tag === "inativo" || (diasDesde !== null && diasDesde > 150)) {
          result.push({ id: p.id, nome: p.nome, motivo: diasDesde ? `Inativo há ${Math.floor(diasDesde/30)} meses — reativação` : "Cliente inativo — reativação", urgencia: "media", whatsapp: p.whatsapp || p.telefone, ticket: Number(p.ticket_medio || 0) });
        }
      });

      setItems(result);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("prospeccao-passageiros")
      .on("postgres_changes", { event: "*", schema: "public", table: "passageiros" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const receitaEstimada = items.reduce((s, i) => s + i.ticket, 0);

  const openWhats = (tel: string | null) => {
    if (!tel) return;
    const num = tel.replace(/\D/g, "");
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent("Olá! Tudo bem? Aqui é da viação, podemos conversar?")}`, "_blank");
  };

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
            <h2 className="font-display font-semibold text-lg">{items.length} oportunidades detectadas</h2>
            <p className="text-sm text-muted-foreground">Estimativa de receita: <span className="text-gradient-gold font-semibold">R$ {receitaEstimada.toLocaleString("pt-BR")}</span> em revendas</p>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="glass-card p-10 text-center text-muted-foreground">
          Nenhuma oportunidade detectada. Cadastre passageiros com tag "quente", "retorno" ou "inativo" para começar.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((p) => (
            <Card key={p.id} className="glass-card p-5 hover:border-primary/40 transition-all">
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
                <Button size="sm" className="flex-1 bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={() => openWhats(p.whatsapp)}><MessageCircle className="h-3.5 w-3.5 mr-1.5" />Contatar</Button>
                <Button size="sm" variant="outline" className="border-border">Adiar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
