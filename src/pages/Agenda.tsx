import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Embarque = Database["public"]["Tables"]["embarques"]["Row"];

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Agenda() {
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("embarques").select("*").order("data_saida", { ascending: true });
      setEmbarques((data ?? []) as Embarque[]);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("agenda-embarques")
      .on("postgres_changes", { event: "*", schema: "public", table: "embarques" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const monthName = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const embarquesByDay = embarques.reduce<Record<number, Embarque[]>>((acc, e) => {
    const d = new Date(e.data_saida);
    if (d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()) {
      const day = d.getDate();
      acc[day] = [...(acc[day] || []), e];
    }
    return acc;
  }, {});

  const proximas = embarques
    .filter(e => new Date(e.data_saida) >= new Date(new Date().setHours(0,0,0,0)))
    .slice(0, 20);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Agenda</p>
          <h1 className="font-display text-3xl font-bold">Embarques</h1>
          <p className="text-muted-foreground mt-1">Calendário visual de todas as saídas planejadas.</p>
        </div>
        <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow" onClick={() => window.location.href = "/embarques"}><Plus className="h-4 w-4 mr-2" />Novo embarque</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-lg capitalize">{monthName}</h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {weekdays.map((d) => (
                <div key={d} className="text-[11px] uppercase text-muted-foreground text-center font-medium tracking-wider py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((day, i) => {
                const items = day ? embarquesByDay[day] || [] : [];
                const hasEmbarque = items.length > 0;
                return (
                  <div
                    key={i}
                    className={`min-h-[78px] rounded-lg p-1.5 text-xs border transition-all ${
                      day
                        ? hasEmbarque
                          ? "bg-primary/5 border-primary/30 hover:border-primary/60 cursor-pointer"
                          : "bg-card-elevated/40 border-border/40 hover:border-border"
                        : "border-transparent"
                    }`}
                  >
                    {day && (
                      <>
                        <div className={`font-display font-semibold mb-1 ${hasEmbarque ? "text-primary" : "text-foreground/70"}`}>{day}</div>
                        {items.slice(0, 2).map((e) => {
                          const hora = new Date(e.data_saida).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                          return (
                            <div key={e.id} className="text-[10px] truncate bg-gradient-gold/90 text-primary-foreground rounded px-1.5 py-0.5 mb-0.5 font-medium">
                              {hora} {e.destino}
                            </div>
                          );
                        })}
                        {items.length > 2 && <div className="text-[10px] text-muted-foreground px-1">+{items.length - 2}</div>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold">Próximas saídas</h3>
            </div>
            <div className="space-y-3 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
              {proximas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum embarque agendado.</p>
              )}
              {proximas.map((e) => {
                const dt = new Date(e.data_saida);
                return (
                  <div key={e.id} className="p-3 rounded-lg bg-card-elevated/60 border border-border/40 hover:border-primary/40 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{e.destino}</p>
                      <Badge variant="outline" className={
                        e.status === "confirmado" ? "bg-success/15 text-success border-success/20" :
                        "bg-warning/15 text-warning border-warning/20"
                      }>{e.status}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{dt.toLocaleDateString("pt-BR")} • {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                      {e.local_embarque && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{e.local_embarque}</div>}
                      <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{e.origem} → {e.destino}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
