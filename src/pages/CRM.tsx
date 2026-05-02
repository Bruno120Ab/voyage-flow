import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, Phone, MoreHorizontal, Loader2, CalendarClock, TrendingUp, Target, BarChart2, AlertCircle, LayoutDashboard, KanbanSquare, CheckCircle2, Bus, Plus, Trash2, ListChecks, Clock, Search, UserPlus, Repeat, Users, Inbox, Edit3, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, isToday, isBefore, startOfMonth, parseISO } from "date-fns";
import { toast } from "sonner";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Etapa = Database["public"]["Enums"]["lead_etapa"];
type EmbarqueDia = Database["public"]["Tables"]["embarques_dia"]["Row"];
type Tarefa = Database["public"]["Tables"]["tarefas"]["Row"];

const prioridadeStyle: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground border-border",
  normal: "bg-primary/15 text-primary border-primary/30",
  alta: "bg-warning/15 text-warning border-warning/30",
  urgente: "bg-destructive/15 text-destructive border-destructive/30",
};

const columns: { key: Etapa; title: string; color: string; hex: string }[] = [
  { key: "novo", title: "Novo lead", color: "border-t-accent text-accent", hex: "#3b82f6" },
  { key: "contato", title: "Contato realizado", color: "border-t-primary text-primary", hex: "#d97706" },
  { key: "negociacao", title: "Em negociação", color: "border-t-warning text-warning", hex: "#eab308" },
  { key: "aguardando", title: "Aguardando", color: "border-t-warning text-warning", hex: "#f59e0b" },
  { key: "fechado", title: "Fechado", color: "border-t-success text-success", hex: "#22c55e" },
  { key: "pos_venda", title: "Pós-venda", color: "border-t-muted-foreground text-muted-foreground", hex: "#64748b" },
];

// === KANBAN DE ATENDIMENTO ===
type KanbanStatus = "nao_atendido" | "em_atendimento" | "venda" | "revenda" | "aguardando" | "finalizado";

const kanbanCols: { key: KanbanStatus; title: string; hex: string; ring: string }[] = [
  { key: "nao_atendido", title: "Não atendido", hex: "#ef4444", ring: "border-t-destructive" },
  { key: "em_atendimento", title: "Em atendimento", hex: "#3b82f6", ring: "border-t-accent" },
  { key: "venda", title: "Venda", hex: "#22c55e", ring: "border-t-success" },
  { key: "revenda", title: "Revenda", hex: "#a855f7", ring: "border-t-primary" },
  { key: "aguardando", title: "Aguardando", hex: "#f59e0b", ring: "border-t-warning" },
  { key: "finalizado", title: "Finalizado", hex: "#64748b", ring: "border-t-muted-foreground" },
];

