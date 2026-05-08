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
import { sendText, getAllNewMessages, getMessagesChat } from "@/utils/sendZapApi";

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

  // Embarque dialog (mesmos campos da aba Embarques)
  type EStatus = "rascunho" | "confirmado" | "pendente" | "em_rota" | "finalizado" | "cancelado";
  const [embDialog, setEmbDialog] = useState(false);
  const [embLeadId, setEmbLeadId] = useState<string | null>(null);
  const [veiculos, setVeiculos] = useState<{ id: string; placa: string; modelo: string }[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [embForm, setEmbForm] = useState({
    origem: "", destino: "", local_embarque: "",
    data_saida: "", data_retorno: "",
    valor_operacao: "0", custo_operacao: "0",
    veiculo_id: "none", servico_id: "none",
    status: "rascunho" as EStatus, observacoes: "",
    rota: "nenhuma" as "descida" | "subida" | "nenhuma",
  });

  // Histórico
  const [histDialog, setHistDialog] = useState(false);
  const [histLead, setHistLead] = useState<Lead | null>(null);
  const [histEmbarques, setHistEmbarques] = useState<EmbarqueDia[]>([]);

  // Zap Automático
  const [zapDialog, setZapDialog] = useState(false);
  const [zapLead, setZapLead] = useState<Lead | null>(null);
  const [zapText, setZapText] = useState("");

  // Inbox Zap
  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [replyText, setReplyText] = useState("");

  // Virtual Msg Dialog
  const [virtualMsgDialog, setVirtualMsgDialog] = useState(false);
  const [selectedVirtualMsg, setSelectedVirtualMsg] = useState<any>(null);
  const [virtualMsgLoading, setVirtualMsgLoading] = useState(false);
  const [replyVirtualMsgText, setReplyVirtualMsgText] = useState("");

  const abrirDetalhesVirtualMsg = async (baseMsg: any, name: string, cleanPhone: string, time: string, fallbackText: string) => {
    const targetPhone = baseMsg.id?._serialized || baseMsg.phone || cleanPhone;
    setSelectedVirtualMsg({ name, cleanPhone, targetPhone, time, rawMessages: [{ text: fallbackText, time, isMe: false }] });
    setReplyVirtualMsgText("");
    setVirtualMsgDialog(true);
    setVirtualMsgLoading(true);

    try {
      const unread = baseMsg.unreadCount || 1;
      const history = await getMessagesChat(targetPhone, unread);
      
      let arr: any[] = [];
      if (Array.isArray(history)) arr = history;
      else if (history?.messages && Array.isArray(history.messages)) arr = history.messages;
      else if (history?.response && Array.isArray(history.response)) arr = history.response;
      else if (history?.response?.messages && Array.isArray(history.response.messages)) arr = history.response.messages;
      else if (history?.response?.data && Array.isArray(history.response.data)) arr = history.response.data;
      else if (history?.data && Array.isArray(history.data)) arr = history.data;
      else if (history?.message && Array.isArray(history.message)) arr = history.message;
      
      console.log("Historico retornado:", history, "Array extraido:", arr);

      // Pega a quantidade de mensagens baseada no unreadCount e estrutura como objetos
      const msgsParaPlotar = arr.slice(-unread).map((m: any) => ({
        text: m.text?.message || m.body || m.text || "Mídia/Áudio recebido",
        time: m.timestamp ? new Date(m.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : time,
        isMe: m.fromMe || m.sender === "me"
      }));
      
      if (msgsParaPlotar.length > 0) {
        setSelectedVirtualMsg((prev: any) => prev ? { ...prev, rawMessages: msgsParaPlotar } : null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVirtualMsgLoading(false);
    }
  };

  const responderPeloModal = async () => {
    if (!selectedVirtualMsg || !replyVirtualMsgText.trim()) return;
    setSaving(true);
    
    try {
      const { cleanPhone, name, targetPhone } = selectedVirtualMsg;
      let numToSend = targetPhone || cleanPhone;
      if (!numToSend.includes("@")) {
        numToSend = numToSend.replace(/\D/g, "");
        if (!numToSend.startsWith("55") && numToSend.length <= 11) numToSend = "55" + numToSend;
      }
      
      // Envia via API Brasil
      await sendText({ number: numToSend, text: replyVirtualMsgText });
      
      // Cria ou atualiza lead
      const existing = leads.find(l => (l.whatsapp === cleanPhone || l.telefone === cleanPhone));
      if (existing) {
        await supabase.from("leads").update({ 
          kanban_status: "em_atendimento",
          ultima_interacao: new Date().toISOString(),
          ultima_mensagem: replyVirtualMsgText
        }).eq("id", existing.id);
      } else {
        await supabase.from("leads").insert({
          nome: name,
          telefone: cleanPhone,
          whatsapp: cleanPhone,
          kanban_status: "em_atendimento",
          ultima_interacao: new Date().toISOString(),
          ultima_mensagem: replyVirtualMsgText
        });
      }
      
      toast.success("Respondido! Lead movido para Em Atendimento.");
      
      // Atualiza estado local
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (data) setLeads(data as any[]);
      
      setInboxMessages(prev => prev.filter((m: any) => {
         const p = m.phone || m.from || m.id?.split('@')[0] || "";
         const cp = p.includes('@') ? p.split('@')[0] : p;
         return cp !== cleanPhone;
      }));
      
      setVirtualMsgDialog(false);
      setReplyVirtualMsgText("");
    } catch (err) {
      toast.error("Erro ao enviar a resposta");
    } finally {
      setSaving(false);
    }
  };

  const loadInbox = async () => {
    setInboxLoading(true);
    try {
      const msgs = await getAllNewMessages();
      console.log(JSON.stringify(`A Mensagem é essa` + msgs));
      let arr = [];
      if (msgs && Array.isArray(msgs.contacts)) arr = msgs.contacts; // Padrão da APIBrasil (retorna 'contacts')
      else if (msgs && msgs.response && Array.isArray(msgs.response.contacts)) arr = msgs.response.contacts;
      else if (Array.isArray(msgs)) arr = msgs;
      else if (msgs && Array.isArray(msgs.messages)) arr = msgs.messages;
      else if (msgs && Array.isArray(msgs.response)) arr = msgs.response;
      else if (msgs && Array.isArray(msgs.data)) arr = msgs.data;
      
      // Filtrar apenas conversas com isNewMsg === true ou não lidas (viewed === false)
      const unread = arr.filter((c: any) => c.isNewMsg || c.unreadCount > 0 || c.viewed === false);
      setInboxMessages(unread.length > 0 ? unread : arr);
    } catch (e) {
      toast.error("Erro ao carregar caixa de entrada");
    } finally {
      setInboxLoading(false);
    }
  };

  const loadChat = async (phone: string) => {
    setSelectedChat(phone);
    setChatLoading(true);
    try {
      const history = await getMessagesChat(phone);
      let arr = [];
      if (Array.isArray(history)) arr = history;
      else if (history && Array.isArray(history.messages)) arr = history.messages;
      else if (history && Array.isArray(history.response)) arr = history.response;
      else if (history && Array.isArray(history.data)) arr = history.data;
      else if (history && history.message && Array.isArray(history.message)) arr = history.message;

      setChatHistory(arr);
    } catch (e) {
      toast.error("Erro ao carregar histórico");
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
    const id = setInterval(loadInbox, 25000);
    return () => clearInterval(id);
  }, []);

  const enviarRespostaInbox = async () => {
    if (!selectedChat || !replyText.trim()) return;
    setSaving(true);
    try {
      let numToSend = selectedChat;
      if (!numToSend.includes("@")) {
        numToSend = numToSend.replace(/\D/g, "");
        if (!numToSend.startsWith("55") && numToSend.length <= 11) numToSend = "55" + numToSend;
      }
      
      await sendText({ number: numToSend, text: replyText });
      toast.success("Mensagem enviada!");
      setReplyText("");
      await loadChat(selectedChat);
    } catch (e) {
      toast.error("Erro ao enviar resposta");
    } finally {
      setSaving(false);
    }
  };

  const abrirZap = (l: Lead) => {
    setZapLead(l);
    setZapText(`Olá ${l.nome.split(" ")[0]}, `);
    setZapDialog(true);
  };

  const enviarZap = async () => {
    if (!zapLead || !zapText.trim()) return;
    const phone = zapLead.whatsapp || zapLead.telefone;
    if (!phone) { toast.error("Cliente não possui telefone"); return; }
    
    setSaving(true);
    try {
      await sendText({ number: "55" + phone.replace(/\D/g, ""), text: zapText });
      toast.success("Mensagem enviada com sucesso!");
      setZapDialog(false);
    } catch (e) {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSaving(false);
    }
  };

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

    const loadVeiculos = async () => {
      const { data } = await supabase.from("veiculos").select("id, placa, modelo").order("placa");
      setVeiculos((data ?? []) as any);
    };
    const loadServicos = async () => {
      const { data } = await supabase.from("embarques_dia").select("id, servico, rota, carro, data_operacao").order("data_operacao", { ascending: false });
      setServicos(data ?? []);
    };

    const init = async () => {
      await Promise.all([loadLeads(), loadEmbarques(), loadTarefas(), loadVeiculos(), loadServicos()]);
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
    // Atualização otimista local para reatividade 100% instantânea
    setLeads(prev => prev.map(l => l.id === leadId ? { 
      ...l, 
      kanban_status: novo, 
      ultima_interacao: new Date().toISOString(), 
      ...(novo === "finalizado" ? { pronto_revenda: false } : {}) 
    } as any : l));

    const { error } = await supabase.from("leads").update({
      kanban_status: novo,
      ultima_interacao: new Date().toISOString(),
      ...(novo === "finalizado" ? { pronto_revenda: false } : {}),
    } as any).eq("id", leadId);
    if (error) toast.error(error.message);
  };

  const moverFunil = async (leadId: string, novaEtapa: Etapa) => {
    // Atualização otimista local para reatividade 100% instantânea
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, etapa: novaEtapa } : l));

    const { error } = await supabase.from("leads").update({
      etapa: novaEtapa,
      updated_at: new Date().toISOString()
    } as any).eq("id", leadId);
    if (error) toast.error(error.message);
  };

  // === Embarque vinculado ao cliente (mesmos campos da aba Embarques) ===
  const abrirEmbarque = (l: Lead) => {
    setEmbLeadId(l.id);
    setEmbForm({
      origem: l.cidade || "",
      destino: l.destino || "",
      local_embarque: "",
      data_saida: "",
      data_retorno: "",
      valor_operacao: String(l.valor_estimado || 0),
      custo_operacao: "0",
      veiculo_id: "none",
      servico_id: "none",
      status: "rascunho",
      observacoes: `Cliente: ${l.nome}${l.telefone ? ` — ${l.telefone}` : ""}`,
      rota: "nenhuma",
    });
    setEmbDialog(true);
  };

  const salvarEmbarque = async () => {
    if (!embForm.origem.trim() || !embForm.destino.trim()) { toast.error("Origem e destino obrigatórios"); return; }
    if (!embForm.data_saida) { toast.error("Informe a data de saída"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    let resolvedVeiculoId = embForm.veiculo_id !== "none" ? embForm.veiculo_id : null;
    if (embForm.servico_id !== "none") {
      const s = servicos.find(x => x.id === embForm.servico_id);
      if (s?.carro) {
        const v = veiculos.find(v => v.placa === s.carro);
        if (v) resolvedVeiculoId = v.id;
      }
    }

    const obsJson = JSON.stringify({
      isJsonMeta: true,
      observacoes: embForm.observacoes,
      rota: embForm.rota,
      servico_id: embForm.servico_id !== "none" ? embForm.servico_id : undefined,
      lead_id: embLeadId || undefined,
    });

    const { error } = await supabase.from("embarques").insert({
      origem: embForm.origem.trim(),
      destino: embForm.destino.trim(),
      local_embarque: embForm.local_embarque.trim() || null,
      data_saida: new Date(embForm.data_saida).toISOString(),
      data_retorno: embForm.data_retorno ? new Date(embForm.data_retorno).toISOString() : null,
      valor_operacao: Number(embForm.valor_operacao) || 0,
      custo_operacao: Number(embForm.custo_operacao) || 0,
      veiculo_id: resolvedVeiculoId,
      status: embForm.status,
      observacoes: obsJson,
      created_by: user?.id,
    } as any);

    setSaving(false);
    if (error) { toast.error(error.message); return; }

    if (embLeadId) {
      await supabase.from("leads").update({
        ultima_interacao: new Date().toISOString(),
        ultima_mensagem: `Embarque ${embForm.origem} → ${embForm.destino} em ${embForm.data_saida.slice(0,10)}`,
        kanban_status: "venda",
      } as any).eq("id", embLeadId);
    }

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

  const tarefasFiltradas = useMemo(() => {
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

  // === Filtros e dados do Kanban de atendimento ===
  const leadsFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return leads.filter(l => {
      if (q) {
        const hay = `${l.nome} ${l.telefone || ""} ${l.whatsapp || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filtroDestino && !(l.destino || "").toLowerCase().includes(filtroDestino.toLowerCase())) return false;
      return true;
    });
  }, [leads, busca, filtroDestino]);

  const destinosDisponiveis = useMemo(() => {
    return Array.from(new Set(leads.map(l => l.destino).filter(Boolean) as string[])).sort();
  }, [leads]);

  // Listas inteligentes
  const listas = useMemo(() => {
    const now = Date.now();
    const dia = 24 * 3600 * 1000;
    const naoAtendidos = leads.filter(l => (l as any).kanban_status === "nao_atendido");
    const semResposta = leads.filter(l => {
      const ult = (l as any).ultima_interacao;
      if (!ult) return false;
      const status = (l as any).kanban_status;
      return ["em_atendimento","aguardando"].includes(status) && (now - new Date(ult).getTime()) > 3 * dia;
    });
    const recentes = leads.filter(l => (now - new Date(l.created_at).getTime()) < 7 * dia);
    const prontosRevenda = leads.filter(l => (l as any).pronto_revenda || (l as any).kanban_status === "revenda");
    return { naoAtendidos, semResposta, recentes, prontosRevenda };
  }, [leads]);

  // Auto: marcar leads como prontos para revenda quando embarque foi concluído + dias passaram
  useEffect(() => {
    if (!leads.length) return;
    const now = Date.now();
    const dia = 24 * 3600 * 1000;
    const ja = new Set(leads.filter(l => (l as any).pronto_revenda).map(l => l.id));
    const candidatos: string[] = [];
    embarques.forEach(e => {
      const lid = (e as any).lead_id as string | null;
      if (!lid || ja.has(lid)) return;
      const ref = (e as any).data_ida || e.data_operacao;
      if (!ref) return;
      const dias = (e as any).dias_para_retorno ?? 7;
      const decorrido = (now - new Date(ref).getTime()) / dia;
      if (decorrido >= dias) candidatos.push(lid);
    });
    if (candidatos.length) {
      supabase.from("leads").update({ pronto_revenda: true, kanban_status: "revenda" } as any).in("id", candidatos).then(() => {});
    }
  }, [embarques, leads]);

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
        <TabsList className="bg-card-elevated/50 flex-wrap h-auto">
          <TabsTrigger value="cockpit"><LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> Cockpit</TabsTrigger>
          <TabsTrigger value="atendimento" className="relative">
            <Inbox className="h-3.5 w-3.5 mr-1.5" /> Atendimento
            {listas.naoAtendidos.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-destructive/20 text-destructive px-1.5 rounded-full">{listas.naoAtendidos.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="funil"><KanbanSquare className="h-3.5 w-3.5 mr-1.5" /> Funil</TabsTrigger>
          <TabsTrigger value="agenda" className="relative">
            <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Agenda
            {(metrics.agenda.length > 0 || tarefasPendentesHoje > 0) && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive shadow-glow"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inbox"><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Inbox Zap</TabsTrigger>
        </TabsList>

        <TabsContent value="atendimento" className="space-y-5">
          {/* Mini-dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="glass-card p-4 border-t-4 border-t-destructive">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Aguardando atendimento</p>
              <p className="font-display text-2xl font-bold text-destructive mt-1">{listas.naoAtendidos.length}</p>
            </Card>
            <Card className="glass-card p-4 border-t-4 border-t-accent">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Em negociação</p>
              <p className="font-display text-2xl font-bold text-accent mt-1">{leads.filter(l => (l as any).kanban_status === "em_atendimento").length}</p>
            </Card>
            <Card className="glass-card p-4 border-t-4 border-t-primary">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Prontos p/ revenda</p>
              <p className="font-display text-2xl font-bold text-primary mt-1">{listas.prontosRevenda.length}</p>
            </Card>
            <Card className="glass-card p-4 border-t-4 border-t-warning">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Embarques hoje</p>
              <p className="font-display text-2xl font-bold text-warning mt-1">{embarques.length}</p>
            </Card>
            <Card className="glass-card p-4 border-t-4 border-t-success">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Sem resposta 3+ dias</p>
              <p className="font-display text-2xl font-bold text-success mt-1">{listas.semResposta.length}</p>
            </Card>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome ou telefone..." className="pl-9" />
            </div>
            <Select value={filtroDestino || "all"} onValueChange={v => setFiltroDestino(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Destino" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos destinos</SelectItem>
                {destinosDisponiveis.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={abrirNovoCliente} className="bg-gradient-gold text-primary-foreground">
              <UserPlus className="h-4 w-4 mr-1.5" /> Novo cliente
            </Button>
          </div>

          {/* Listas inteligentes */}
          {(listas.prontosRevenda.length > 0 || listas.semResposta.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {listas.prontosRevenda.length > 0 && (
                <Card className="glass-card p-3 border-l-4 border-l-primary">
                  <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><Repeat className="h-3.5 w-3.5 text-primary" /> Oportunidades de revenda ({listas.prontosRevenda.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {listas.prontosRevenda.slice(0, 6).map(l => (
                      <button key={l.id} onClick={() => editarCliente(l)} className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20">{l.nome}</button>
                    ))}
                  </div>
                </Card>
              )}
              {listas.semResposta.length > 0 && (
                <Card className="glass-card p-3 border-l-4 border-l-warning">
                  <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"><AlertCircle className="h-3.5 w-3.5 text-warning" /> Sem resposta há 3+ dias ({listas.semResposta.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {listas.semResposta.slice(0, 6).map(l => (
                      <button key={l.id} onClick={() => openWhats(l.whatsapp || l.telefone)} className="text-[11px] px-2 py-1 rounded-full bg-warning/10 text-warning hover:bg-warning/20">{l.nome}</button>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Kanban de atendimento */}
          <div className="overflow-x-auto pb-4 scrollbar-thin">
            <div className="flex gap-3 min-w-max">
              {kanbanCols.map(col => {
                const cards = leadsFiltrados.filter(l => ((l as any).kanban_status || "nao_atendido") === col.key);
                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (draggingId) { moverKanban(draggingId, col.key); setDraggingId(null); } }}
                    className={`w-[280px] shrink-0 rounded-xl bg-card-elevated/20 border border-border/40 border-t-2 ${col.ring} p-3 flex flex-col max-h-[70vh]`}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.hex }}></span>
                        {col.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs bg-background/50">{cards.length}</Badge>
                    </div>
                    <div className="space-y-2 overflow-y-auto pr-1 flex-1 scrollbar-thin">
                      {cards.length === 0 && (
                        <p className="text-[11px] text-muted-foreground/60 text-center py-6 border border-dashed border-border/50 rounded-lg">Vazio</p>
                      )}
                      {cards.map(c => {
                        const ult = (c as any).ultima_interacao;
                        const ultMsg = (c as any).ultima_mensagem;
                        return (
                          <Card
                            key={c.id}
                            draggable
                            onDragStart={() => setDraggingId(c.id)}
                            onDragEnd={() => setDraggingId(null)}
                            className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all group"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-semibold text-sm leading-tight truncate">{c.nome}</p>
                              <button onClick={() => editarCliente(c)} className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-primary">
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {(c.whatsapp || c.telefone) && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><Phone className="h-2.5 w-2.5" /> {c.whatsapp || c.telefone}</p>
                            )}
                            {c.destino && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><MapPin className="h-2.5 w-2.5" /> {c.destino}</p>
                            )}
                            {ultMsg && (
                              <p className="text-[11px] italic text-foreground/70 mt-1 line-clamp-2">"{ultMsg}"</p>
                            )}
                            {ult && (
                              <p className="text-[10px] text-muted-foreground mt-1">{format(parseISO(ult), "dd/MM HH:mm")}</p>
                            )}
                            <div className="flex gap-1 mt-2 pt-2 border-t border-border/40">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:bg-success/10" onClick={() => openWhats(c.whatsapp || c.telefone)} title="WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10" onClick={() => abrirZap(c)} title="Disparar Mensagem API"><Inbox className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => abrirEmbarque(c)} title="Novo embarque"><Bus className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-accent/10" onClick={() => abrirHistorico(c)} title="Histórico"><Users className="h-3.5 w-3.5" /></Button>
                              <Select value={(c as any).kanban_status || "nao_atendido"} onValueChange={(v) => moverKanban(c.id, v as KanbanStatus)}>
                                <SelectTrigger className="h-7 ml-auto text-[10px] w-auto px-2 border-border/50"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {kanbanCols.map(k => <SelectItem key={k.key} value={k.key} className="text-xs">{k.title}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </Card>
                        );
                      })}
                      {/* Virtual Cards from Inbox */}
                      {col.key === "nao_atendido" && Array.isArray(inboxMessages) && inboxMessages.map((msg: any, i) => {
                        const phone = msg.phone || msg.from || msg.id?.split('@')[0] || "Sem número";
                        const cleanPhone = phone.includes('@') ? phone.split('@')[0] : phone;
                        const name = msg.pushname || msg.pushName || msg.name || cleanPhone || "Novo Contato";
                        const text = msg.body || msg.content || msg.text?.message || msg.text || "Nova mensagem recebida...";
                        const time = msg.t ? new Date(msg.t * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";
                        {console.log(msg)}
                        
                        return (
                          <Card
                            key={`virtual_msg_${i}`}
                            className="glass-card p-3 border-l-4 border-l-destructive bg-destructive/5 hover:border-destructive/40 transition-all group cursor-pointer"
                            onClick={() => abrirDetalhesVirtualMsg(msg, name, cleanPhone, time, text)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex flex-col min-w-0">
                                <p className="font-semibold text-sm leading-tight truncate">{name} <span className="text-[10px] text-destructive">(ZAP)</span></p>
                                {time && <span className="text-[10px] text-muted-foreground">{time}</span>}
                              </div>
                              <button onClick={(e) => {
                                e.stopPropagation();
                                setCNome(name === cleanPhone ? "" : name);
                                setCTelefone(cleanPhone);
                                setCWhats(cleanPhone);
                                setClienteDialog(true);
                              }} title="Salvar como Lead" className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-primary shrink-0">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><Phone className="h-2.5 w-2.5" /> {cleanPhone}</p>
                            <p className="text-[11px] italic text-foreground/70 mt-1 line-clamp-2">"{text}"</p>
                            <div className="flex gap-1 mt-2 pt-2 border-t border-border/40 items-center">
                              <Input 
                                placeholder="Responder rápida..." 
                                className="h-7 text-[11px] px-2 flex-1"
                                id={`reply_input_${cleanPhone}`}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value;
                                    if(!val.trim()) return;
                                    
                                    try {
                                      toast.info("Enviando...");
                                      let numToSend = phone;
                                      if (!numToSend.includes("@")) {
                                        numToSend = numToSend.replace(/\D/g, "");
                                        if (!numToSend.startsWith("55") && numToSend.length <= 11) {
                                          numToSend = "55" + numToSend;
                                        }
                                      }
                                      await sendText({ number: numToSend, text: val });
                                      
                                      const existing = leads.find(l => (l.whatsapp === cleanPhone || l.telefone === cleanPhone));
                                      if (existing) {
                                        await supabase.from("leads").update({ 
                                          kanban_status: "em_atendimento",
                                          ultima_interacao: new Date().toISOString(),
                                          ultima_mensagem: val
                                        }).eq("id", existing.id);
                                      } else {
                                        await supabase.from("leads").insert({
                                          nome: name,
                                          telefone: cleanPhone,
                                          whatsapp: cleanPhone,
                                          kanban_status: "em_atendimento",
                                          ultima_interacao: new Date().toISOString(),
                                          ultima_mensagem: val
                                        });
                                      }
                                      
                                      toast.success("Enviado! Movido para Em Atendimento.");
                                      (e.target as HTMLInputElement).value = "";
                                      
                                      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
                                      if (data) setLeads(data as any[]);
                                      
                                      setInboxMessages(prev => prev.filter((m: any) => {
                                         const p = m.phone || m.from || m.id?.split('@')[0] || "";
                                         const cp = p.includes('@') ? p.split('@')[0] : p;
                                         return cp !== cleanPhone;
                                      }));
                                    } catch(err) {
                                      toast.error("Erro ao enviar");
                                    }
                                  }
                                }}
                              />
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary bg-primary/10 hover:bg-primary/20 shrink-0" title="Abrir Chat Completo" onClick={(e) => {
                                e.stopPropagation();
                                setTab("inbox");
                                loadChat(cleanPhone);
                              }}>
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
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
                  <div 
                    key={col.key} 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (draggingId) { moverFunil(draggingId, col.key); setDraggingId(null); } }}
                    className={`w-[320px] shrink-0 rounded-xl bg-card-elevated/20 border border-border/40 border-t-2 ${col.color.split(' ')[0]} p-3 flex flex-col max-h-[75vh]`}
                  >
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
                          <Card 
                            key={c.id} 
                            draggable
                            onDragStart={() => setDraggingId(c.id)}
                            onDragEnd={() => setDraggingId(null)}
                            className={`glass-card p-3 hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing group ${isLate && isPending ? 'border-destructive/40 shadow-[0_0_8px_rgba(239,68,68,0.1)]' : ''}`}
                          >
                            <div className="flex items-start justify-between mb-1.5">
                              <p className="font-semibold text-sm leading-tight text-foreground/90">{c.nome}</p>
                              <Select value={c.etapa} onValueChange={(v) => moverFunil(c.id, v as Etapa)}>
                                <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" hideIcon>
                                  <MoreHorizontal className="h-3.5 w-3.5 mx-auto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {columns.map(k => <SelectItem key={k.key} value={k.key} className="text-xs">{k.title}</SelectItem>)}
                                </SelectContent>
                              </Select>
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
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" onClick={(e) => { e.stopPropagation(); abrirZap(c); }} title="Disparar Mensagem API"><Inbox className="h-3.5 w-3.5" /></Button>
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

        <TabsContent value="inbox" className="space-y-6">
          <Card className="glass-card flex overflow-hidden border-border/50 h-[70vh] min-h-[500px]">
            {/* Lista Lateral de Contatos */}
            <div className="w-1/3 min-w-[280px] border-r border-border/50 flex flex-col bg-card-elevated/30">
              <div className="p-4 border-b border-border/50 flex justify-between items-center">
                <h3 className="font-semibold text-sm">Novas Mensagens</h3>
                <Button variant="ghost" size="icon" onClick={loadInbox} disabled={inboxLoading}>
                  <Repeat className={`h-4 w-4 ${inboxLoading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {(!Array.isArray(inboxMessages) || inboxMessages.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                    <MessageCircle className="h-10 w-10 mb-2" />
                    <p className="text-sm">Nenhuma mensagem nova</p>
                  </div>
                ) : (
                  Array.isArray(inboxMessages) && inboxMessages.map((msg: any, i) => {
                    const phone = msg.phone || msg.from || msg.id?.split('@')[0] || "Sem número";
                    const cleanPhone = phone.includes('@') ? phone.split('@')[0] : phone;
                    const name = msg.pushname || msg.pushName || msg.name || cleanPhone || "Novo Contato";
                    const text = msg.body || msg.content || msg.text?.message || msg.text || "Nova mensagem recebida...";
                    const time = msg.t ? new Date(msg.t * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";
                    
                    return (
                      <div 
                        key={i} 
                        onClick={() => loadChat(cleanPhone)} 
                        className={`p-4 border-b border-border/30 cursor-pointer transition-all hover:bg-primary/5 ${selectedChat === cleanPhone ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-gold text-primary-foreground flex items-center justify-center font-bold">
                            <UserPlus className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="font-semibold text-sm truncate">{name}</p>
                              {time && <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{time}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{text}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Chat Ativo */}
            <div className="flex-1 flex flex-col bg-background/50 relative">
              {selectedChat ? (
                <>
                  <div className="p-4 border-b border-border/50 bg-card-elevated/40 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-gold text-primary-foreground flex items-center justify-center font-bold">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{selectedChat}</p>
                        <p className="text-xs text-muted-foreground flex gap-2">
                          <button onClick={() => {
                            setCNome("");
                            setCTelefone(selectedChat);
                            setCWhats(selectedChat);
                            setClienteDialog(true);
                          }} className="text-primary hover:underline flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Criar Lead
                          </button>
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => loadChat(selectedChat)} disabled={chatLoading}><Repeat className={`h-4 w-4 ${chatLoading ? "animate-spin" : ""}`} /></Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                    {(!Array.isArray(chatHistory) || chatHistory.length === 0) && !chatLoading ? (
                      <p className="text-center text-muted-foreground text-sm my-10">Histórico vazio ou não carregado.</p>
                    ) : (
                      Array.isArray(chatHistory) && chatHistory.map((msg: any, i) => {
                        const isMe = msg.fromMe || msg.sender === "me"; // Ajuste conforme API
                        return (
                          <div key={i} className={`flex flex-col max-w-[75%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}>
                            <div className={`p-3 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card-elevated border border-border/50 rounded-tl-none"}`}>
                              {msg.text?.message || msg.body || msg.text || "Conteúdo de mídia..."}
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 opacity-70">
                              {msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="p-4 bg-card-elevated/40 border-t border-border/50 flex gap-2 items-end">
                    <Textarea 
                      value={replyText} 
                      onChange={e => setReplyText(e.target.value)} 
                      placeholder="Digite a mensagem..." 
                      className="min-h-[50px] max-h-[120px] bg-background resize-none"
                    />
                    <Button onClick={enviarRespostaInbox} disabled={saving || !replyText.trim()} className="bg-gradient-gold text-primary-foreground h-[50px] px-6">
                      {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                  <MessageCircle className="h-16 w-16 mb-4" />
                  <p className="text-lg font-medium">Selecione uma conversa</p>
                  <p className="text-sm">Clique em uma mensagem nova na lista ao lado.</p>
                </div>
              )}
            </div>
          </Card>
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

      {/* Dialog Cliente */}
      <Dialog open={clienteDialog} onOpenChange={setClienteDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingLead ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome *</Label><Input value={cNome} onChange={e => setCNome(e.target.value)} /></div>
              <div><Label className="text-xs">Cidade</Label><Input value={cCidade} onChange={e => setCCidade(e.target.value)} /></div>
              <div><Label className="text-xs">Telefone</Label><Input value={cTelefone} onChange={e => setCTelefone(e.target.value)} /></div>
              <div><Label className="text-xs">WhatsApp</Label><Input value={cWhats} onChange={e => setCWhats(e.target.value)} /></div>
              <div><Label className="text-xs">Destino</Label><Input value={cDestino} onChange={e => setCDestino(e.target.value)} /></div>
              <div>
                <Label className="text-xs">Status (Kanban)</Label>
                <Select value={cKanban} onValueChange={(v: any) => setCKanban(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {kanbanCols.map(k => <SelectItem key={k.key} value={k.key}>{k.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Última mensagem</Label><Input value={cUltimaMsg} onChange={e => setCUltimaMsg(e.target.value)} placeholder="Ex: Cliente pediu cotação para sábado" /></div>
            <div><Label className="text-xs">Observações</Label><Textarea value={cObs} onChange={e => setCObs(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClienteDialog(false)}>Cancelar</Button>
            <Button onClick={salvarCliente} disabled={saving} className="bg-gradient-gold text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Embarque — mesmos campos da aba Embarques */}
      <Dialog open={embDialog} onOpenChange={setEmbDialog}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">Novo embarque</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Origem</Label><Input value={embForm.origem} onChange={e => setEmbForm(f => ({ ...f, origem: e.target.value }))} placeholder="São Paulo" /></div>
                <div><Label>Destino</Label><Input value={embForm.destino} onChange={e => setEmbForm(f => ({ ...f, destino: e.target.value }))} placeholder="Foz do Iguaçu" /></div>
              </div>
              <div><Label>Local de embarque</Label><Input value={embForm.local_embarque} onChange={e => setEmbForm(f => ({ ...f, local_embarque: e.target.value }))} placeholder="Terminal Tietê - Plataforma 12" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Saída</Label><Input type="datetime-local" value={embForm.data_saida} onChange={e => setEmbForm(f => ({ ...f, data_saida: e.target.value }))} /></div>
                <div><Label>Retorno</Label><Input type="datetime-local" value={embForm.data_retorno} onChange={e => setEmbForm(f => ({ ...f, data_retorno: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={embForm.valor_operacao} onChange={e => setEmbForm(f => ({ ...f, valor_operacao: e.target.value }))} /></div>
                <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={embForm.custo_operacao} onChange={e => setEmbForm(f => ({ ...f, custo_operacao: e.target.value }))} /></div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Serviço / Frota escalada</Label>
                <Select value={embForm.servico_id} onValueChange={(v) => setEmbForm(f => ({ ...f, servico_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar serviço" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum serviço definido ainda</SelectItem>
                    {servicos.map(s => {
                      const dateStr = s.data_operacao ? new Date(s.data_operacao).toLocaleDateString("pt-BR") : "";
                      return <SelectItem key={s.id} value={s.id}>Serviço #{s.servico} — {(s.rota || "").split(" → ")[1] || s.rota} ({dateStr})</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sentido Padrão (Rota)</Label>
                <Select value={embForm.rota} onValueChange={(v: any) => setEmbForm(f => ({ ...f, rota: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Não definido</SelectItem>
                    <SelectItem value="descida">Descida (Litoral - Ilhéus/Porto Seguro)</SelectItem>
                    <SelectItem value="subida">Subida (Sudoeste - Conquista/Itapetinga)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={embForm.status} onValueChange={(v: EStatus) => setEmbForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_rota">Em rota</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Observações</Label><Textarea value={embForm.observacoes} onChange={e => setEmbForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
            </div>
          </div>
          <Button onClick={salvarEmbarque} disabled={saving} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 mt-2">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar embarque
          </Button>
        </DialogContent>
      </Dialog>

      {/* Dialog Histórico */}
      <Dialog open={histDialog} onOpenChange={setHistDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Histórico — {histLead?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {histEmbarques.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum embarque registrado.</p>
            ) : histEmbarques.map(e => (
              <div key={e.id} className="p-3 rounded-lg border border-border/40 bg-card-elevated/30 text-sm">
                <div className="flex justify-between"><span className="font-semibold">{e.cidade_destino || e.rota}</span><Badge variant="outline">{e.status}</Badge></div>
                <p className="text-xs text-muted-foreground mt-1">{e.data_operacao} {e.hora_saida_prevista || ""}</p>
                {e.observacao && <p className="text-xs mt-1">{e.observacao}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Zap Automático */}
      <Dialog open={zapDialog} onOpenChange={setZapDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disparar Mensagem WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Para</Label>
              <Input disabled value={`${zapLead?.nome || ""} (${zapLead?.whatsapp || zapLead?.telefone || "sem número"})`} />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea 
                value={zapText} 
                onChange={e => setZapText(e.target.value)} 
                rows={5} 
                placeholder="Digite a mensagem..." 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setZapDialog(false)}>Cancelar</Button>
            <Button onClick={enviarZap} disabled={saving || !zapText.trim()} className="bg-gradient-gold text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Mensagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog Mensagem Inbox (Virtual Card) */}
      <Dialog open={virtualMsgDialog} onOpenChange={setVirtualMsgDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card/95 border-border/50">
          <DialogHeader className="p-4 border-b border-border/50 bg-card-elevated">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-gold text-primary-foreground flex items-center justify-center font-bold shadow-glow">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold">{selectedVirtualMsg?.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="h-2.5 w-2.5" /> {selectedVirtualMsg?.cleanPhone}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-[11px] border-primary/30 hover:bg-primary/10 hover:text-primary"
                onClick={() => {
                  setVirtualMsgDialog(false);
                  setCNome(selectedVirtualMsg?.name === selectedVirtualMsg?.cleanPhone ? "" : selectedVirtualMsg?.name);
                  setCTelefone(selectedVirtualMsg?.cleanPhone);
                  setCWhats(selectedVirtualMsg?.cleanPhone);
                  setClienteDialog(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Lead
              </Button>
            </div>
          </DialogHeader>

          {selectedVirtualMsg && (
            <>
              {/* Message History Area */}
              <div className="p-4 bg-black/20 min-h-[250px] max-h-[350px] overflow-y-auto space-y-4 scrollbar-thin">
                {virtualMsgLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-10">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando mensagens reais...
                  </div>
                ) : selectedVirtualMsg.rawMessages && selectedVirtualMsg.rawMessages.length > 0 ? (
                  selectedVirtualMsg.rawMessages.map((m: any, idx: number) => (
                    <div key={idx} className={`flex flex-col max-w-[85%] ${m.isMe ? "ml-auto items-end" : "mr-auto items-start"}`}>
                      <div className={`p-2.5 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${m.isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card-elevated border border-border/40 rounded-tl-none"}`}>
                        {m.text}
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-1 px-1">
                        {m.time}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-10">Nenhuma mensagem encontrada.</p>
                )}
              </div>

              {/* Reply Area */}
              <div className="p-3 bg-card-elevated border-t border-border/50 flex flex-col gap-2">
                <Textarea 
                  value={replyVirtualMsgText}
                  onChange={e => setReplyVirtualMsgText(e.target.value)}
                  placeholder="Escreva sua resposta..."
                  className="min-h-[60px] max-h-[100px] resize-none text-sm bg-background/50 border-border/40 focus:bg-background"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      responderPeloModal();
                    }
                  }}
                />
                <div className="flex justify-between items-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground hover:text-foreground h-8"
                    onClick={() => {
                      setVirtualMsgDialog(false);
                      setTab("inbox");
                      loadChat(selectedVirtualMsg.cleanPhone);
                    }}
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Abrir Inbox Completo
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-gradient-gold text-primary-foreground h-8 px-4 font-medium"
                    onClick={responderPeloModal}
                    disabled={saving || !replyVirtualMsgText.trim()}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enviar Resposta"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
