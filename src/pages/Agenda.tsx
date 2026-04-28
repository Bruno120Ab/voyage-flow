import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Plus, Loader2, ListChecks, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Embarque = Database["public"]["Tables"]["embarques"]["Row"];
type Tarefa = Database["public"]["Tables"]["tarefas"]["Row"];

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const prioridadeStyle: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground border-border",
  normal: "bg-primary/15 text-primary border-primary/30",
  alta: "bg-warning/15 text-warning border-warning/30",
  urgente: "bg-destructive/15 text-destructive border-destructive/30",
};

const statusStyle: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground border-border",
  em_andamento: "bg-primary/15 text-primary border-primary/30",
  concluida: "bg-success/15 text-success border-success/30",
  cancelada: "bg-destructive/10 text-destructive/80 border-destructive/20",
};

export default function Agenda() {
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().slice(0, 10));
  const [taskDialog, setTaskDialog] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [hora, setHora] = useState("");
  const [prioridade, setPrioridade] = useState<"baixa" | "normal" | "alta" | "urgente">("normal");
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "pendente" | "concluida">("todas");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: emb }, { data: tar }] = await Promise.all([
        supabase.from("embarques").select("*").order("data_saida", { ascending: true }),
        supabase.from("tarefas").select("*").order("data", { ascending: true }),
      ]);
      setEmbarques((emb ?? []) as Embarque[]);
      setTarefas((tar ?? []) as Tarefa[]);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("agenda-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "embarques" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefas" }, load)
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

  const tarefasByDay = tarefas.reduce<Record<number, Tarefa[]>>((acc, t) => {
    const [y, m, d] = t.data.split("-").map(Number);
    if (m - 1 === date.getMonth() && y === date.getFullYear()) {
      acc[d] = [...(acc[d] || []), t];
    }
    return acc;
  }, {});

  const proximas = embarques
    .filter(e => new Date(e.data_saida) >= new Date(new Date().setHours(0,0,0,0)))
    .slice(0, 12);

  const tarefasDoDia = tarefas
    .filter(t => t.data === selectedDay)
    .filter(t => filtroStatus === "todas" ? true : filtroStatus === "concluida" ? t.status === "concluida" : t.status !== "concluida" && t.status !== "cancelada")
    .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));

  const stats = {
    pendentes: tarefas.filter(t => t.status === "pendente" || t.status === "em_andamento").length,
    concluidas: tarefas.filter(t => t.status === "concluida").length,
    hoje: tarefas.filter(t => t.data === new Date().toISOString().slice(0, 10)).length,
  };

  const openTaskDialog = (dia?: string) => {
    if (dia) setSelectedDay(dia);
    setTitulo(""); setDescricao(""); setHora(""); setPrioridade("normal");
    setTaskDialog(true);
  };

  const salvarTarefa = async () => {
    if (!titulo.trim()) { toast.error("Informe o título da tarefa"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("tarefas").insert({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      data: selectedDay,
      hora: hora || null,
      prioridade,
      status: "pendente",
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa criada");
    setTaskDialog(false);
  };

  const toggleTarefa = async (t: Tarefa) => {
    const novoStatus = t.status === "concluida" ? "pendente" : "concluida";
    const { error } = await supabase.from("tarefas").update({
      status: novoStatus,
      concluida_em: novoStatus === "concluida" ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) toast.error(error.message);
  };

  const apagarTarefa = async (id: string) => {
    const { error } = await supabase.from("tarefas").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Tarefa removida");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Agenda</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Embarques & Tarefas</h1>
          <p className="text-muted-foreground mt-1">Calendário visual com tarefas do dia.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => openTaskDialog(new Date().toISOString().slice(0,10))}>
            <ListChecks className="h-4 w-4 mr-2" />Nova tarefa
          </Button>
          <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow" onClick={() => window.location.href = "/embarques"}>
            <Plus className="h-4 w-4 mr-2" />Novo embarque
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="glass-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tarefas hoje</p>
          <p className="font-display text-2xl font-bold text-primary mt-1">{stats.hoje}</p>
        </Card>
        <Card className="glass-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Pendentes</p>
          <p className="font-display text-2xl font-bold text-warning mt-1">{stats.pendentes}</p>
        </Card>
        <Card className="glass-card p-4 col-span-2 sm:col-span-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Concluídas</p>
          <p className="font-display text-2xl font-bold text-success mt-1">{stats.concluidas}</p>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card p-4 sm:p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-lg capitalize">{monthName}</h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
              {weekdays.map((d) => (
                <div key={d} className="text-[10px] sm:text-[11px] uppercase text-muted-foreground text-center font-medium tracking-wider py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {cells.map((day, i) => {
                const items = day ? embarquesByDay[day] || [] : [];
                const tasks = day ? tarefasByDay[day] || [] : [];
                const dayStr = day ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` : "";
                const isSelected = dayStr === selectedDay;
                const hasContent = items.length > 0 || tasks.length > 0;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => day && setSelectedDay(dayStr)}
                    className={`min-h-[70px] sm:min-h-[82px] rounded-lg p-1 sm:p-1.5 text-xs border transition-all text-left ${
                      day
                        ? isSelected
                          ? "bg-primary/15 border-primary"
                          : hasContent
                            ? "bg-primary/5 border-primary/30 hover:border-primary/60"
                            : "bg-card-elevated/40 border-border/40 hover:border-border"
                        : "border-transparent cursor-default"
                    }`}
                  >
                    {day && (
                      <>
                        <div className={`font-display font-semibold mb-1 ${hasContent ? "text-primary" : "text-foreground/70"}`}>{day}</div>
                        {items.slice(0, 1).map((e) => {
                          const hora = new Date(e.data_saida).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                          return (
                            <div key={e.id} className="text-[9px] sm:text-[10px] truncate bg-gradient-gold/90 text-primary-foreground rounded px-1 sm:px-1.5 py-0.5 mb-0.5 font-medium">
                              {hora} {e.destino}
                            </div>
                          );
                        })}
                        {tasks.slice(0, 1).map((t) => (
                          <div key={t.id} className={`text-[9px] sm:text-[10px] truncate rounded px-1 sm:px-1.5 py-0.5 mb-0.5 font-medium border ${t.status === "concluida" ? "bg-success/20 text-success border-success/30 line-through" : "bg-accent/30 text-foreground border-accent/40"}`}>
                            ✓ {t.titulo}
                          </div>
                        ))}
                        {(items.length + tasks.length) > 2 && <div className="text-[9px] sm:text-[10px] text-muted-foreground px-1">+{items.length + tasks.length - 2}</div>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <h3 className="font-display font-semibold">Tarefas do dia</h3>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openTaskDialog()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </p>

              <div className="flex gap-1 mb-3">
                {(["todas", "pendente", "concluida"] as const).map(f => (
                  <button key={f} onClick={() => setFiltroStatus(f)} className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition ${filtroStatus === f ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-border"}`}>
                    {f === "todas" ? "Todas" : f === "pendente" ? "A fazer" : "Feitas"}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
                {tarefasDoDia.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa neste dia.</p>
                )}
                {tarefasDoDia.map((t) => (
                  <div key={t.id} className={`p-3 rounded-lg bg-card-elevated/60 border border-border/40 hover:border-primary/40 transition-all group ${t.status === "concluida" ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={t.status === "concluida"}
                        onCheckedChange={() => toggleTarefa(t)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${t.status === "concluida" ? "line-through" : ""}`}>{t.titulo}</p>
                        {t.descricao && <p className="text-[11px] text-muted-foreground mt-0.5">{t.descricao}</p>}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {t.hora && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{t.hora}</span>}
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${prioridadeStyle[t.prioridade]}`}>{t.prioridade}</Badge>
                          {t.status === "concluida" && <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${statusStyle[t.status]}`}><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />feita</Badge>}
                        </div>
                      </div>
                      <button onClick={() => apagarTarefa(t.id)} className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-display font-semibold">Próximas saídas</h3>
              </div>
              <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
                {proximas.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum embarque agendado.</p>
                )}
                {proximas.map((e) => {
                  const dt = new Date(e.data_saida);
                  return (
                    <div key={e.id} className="p-3 rounded-lg bg-card-elevated/60 border border-border/40 hover:border-primary/40 transition-all">
                      <div className="flex items-start justify-between mb-2 gap-2">
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
        </div>
      )}

      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Confirmar lista de passageiros" />
            </div>
            <div>
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} placeholder="Detalhes da tarefa..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={selectedDay} onChange={e => setSelectedDay(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Hora (opcional)</Label>
                <Input type="time" value={hora} onChange={e => setHora(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select value={prioridade} onValueChange={(v: any) => setPrioridade(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTaskDialog(false)}>Cancelar</Button>
            <Button onClick={salvarTarefa} disabled={saving} className="bg-gradient-gold text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