// Placeholder de integração com WhatsApp API (futuro)
export async function enviarMensagem(telefone: string, texto: string) {
  console.log("[enviarMensagem] integração futura WhatsApp API", { telefone, texto });
  return { ok: true };
}

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [embarques, setEmbarques] = useState<EmbarqueDia[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("cockpit");

  // Task dialog state
  const [taskDialog, setTaskDialog] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataTarefa, setDataTarefa] = useState(new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState("");
  const [prioridade, setPrioridade] = useState<"baixa" | "normal" | "alta" | "urgente">("normal");
  const [filtroTarefas, setFiltroTarefas] = useState<"hoje" | "todas" | "concluidas">("hoje");
  const [saving, setSaving] = useState(false);

  // === Kanban de atendimento ===
  const [busca, setBusca] = useState("");
  const [filtroDestino, setFiltroDestino] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Cliente dialog
  const [clienteDialog, setClienteDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [cNome, setCNome] = useState("");
  const [cTelefone, setCTelefone] = useState("");
  const [cWhats, setCWhats] = useState("");
  const [cCidade, setCCidade] = useState("");
  const [cDestino, setCDestino] = useState("");
  const [cObs, setCObs] = useState("");
  const [cUltimaMsg, setCUltimaMsg] = useState("");
  const [cKanban, setCKanban] = useState<KanbanStatus>("nao_atendido");

  // Embarque dialog
  const [embDialog, setEmbDialog] = useState(false);
  const [embLeadId, setEmbLeadId] = useState<string | null>(null);
  const [embCliente, setEmbCliente] = useState("");
  const [embDestino, setEmbDestino] = useState("");
  const [embData, setEmbData] = useState(new Date().toISOString().slice(0, 10));
  const [embHora, setEmbHora] = useState("");
  const [embLocal, setEmbLocal] = useState("");
  const [embStatus, setEmbStatus] = useState<"pendente" | "em_andamento" | "concluido">("pendente");
  const [embDias, setEmbDias] = useState<number>(7);

  // Histórico
  const [histDialog, setHistDialog] = useState(false);
  const [histLead, setHistLead] = useState<Lead | null>(null);
  const [histEmbarques, setHistEmbarques] = useState<EmbarqueDia[]>([]);

  useEffect(() => {
    const loadLeads = async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      setLeads((data ?? []) as Lead[]);
    };
    const loadEmbarques = async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("embarques_dia").select("*").eq("data_operacao", hoje);
      setEmbarques((data ?? []) as EmbarqueDia[]);
    };
    const loadTarefas = async () => {
      const { data } = await supabase.from("tarefas").select("*").order("data", { ascending: true });
      setTarefas((data ?? []) as Tarefa[]);
    };

    const init = async () => {
      await Promise.all([loadLeads(), loadEmbarques(), loadTarefas()]);
      setLoading(false);
    };
    init();

    const channel = supabase
      .channel("crm-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, loadLeads)
      .on("postgres_changes", { event: "*", schema: "public", table: "embarques_dia" }, loadEmbarques)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefas" }, loadTarefas)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const openWhats = (tel: string | null) => {
    if (!tel) return;
    const num = tel.replace(/\D/g, "");
    window.open(`https://wa.me/55${num}`, "_blank");
  };

  const openTaskDialog = () => {
    setTitulo(""); setDescricao(""); setHora(""); setPrioridade("normal");
    setDataTarefa(new Date().toISOString().slice(0, 10));
    setTaskDialog(true);
  };

  const salvarTarefa = async () => {
    if (!titulo.trim()) { toast.error("Informe o título da tarefa"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("tarefas").insert({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      data: dataTarefa,
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

  // === Cliente CRUD ===
  const resetCliente = () => {
    setEditingLead(null);
    setCNome(""); setCTelefone(""); setCWhats(""); setCCidade("");
    setCDestino(""); setCObs(""); setCUltimaMsg(""); setCKanban("nao_atendido");
  };

  const abrirNovoCliente = () => { resetCliente(); setClienteDialog(true); };

  const editarCliente = (l: Lead) => {
    setEditingLead(l);
    setCNome(l.nome); setCTelefone(l.telefone || ""); setCWhats(l.whatsapp || "");
    setCCidade(l.cidade || ""); setCDestino(l.destino || ""); setCObs(l.observacoes || "");
    setCUltimaMsg((l as any).ultima_mensagem || "");
    setCKanban(((l as any).kanban_status as KanbanStatus) || "nao_atendido");
    setClienteDialog(true);
  };

  const salvarCliente = async () => {
    if (!cNome.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      nome: cNome.trim(),
      telefone: cTelefone.trim() || null,
      whatsapp: cWhats.trim() || cTelefone.trim() || null,
      cidade: cCidade.trim() || null,
      destino: cDestino.trim() || null,
      observacoes: cObs.trim() || null,
      ultima_mensagem: cUltimaMsg.trim() || null,
      kanban_status: cKanban,
      ultima_interacao: new Date().toISOString(),
    };
    let error;
    if (editingLead) {
      ({ error } = await supabase.from("leads").update(payload).eq("id", editingLead.id));
    } else {
      payload.created_by = user?.id;
      ({ error } = await supabase.from("leads").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingLead ? "Cliente atualizado" : "Cliente cadastrado");
    setClienteDialog(false);
  };

  const moverKanban = async (leadId: string, novo: KanbanStatus) => {
    const { error } = await supabase.from("leads").update({
      kanban_status: novo,
      ultima_interacao: new Date().toISOString(),
      ...(novo === "finalizado" ? { pronto_revenda: false } : {}),
    } as any).eq("id", leadId);
    if (error) toast.error(error.message);
  };

  // === Embarque vinculado ao cliente ===
  const abrirEmbarque = (l: Lead) => {
    setEmbLeadId(l.id);
    setEmbCliente(l.nome);
    setEmbDestino(l.destino || "");
    setEmbData(new Date().toISOString().slice(0, 10));
    setEmbHora("");
    setEmbLocal(l.cidade || "");
    setEmbStatus("pendente");
    setEmbDias(7);
    setEmbDialog(true);
  };

  const salvarEmbarque = async () => {
    if (!embCliente.trim() || !embDestino.trim()) { toast.error("Cliente e destino obrigatórios"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("embarques_dia").insert({
      lead_id: embLeadId,
      cliente_nome: embCliente.trim(),
      cidade_origem: embLocal.trim() || null,
      cidade_destino: embDestino.trim(),
      local_embarque: embLocal.trim() || null,
      data_operacao: embData,
      data_ida: embData,
      hora_saida_prevista: embHora || null,
      dias_para_retorno: embDias,
      rota: `${embLocal || "—"} → ${embDestino}`,
      servico: `WEB-${Date.now().toString().slice(-5)}`,
      sentido: "ida",
      status: embStatus,
      created_by: user?.id,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Embarque cadastrado");
    setEmbDialog(false);
  };

  // === Histórico ===
  const abrirHistorico = async (l: Lead) => {
    setHistLead(l);
    const { data } = await supabase.from("embarques_dia").select("*").eq("lead_id", l.id).order("data_operacao", { ascending: false });
    setHistEmbarques((data ?? []) as EmbarqueDia[]);
    setHistDialog(true);
  };

    const hoje = new Date().toISOString().slice(0, 10);
    let list = tarefas;
    if (filtroTarefas === "hoje") list = tarefas.filter(t => t.data === hoje && t.status !== "concluida" && t.status !== "cancelada");
    else if (filtroTarefas === "concluidas") list = tarefas.filter(t => t.status === "concluida");
    return list.sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
  }, [tarefas, filtroTarefas]);

  const tarefasPendentesHoje = tarefas.filter(t => t.data === new Date().toISOString().slice(0,10) && t.status !== "concluida" && t.status !== "cancelada").length;

  const metrics = useMemo(() => {
    const ativos = leads.filter(l => l.etapa !== "fechado" && l.etapa !== "perdido" && l.etapa !== "pos_venda");
    const pipelineTotal = ativos.reduce((acc, l) => acc + Number(l.valor_estimado || 0), 0);
    
    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    
    const fechadosEsseMes = leads.filter(l => l.etapa === "fechado" && new Date(l.updated_at) >= startOfThisMonth);
    const receitaMensal = fechadosEsseMes.reduce((acc, l) => acc + Number(l.valor_estimado || 0), 0);
    
    const fechadosTotal = leads.filter(l => l.etapa === "fechado").length;
    const perdidosTotal = leads.filter(l => l.etapa === "perdido").length;
    const winRate = fechadosTotal + perdidosTotal > 0 
      ? Math.round((fechadosTotal / (fechadosTotal + perdidosTotal)) * 100) 
      : 0;

    const chartData = columns.map(c => {
      const stageLeads = leads.filter(l => l.etapa === c.key);
      const stageValue = stageLeads.reduce((acc, l) => acc + Number(l.valor_estimado || 0), 0);
      return {
        name: c.title,
        quantidade: stageLeads.length,
        valor: stageValue,
        hex: c.hex
      };
    });

    const topOps = ativos.sort((a, b) => Number(b.valor_estimado || 0) - Number(a.valor_estimado || 0)).slice(0, 5);

    const agenda = ativos.filter(l => {
      if (!l.follow_up_em) return false;
      const d = parseISO(l.follow_up_em);
      return isBefore(d, now) || isToday(d);
    }).sort((a, b) => new Date(a.follow_up_em!).getTime() - new Date(b.follow_up_em!).getTime());

    // --- Frotas Logic ---
    const agoraMin = now.getHours() * 60 + now.getMinutes();
    const parseTimeMin = (hora: string | null) => {
      if (!hora || typeof hora !== "string") return null;
      const horaFormatada = hora.slice(0, 5);
      if (!horaFormatada.includes(":")) return null;
      const [h, m] = horaFormatada.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    };

    let proxEmbarque: EmbarqueDia | null = null;
    let minDiffPos = Infinity;
    let atrasados = 0;

    for (const e of embarques) {
      if (e.passou) continue;
      const t = parseTimeMin(e.hora_saida_prevista || e.previsao_chegada);
      if (t === null) continue;
      const diff = t - agoraMin;
      if (diff < 0) {
        atrasados++;
      } else {
        if (diff < minDiffPos) {
          minDiffPos = diff;
          proxEmbarque = e;
        }
      }
    }

    return { pipelineTotal, receitaMensal, winRate, chartData, topOps, agenda, proxEmbarque, atrasados };
  }, [leads, embarques]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">CRM</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Inteligência de Vendas</h1>
          <p className="text-muted-foreground mt-1">Visão completa de performance, funil e contatos do dia.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="bg-card-elevated/50">
          <TabsTrigger value="cockpit"><LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> Cockpit Insights</TabsTrigger>
          <TabsTrigger value="funil"><KanbanSquare className="h-3.5 w-3.5 mr-1.5" /> Funil (Kanban)</TabsTrigger>
          <TabsTrigger value="agenda" className="relative">
            <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Agenda do Dia
            {(metrics.agenda.length > 0 || tarefasPendentesHoje > 0) && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive shadow-glow"></span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cockpit" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card p-5 border-t-4 border-t-primary">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Pipeline Total Ativo</p>
                  <p className="font-display text-2xl sm:text-3xl font-bold">R$ {metrics.pipelineTotal.toLocaleString("pt-BR")}</p>
                </div>
                <div className="bg-primary/10 p-2 rounded-lg text-primary"><BarChart2 className="h-5 w-5" /></div>
              </div>
            </Card>
            <Card className="glass-card p-5 border-t-4 border-t-success">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Receita Fechada (Mês)</p>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-success">R$ {metrics.receitaMensal.toLocaleString("pt-BR")}</p>
                </div>
                <div className="bg-success/10 p-2 rounded-lg text-success"><TrendingUp className="h-5 w-5" /></div>
              </div>
            </Card>
            <Card className="glass-card p-5 border-t-4 border-t-warning">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Win Rate (Efetividade)</p>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-warning">{metrics.winRate}%</p>
                </div>
                <div className="bg-warning/10 p-2 rounded-lg text-warning"><Target className="h-5 w-5" /></div>
              </div>
            </Card>
            <Card className={`glass-card p-5 border-t-4 ${metrics.atrasados > 0 ? "border-t-destructive shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-t-primary"}`}>
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="text-xs uppercase font-semibold text-muted-foreground mb-1 flex items-center gap-1.5"><Bus className="h-3.5 w-3.5" /> Frotas (Hoje)</p>
                  {metrics.atrasados > 0 ? (
                    <p className="font-display text-2xl font-bold text-destructive truncate">{metrics.atrasados} Atrasado{metrics.atrasados > 1 ? 's' : ''}</p>
                  ) : metrics.proxEmbarque ? (
                    <p className="font-display text-2xl font-bold text-foreground truncate">Próx: {metrics.proxEmbarque.hora_saida_prevista || metrics.proxEmbarque.previsao_chegada}</p>
                  ) : (
                    <p className="font-display text-2xl font-bold text-muted-foreground truncate">Livre</p>
                  )}
                  {metrics.proxEmbarque && metrics.atrasados === 0 && (
                    <p className="text-[11px] text-muted-foreground font-medium mt-1 truncate max-w-[120px]">Serviço #{metrics.proxEmbarque.servico}</p>
                  )}
                  {metrics.atrasados > 0 && metrics.proxEmbarque && (
                    <p className="text-[11px] text-muted-foreground font-medium mt-1 truncate max-w-[120px]">Próximo às {metrics.proxEmbarque.hora_saida_prevista}</p>
                  )}
                  {!metrics.proxEmbarque && metrics.atrasados === 0 && (
                    <p className="text-[11px] text-muted-foreground font-medium mt-1">Nenhum pendente</p>
                  )}
                </div>
                <div className={`p-2 rounded-lg shrink-0 ${metrics.atrasados > 0 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-primary/10 text-primary"}`}><AlertCircle className="h-5 w-5" /></div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-card lg:col-span-2 flex flex-col">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2"><BarChart2 className="h-5 w-5 text-primary" /> Distribuição do Funil</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
                    <Tooltip 
                      cursor={{fill: '#ffffff0a'}}
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, 'Valor Estimado']}
                    />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {metrics.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.hex} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-card flex flex-col">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-warning" /> Top 5 Oportunidades</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3 pr-2">
                {metrics.topOps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma oportunidade ativa com valor.</p>
                ) : metrics.topOps.map((op, i) => (
                  <div key={op.id} className="p-3 rounded-lg border border-border/50 bg-card-elevated/30 flex justify-between items-center hover:border-primary/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{op.nome}</p>
                      <p className="text-xs text-muted-foreground capitalize">{op.etapa.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-sm text-gradient-gold">R$ {Number(op.valor_estimado).toLocaleString("pt-BR")}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openWhats(op.whatsapp || op.telefone)}><MessageCircle className="h-3 w-3 text-success" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funil">
          <div className="overflow-x-auto pb-4 scrollbar-thin">
            <div className="flex gap-4 min-w-max">
              {columns.map((col) => {
                const cards = leads.filter(l => l.etapa === col.key);
                const total = cards.reduce((s, c) => s + Number(c.valor_estimado || 0), 0);
                return (
                  <div key={col.key} className={`w-[320px] shrink-0 rounded-xl bg-card-elevated/20 border border-border/40 border-t-2 ${col.color.split(' ')[0]} p-3 flex flex-col max-h-[75vh]`}>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div>
                        <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full`} style={{backgroundColor: col.hex}}></span>
                          {col.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">R$ {total.toLocaleString("pt-BR")}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-background/50 border-border">{cards.length}</Badge>
                    </div>
                    <div className="space-y-3 overflow-y-auto pr-1 flex-1 scrollbar-thin pb-2">
                      {cards.length === 0 && (
                        <p className="text-xs text-muted-foreground/60 text-center py-6 border border-dashed border-border/50 rounded-lg">Sem leads na etapa</p>
                      )}
                      {cards.map((c) => {
                        const isLate = c.follow_up_em && (isBefore(parseISO(c.follow_up_em), new Date()) || isToday(parseISO(c.follow_up_em)));
                        const isPending = col.key !== 'fechado' && col.key !== 'perdido' && col.key !== 'pos_venda';
                        
                        return (
                          <Card key={c.id} className={`glass-card p-3 hover:border-primary/40 transition-all cursor-pointer group ${isLate && isPending ? 'border-destructive/40 shadow-[0_0_8px_rgba(239,68,68,0.1)]' : ''}`}>
                            <div className="flex items-start justify-between mb-1.5">
                              <p className="font-semibold text-sm leading-tight text-foreground/90">{c.nome}</p>
                              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </div>
                            
                            {c.destino && <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Target className="h-3 w-3" /> {c.destino}</p>}
                            
                            {isPending && c.follow_up_em && (
                              <div className={`text-[10px] flex items-center gap-1 mb-2 font-medium px-1.5 py-0.5 rounded-md w-fit ${isLate ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                                <CalendarClock className="h-3 w-3" /> 
                                {isLate ? 'Contatar hoje / atrasado' : format(parseISO(c.follow_up_em), "dd MMM")}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                              <span className="font-display font-bold text-sm text-gradient-gold">R$ {Number(c.valor_estimado || 0).toLocaleString("pt-BR")}</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-success hover:bg-success/10" onClick={(e) => { e.stopPropagation(); openWhats(c.whatsapp || c.telefone); }}><MessageCircle className="h-3.5 w-3.5" /></Button>
                                {c.telefone && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); window.open(`tel:${c.telefone}`); }}><Phone className="h-3.5 w-3.5" /></Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="agenda" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TAREFAS DO DIA */}
            <Card className="glass-card border-t-4 border-t-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" /> Minhas Tarefas
                </CardTitle>
                <Button size="sm" onClick={openTaskDialog} className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                  <Plus className="h-4 w-4 mr-1.5" /> Nova
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-1">
                  {(["hoje", "todas", "concluidas"] as const).map(f => (
                    <button key={f} onClick={() => setFiltroTarefas(f)} className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded border transition ${filtroTarefas === f ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-border"}`}>
                      {f === "hoje" ? "Hoje" : f === "todas" ? "Todas" : "Feitas"}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
                  {tarefasFiltradas.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 text-success/50 mb-2" />
                      <p className="text-sm">Nenhuma tarefa por aqui.</p>
                    </div>
                  )}
                  {tarefasFiltradas.map((t) => (
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
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CalendarClock className="h-2.5 w-2.5" />
                              {format(parseISO(t.data + "T00:00:00"), "dd/MM")}
                            </span>
                            {t.hora && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{t.hora}</span>}
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${prioridadeStyle[t.prioridade]}`}>{t.prioridade}</Badge>
                            {t.status === "concluida" && t.concluida_em && (
                              <span className="text-[10px] text-success">✓ {format(parseISO(t.concluida_em), "dd/MM HH:mm")}</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => apagarTarefa(t.id)} className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* FOLLOW-UPS CRÍTICOS */}
            <Card className="glass-card border-t-4 border-t-destructive">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" /> Follow-ups Críticos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.agenda.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 text-success/50 mb-3" />
                    <p className="font-medium text-lg text-foreground">Tudo em dia!</p>
                    <p className="text-sm">Nenhum follow-up pendente.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
                    {metrics.agenda.map((op) => (
                      <div key={op.id} className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-destructive/20 p-2 rounded-lg mt-0.5"><CalendarClock className="h-5 w-5 text-destructive" /></div>
                          <div>
                            <p className="font-semibold text-base">{op.nome}</p>
                            <div className="flex gap-2 items-center text-xs text-muted-foreground mt-1 flex-wrap">
                              <span className="capitalize px-1.5 py-0.5 bg-background/50 rounded border border-border/50">{op.etapa.replace('_', ' ')}</span>
                              {op.destino && <span>• {op.destino}</span>}
                              <span className="font-semibold text-destructive">• {format(parseISO(op.follow_up_em!), "dd/MM 'às' HH:mm")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:ml-auto">
                          <div className="text-right mr-3 hidden sm:block">
                            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Valor</p>
                            <p className="font-bold text-sm">R$ {Number(op.valor_estimado).toLocaleString("pt-BR")}</p>
                          </div>
                          <Button variant="outline" className="border-border hover:bg-success/10 hover:text-success hover:border-success/30" onClick={() => openWhats(op.whatsapp || op.telefone)}>
                            <MessageCircle className="h-4 w-4 mr-2" /> Falar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* Dialog Nova Tarefa */}
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
                <Input type="date" value={dataTarefa} onChange={e => setDataTarefa(e.target.value)} />
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
