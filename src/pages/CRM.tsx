import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, MoreHorizontal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Etapa = Database["public"]["Enums"]["lead_etapa"];

const columns: { key: Etapa; title: string; color: string }[] = [
  { key: "novo", title: "Novo lead", color: "border-t-accent" },
  { key: "contato", title: "Contato realizado", color: "border-t-primary" },
  { key: "negociacao", title: "Em negociação", color: "border-t-warning" },
  { key: "aguardando", title: "Aguardando", color: "border-t-warning" },
  { key: "fechado", title: "Fechado", color: "border-t-success" },
  { key: "pos_venda", title: "Pós-venda", color: "border-t-muted-foreground" },
];

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      setLeads((data ?? []) as Lead[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("crm-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalGeral = leads.reduce((s, l) => s + Number(l.valor_estimado || 0), 0);

  const openWhats = (tel: string | null) => {
    if (!tel) return;
    const num = tel.replace(/\D/g, "");
    window.open(`https://wa.me/55${num}`, "_blank");
  };

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
          <p className="font-display text-2xl font-bold text-gradient-gold">R$ {totalGeral.toLocaleString("pt-BR")}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-x-auto pb-4 scrollbar-thin">
          <div className="flex gap-4 min-w-max">
            {columns.map((col) => {
              const cards = leads.filter(l => l.etapa === col.key);
              const total = cards.reduce((s, c) => s + Number(c.valor_estimado || 0), 0);
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
                    {cards.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 text-center py-6">Sem leads</p>
                    )}
                    {cards.map((c) => (
                      <Card key={c.id} className="glass-card p-3 hover:border-primary/40 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm leading-tight">{c.nome}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                        </div>
                        {c.destino && <p className="text-xs text-muted-foreground">→ {c.destino}</p>}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                          <span className="font-display font-bold text-sm text-gradient-gold">R$ {Number(c.valor_estimado || 0).toLocaleString("pt-BR")}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-success" onClick={() => openWhats(c.whatsapp || c.telefone)}><MessageCircle className="h-3 w-3" /></Button>
                            {c.telefone && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => window.open(`tel:${c.telefone}`)}><Phone className="h-3 w-3" /></Button>
                            )}
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
      )}
    </div>
  );
}
