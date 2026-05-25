// import { useEffect, useMemo, useState } from "react";
// import { Card } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
// } from "@/components/ui/dialog";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
// import {
//   Package, Search, Send, Inbox, Target, Trash2, Plus, Loader2, MapPin, Clock3, User, Phone, Download, FileText, CheckSquare, Square, Truck, Briefcase, AlertCircle
// } from "lucide-react";
// import { supabase } from "@/integrations/supabase/client";
// import { toast } from "@/hooks/use-toast";

// // === TIPAGENS E INTERFACES ===
// type Tipo = "enviada" | "recebida";
// type Status = "pendente" | "em_transito" | "chegando" | "recebida" | "entregue" | "cancelada";

// interface Entrega {
//   id: string;
//   codigo: string;
//   cliente: string;
//   telefone: string | null;
//   origem: string | null;
//   destino: string | null;
//   tipo: Tipo;
//   status: Status;
//   valor: number;
//   comissao: number;
//   responsavel: string | null;
//   previsao: string | null;
//   observacoes: string | null;
//   data_operacao: string;
//   created_at: string;
// }

// interface ExcessoBagagem {
//   id: string;
//   passageiro: string;
//   descricaoBens: string;
//   valorCobrado: number;
//   comissao: number;
//   prestadoContas: boolean;
//   created_at: string;
// }

// // Type Guard para diferenciar Encomendas de Excessos de Bagagem de forma segura
// function isEntrega(item: Entrega | ExcessoBagagem): item is Entrega {
//   return (item as Entrega).codigo !== undefined;
// }

// // === CONFIGURAÇÕES GLOBAIS ===
// const META_MES = 100;
// const META_EXCESSO = 100;
// const WHATSAPP_DESTINO = "557791157974";

// const STATUS_OPTS: { value: Status; label: string }[] = [
//   { value: "pendente", label: "Pendente" },
//   { value: "em_transito", label: "Em trânsito" },
//   { value: "chegando", label: "Chegando" },
//   { value: "recebida", label: "Recebida" },
//   { value: "entregue", label: "Entregue" },
//   { value: "cancelada", label: "Cancelada" },
// ];

// const statusBadge = (s: Status) => {
//   const map: Record<Status, string> = {
//     pendente: "bg-muted text-muted-foreground",
//     em_transito: "bg-blue-500/15 text-blue-400 border-blue-500/30",
//     chegando: "bg-amber-500/15 text-amber-400 border-amber-500/30",
//     recebida: "bg-purple-500/15 text-purple-400 border-purple-500/30",
//     entregue: "bg-success/15 text-success border-success/30",
//     cancelada: "bg-destructive/15 text-destructive border-destructive/30",
//   };
//   return map[s] || map.pendente;
// };

// // === FUNÇÃO DE ENVIO DO WHATSAPP (FETCH NATIVO INTEGRADO) ===
// const sendText = async (message: { number: string; text: string }): Promise<any> => {
//   const url = '/api-brasil/api/v2/whatsapp/sendText'; 
//   const payload = {
//     number: message.number,
//     text: message.text,
//     textMessage: { text: message.text },
//     options: { delay: 1200, presence: "composing", linkPreview: false }
//   };
//   const response = await fetch(url, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload)
//   });
//   if (!response.ok) throw new Error("Erro no servidor da API do WhatsApp");
//   return await response.json();
// };

// export default function Entregas() {
//   const [lista, setLista] = useState<Entrega[]>([]);
//   const [listaExcesso, setListaExcesso] = useState<ExcessoBagagem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [selecionados, setSelecionados] = useState<string[]>([]);
  
//   // FILTROS
//   const [busca, setBusca] = useState("");
//   const [filtroTipo, setFiltroTipo] = useState<"todos" | Tipo | "excesso">("todos");
//   const [filtroStatus, setFiltroStatus] = useState<"todos" | Status>("todos");
//   const [filtroPeriodo, setFiltroPeriodo] = useState<"mes" | "tudo">("mes");
  
//   const [open, setOpen] = useState(false);
//   const [activeTab, setActiveTab] = useState("entrega");

//   // FORM STATES (ENTREGAS)
//   const [codigo, setCodigo] = useState("");
//   const [cliente, setCliente] = useState("");
//   const [telefone, setTelefone] = useState("");
//   const [origem, setOrigem] = useState("");
//   const [destino, setDestino] = useState("");
//   const [tipo, setTipo] = useState<Tipo>("enviada");
//   const [valor, setValor] = useState("");
//   const [responsavel, setResponsavel] = useState("");
//   const [previsao, setPrevisao] = useState("");
//   const [observacoes, setObservacoes] = useState("");

//   // FORM STATES (EXCESSO)
//   const [passageiro, setPassageiro] = useState("");
//   const [descricaoBens, setDescricaoBens] = useState("");
//   const [valorExcesso, setValorExcesso] = useState("");

//   const [salvando, setSalvando] = useState(false);
//   const [executandoEmMassa, setExecutandoEmMassa] = useState(false);
//   const [enviandoWhats, setEnviandoWhats] = useState(false);
//   const [currentTime, setCurrentTime] = useState(new Date());

//   // Timer de atualização do prazo das malas (24 horas)
//   useEffect(() => {
//     const timer = setInterval(() => setCurrentTime(new Date()), 30000);
//     return () => clearInterval(timer);
//   }, []);

//   const carregar = async () => {
//     setLoading(true);
//     const { data, error } = await supabase
//       .from("entregas")
//       .select("*")
//       .order("data_operacao", { ascending: false })
//       .order("created_at", { ascending: false });
    
//     if (error) {
//       toast({ title: "Erro ao carregar entregas", description: error.message, variant: "destructive" });
//     } else {
//       setLista((data ?? []) as Entrega[]);
//     }

//     const localExcesso = localStorage.getItem("rapihub_excessos");
//     if (localExcesso) {
//       setListaExcesso(JSON.parse(localExcesso));
//     }

//     setLoading(false);
//     setSelecionados([]);
//   };

//   useEffect(() => { carregar(); }, []);

//   const resetForm = () => {
//     setCodigo(""); setCliente(""); setTelefone(""); setOrigem(""); setDestino("");
//     setTipo("enviada"); setValor(""); setResponsavel(""); setPrevisao(""); setObservacoes("");
//     setPassageiro(""); setDescricaoBens(""); setValorExcesso("");
//   };

//   const salvar = async () => {
//     setSalvando(true);

//     if (activeTab === "entrega") {
//       if (!codigo.trim() || !cliente.trim()) {
//         toast({ title: "Preencha código e cliente", variant: "destructive" });
//         setSalvando(false);
//         return;
//       }
//       const { data: { user } } = await supabase.auth.getUser();
//       const { error } = await supabase.from("entregas").insert({
//         codigo: codigo.trim(),
//         cliente: cliente.trim(),
//         telefone: telefone || null,
//         origem: origem || null,
//         destino: destino || null,
//         tipo,
//         valor: Number(valor) || 0,
//         responsavel: responsavel || null,
//         previsao: previsao || null,
//         observacoes: observacoes || null,
//         created_by: user?.id ?? null,
//       });
//       if (error) {
//         toast({ title: "Erro ao salvar entrega", description: error.message, variant: "destructive" });
//         setSalvando(false);
//         return;
//       }
//       toast({ title: "Entrega registrada com sucesso!" });
//     } else {
//       if (!passageiro.trim() || !valorExcesso) {
//         toast({ title: "Preencha o passageiro e o valor cobrado", variant: "destructive" });
//         setSalvando(false);
//         return;
//       }

//       const vExcesso = Number(valorExcesso) || 0;
//       const novoExcesso: ExcessoBagagem = {
//         id: crypto.randomUUID(),
//         passageiro: passageiro.trim(),
//         descricaoBens: descricaoBens.trim() || "Bagagem adicional",
//         valorCobrado: vExcesso,
//         comissao: vExcesso * 0.10, 
//         prestadoContas: false,
//         created_at: new Date().toISOString()
//       };

//       const novaLista = [novoExcesso, ...listaExcesso];
//       setListaExcesso(novaLista);
//       localStorage.setItem("rapihub_excessos", JSON.stringify(novaLista));
//       toast({ title: "Excesso de bagagem registrado!" });
//     }

//     setSalvando(false);
//     resetForm();
//     setOpen(false);
//     carregar();
//   };

//   const atualizarStatus = async (id: string, novo: Status) => {
//     const { error } = await supabase.from("entregas").update({ status: novo }).eq("id", id);
//     if (error) {
//       toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
//       return;
//     }
//     setLista((prev) => prev.map((e) => (e.id === id ? { ...e, status: novo } : e)));
//     toast({ title: "Status atualizado" });
//   };

//   const alternarPrestacaoContas = (id: string) => {
//     const novaLista = listaExcesso.map(e => e.id === id ? { ...e, prestadoContas: !e.prestadoContas } : e);
//     setListaExcesso(novaLista);
//     localStorage.setItem("rapihub_excessos", JSON.stringify(novaLista));
//     toast({ title: "Prestação de contas modificada" });
//   };

//   const excluir = async (id: string, isExcesso = false) => {
//     if (!confirm("Excluir este registro permanentemente?")) return;
    
//     if (isExcesso) {
//       const novaLista = listaExcesso.filter(e => e.id !== id);
//       setListaExcesso(novaLista);
//       localStorage.setItem("rapihub_excessos", JSON.stringify(novaLista));
//       toast({ title: "Registro de excesso removido" });
//     } else {
//       const { error } = await supabase.from("entregas").delete().eq("id", id);
//       if (error) {
//         toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
//         return;
//       }
//       setLista((prev) => prev.filter((e) => e.id !== id));
//       setSelecionados((prev) => prev.filter((item) => item !== id));
//       toast({ title: "Entrega removida" });
//     }
//   };

//   // --- BULK ACTIONS (Apenas Encomendas filtradas) ---
//   const handleSelecionarTodos = () => {
//     const apenasEncomendasFiltradas = filtradas.filter(isEntrega);
//     if (selecionados.length === apenasEncomendasFiltradas.length) {
//       setSelecionados([]);
//     } else {
//       setSelecionados(apenasEncomendasFiltradas.map(e => e.id));
//     }
//   };

//   const handleSelecionarItem = (id: string) => {
//     setSelecionados(prev => 
//       prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
//     );
//   };

//   const atualizarStatusEmMassa = async (novoStatus: Status) => {
//     if (selecionados.length === 0) return;
//     setExecutandoEmMassa(true);
//     const { error } = await supabase.from("entregas").update({ status: novoStatus }).in("id", selecionados);
//     setExecutandoEmMassa(false);

//     if (error) {
//       toast({ title: "Erro ao atualizar em massa", description: error.message, variant: "destructive" });
//       return;
//     }
//     setLista(prev => prev.map(e => selecionados.includes(e.id) ? { ...e, status: novoStatus } : e));
//     toast({ title: `${selecionados.length} encomendas atualizadas!` });
//     setSelecionados([]);
//   };

//   const excluirEmMassa = async () => {
//     if (selecionados.length === 0) return;
//     if (!confirm(`Tem certeza que deseja excluir as ${selecionados.length} encomendas selecionadas?`)) return;
    
//     setExecutandoEmMassa(true);
//     const { error } = await supabase.from("entregas").delete().in("id", selecionados);
//     setExecutandoEmMassa(false);

//     if (error) {
//       toast({ title: "Erro ao excluir em massa", description: error.message, variant: "destructive" });
//       return;
//     }
//     setLista(prev => prev.filter(e => !selecionados.includes(e.id)));
//     toast({ title: `${selecionados.length} entregas excluídas` });
//     setSelecionados([]);
//   };

//   const getTempoRestantePrestacao = (createdAtIso: string) => {
//     const criacao = new Date(createdAtIso);
//     const limite = new Date(criacao.getTime() + 24 * 60 * 60 * 1000);
//     const diffMs = limite.getTime() - currentTime.getTime();
    
//     if (diffMs <= 0) return { texto: "Prazo esgotado!", urgente: true };
    
//     const horas = Math.floor(diffMs / (1000 * 60 * 60));
//     const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
//     return { texto: `${horas}h ${minutos}m restantes`, urgente: horas < 4 };
//   };

//   const comissaoPreview = useMemo(() => {
//     const v = Number(valor) || 0;
//     return tipo === "enviada" ? v * 0.10 : 5;
//   }, [valor, tipo]);

//   // COMBINAÇÃO E FILTRAGEM DINÂMICA
//   const filtradas = useMemo(() => {
//     const t = busca.toLowerCase();
//     const hoje = new Date();
//     const mesAtual = hoje.getMonth();
//     const anoAtual = hoje.getFullYear();

//     const entregasFiltradas = lista.filter((e) => {
//       const matchTexto = !t || [e.codigo, e.cliente, e.origem, e.destino, e.responsavel].filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
//       const matchTipo = filtroTipo === "todos" || e.tipo === filtroTipo;
//       const matchStatus = filtroStatus === "todos" || e.status === filtroStatus;
      
//       let matchPeriodo = true;
//       if (filtroPeriodo === "mes") {
//         const d = new Date(e.data_operacao);
//         matchPeriodo = d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
//       }
//       return matchTexto && matchTipo && matchStatus && matchPeriodo;
//     });

//     const excessosFiltrados = listaExcesso.filter((e) => {
//       const matchTexto = !t || [e.passageiro, e.descricaoBens].filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
//       const matchTipo = filtroTipo === "todos" || filtroTipo === "excesso";
//       const matchStatus = filtroStatus === "todos"; 
      
//       let matchPeriodo = true;
//       if (filtroPeriodo === "mes") {
//         const d = new Date(e.created_at);
//         matchPeriodo = d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
//       }
//       return matchTexto && matchTipo && matchStatus && matchPeriodo;
//     });

//     return [...entregasFiltradas, ...excessosFiltrados];
//   }, [lista, listaExcesso, busca, filtroTipo, filtroStatus, filtroPeriodo]);

//   // KPIs MENSAIS FIXOS
//   const statsMensal = useMemo(() => {
//     const hoje = new Date();
//     const mes = hoje.getMonth(), ano = hoje.getFullYear();
    
//     const doMes = lista.filter((e) => {
//       const d = new Date(e.data_operacao);
//       return d.getMonth() === mes && d.getFullYear() === ano;
//     });

//     const excessosDoMes = listaExcesso.filter((e) => {
//       const d = new Date(e.created_at);
//       return d.getMonth() === mes && d.getFullYear() === ano;
//     });

//     const enviadas = doMes.filter((e) => e.tipo === "enviada");
//     const recebidas = doMes.filter((e) => e.tipo === "recebida");
//     const praChegar = doMes.filter((e) => e.status === "chegando");
    
//     const comEnv = enviadas.reduce((s, e) => s + Number(e.comissao || 0), 0);
//     const comRec = recebidas.reduce((s, e) => s + Number(e.comissao || 0), 0);
//     const totalEntregas = comEnv + comRec;

//     const totalExcessoComissao = excessosDoMes.reduce((s, e) => s + Number(e.comissao || 0), 0);
//     const totalExcessoBruto = excessosDoMes.reduce((s, e) => s + Number(e.valorCobrado || 0), 0);
//     const pendentesPrestacaoContas = excessosDoMes.filter(e => !e.prestadoContas).length;

//     return {
//       enviadas: enviadas.length,
//       recebidas: recebidas.length,
//       praChegar: praChegar.length,
//       totalEntregas,
//       progressoEntregas: Math.min(100, (totalEntregas / META_MES) * 100),
//       faltamEntregas: Math.max(0, META_MES - totalEntregas),
      
//       totalExcessoComissao,
//       totalExcessoBruto,
//       pendentesPrestacaoContas,
//       progressoExcesso: Math.min(100, (totalExcessoComissao / META_EXCESSO) * 100),
//       faltamExcesso: Math.max(0, META_EXCESSO - totalExcessoComissao),
//     };
//   }, [lista, listaExcesso]);

//   // RESUMO DINÂMICO DOS ITENS FILTRADOS
//   const resumoRelatorio = useMemo(() => {
//     let totalValor = 0;
//     let totalComissao = 0;
//     let praChegarFiltrados = 0;
//     let qtdExcessos = 0;

//     filtradas.forEach(item => {
//       if (isEntrega(item)) {
//         totalValor += Number(item.valor || 0);
//         totalComissao += Number(item.comissao || 0);
//         if (item.status === "chegando") praChegarFiltrados++;
//       } else {
//         totalValor += Number(item.valorCobrado || 0);
//         totalComissao += Number(item.comissao || 0);
//         qtdExcessos++;
//       }
//     });

//     return {
//       quantidade: filtradas.length,
//       totalValor,
//       totalComissao,
//       praChegarFiltrados,
//       qtdExcessos
//     };
//   }, [filtradas]);

//   // ENVIO DO WHATSAPP FORMATADO
//   const enviarRelatorioWhatsApp = async () => {
//     if (filtradas.length === 0) {
//       toast({ title: "Nenhum dado filtrado para enviar", variant: "destructive" });
//       return;
//     }
//     setEnviandoWhats(true);

//     let textoMsg = `*📋 RELATÓRIO CONSOLIDADO - NOVO HORIZONTE*\n`;
//     textoMsg += `_Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}_\n\n`;
    
//     textoMsg += `*📊 RESUMO DA TELA:*\n`;
//     textoMsg += `🔹 Total Movimentações: ${resumoRelatorio.quantidade}\n`;
//     textoMsg += `📦 Encomendas Pra Chegar: ${resumoRelatorio.praChegarFiltrados}\n`;
//     textoMsg += `🧳 Registros de Excesso: ${resumoRelatorio.qtdExcessos}\n`;
//     textoMsg += `🔹 Bruto Movimentado: R$ ${resumoRelatorio.totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
//     textoMsg += `💰 *Minha Comissão Geral: R$ ${resumoRelatorio.totalComissao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n\n`;
    
//     textoMsg += `*📝 ITENS DETALHADOS:*\n`;
//     textoMsg += `-------------------------------------------\n`;

//     filtradas.forEach((item, idx) => {
//       if (isEntrega(item)) {
//         const statusLabel = STATUS_OPTS.find(s => s.value === item.status)?.label || item.status;
//         textoMsg += `${idx + 1}. *[ENCOMENDA]* Código: *${item.codigo}*\n`;
//         textoMsg += `👤 Cliente: ${item.cliente}\n`;
//         textoMsg += `📍 Rota: ${item.origem || "?"} ➔ ${item.destino || "?"}\n`;
//         textoMsg += `⏰ Status: ${statusLabel} ${item.previsao ? `(${item.previsao})` : ""}\n`;
//         textoMsg += `💵 Valor: R$ ${item.valor.toFixed(2)} | Comis: R$ ${item.comissao.toFixed(2)}\n`;
//       } else {
//         textoMsg += `${idx + 1}. *[EXCESSO BAGAGEM]* 🧳\n`;
//         textoMsg += `👤 Passageiro: ${item.passageiro}\n`;
//         textoMsg += `📝 Descrição: ${item.descricaoBens}\n`;
//         textoMsg += `📢 Lançamento: ${item.prestadoContas ? "✅ Contas Prestadadas" : "❌ Pendente de Acerto"}\n`;
//         textoMsg += `💵 Cobrado: R$ ${item.valorCobrado.toFixed(2)} | Comis (10%): R$ ${item.comissao.toFixed(2)}\n`;
//       }
//       textoMsg += `-------------------------------------------\n`;
//     });

//     try {
//       await sendText({ number: WHATSAPP_DESTINO, text: textoMsg });
//       toast({ title: "Relatório completo enviado via WhatsApp!" });
//     } catch (error: any) {
//       console.error("Erro WhatsApp:", error);
//       toast({ title: "Erro ao enviar WhatsApp", description: "Verifique o serviço de envio de mensagens.", variant: "destructive" });
//     } finally {
//       setEnviandoWhats(false);
//     }
//   };

//   const exportarCSV = () => {
//     if (filtradas.length === 0) {
//       toast({ title: "Nenhum dado para exportar", variant: "destructive" });
//       return;
//     }
//     const headers = ["Tipo Registro", "Identificador/Passageiro", "Detalhe/Cliente", "Status/Descricao", "Valor Bruto (R$)", "Comissao (R$)", "Data"];
//     const rows = filtradas.map(item => {
//       if (isEntrega(item)) {
//         return ["Encomenda", item.codigo, `"${item.cliente}"`, item.status, item.valor.toFixed(2), item.comissao.toFixed(2), new Date(item.data_operacao).toLocaleDateString("pt-BR")];
//       } else {
//         return ["Excesso Bagagem", `"${item.passageiro}"`, `"${item.descricaoBens}"`, item.prestadoContas ? "Prestado" : "Pendente", item.valorCobrado.toFixed(2), item.comissao.toFixed(2), new Date(item.created_at).toLocaleDateString("pt-BR")];
//       }
//     });
//     const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.setAttribute("href", url);
//     link.setAttribute("download", `relatorio_geral_${new Date().toISOString().split('T')[0]}.csv`);
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     toast({ title: "Relatório baixado com sucesso!" });
//   };

//   return (
//     <div className="space-y-6 max-w-[1600px] mx-auto pb-24 relative px-4 sm:px-6">
//       {/* HERO */}
//       <div className="relative overflow-hidden rounded-2xl bg-gradient-hero border border-border p-6 sm:p-8">
//         <div className="absolute inset-0 bg-gradient-glow opacity-60" />
//         <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//           <div>
//             <p className="text-xs uppercase tracking-widest text-primary/80 font-medium mb-2">Agência União de Negócios</p>
//             <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center gap-3">
//               <Package className="h-7 w-7 text-primary" /> Painel de Controle Consolidado
//             </h1>
//             <p className="text-muted-foreground mt-2 max-w-xl text-sm">
//               Gerencie Encomendas e Excessos de Bagagem Novo Horizonte. <span className="text-foreground font-medium">Prazo legal de 24h</span> para acerto de caixas extras.
//             </p>
//           </div>
          
//           <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if(!isOpen) resetForm(); }}>
//             <DialogTrigger asChild>
//               <Button className="rounded-xl h-11 px-5 gap-2 shrink-0"><Plus className="h-4 w-4" /> Registrar Operação</Button>
//             </DialogTrigger>
//             <DialogContent className="max-w-lg">
//               <DialogHeader><DialogTitle>Novo Registro Lançamento</DialogTitle></DialogHeader>
              
//               <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//                 <TabsList className="grid w-full grid-cols-2 mb-4">
//                   <TabsTrigger value="entrega" className="gap-2"><Package className="h-4 w-4" /> Encomenda</TabsTrigger>
//                   <TabsTrigger value="excesso" className="gap-2"><Briefcase className="h-4 w-4" /> Excesso Bagagem</TabsTrigger>
//                 </TabsList>
                
//                 <TabsContent value="entrega" className="space-y-3 mt-0">
//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label>Código *</Label>
//                       <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ENC-1024" />
//                     </div>
//                     <div>
//                       <Label>Tipo *</Label>
//                       <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
//                         <SelectTrigger><SelectValue /></SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="enviada">Enviada (10%)</SelectItem>
//                           <SelectItem value="recebida">Recebida (R$ 5)</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>
//                   </div>
//                   <div>
//                     <Label>Cliente *</Label>
//                     <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" />
//                   </div>
//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label>Telefone</Label>
//                       <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
//                     </div>
//                     <div>
//                       <Label>Responsável</Label>
//                       <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Atendente / Agência" />
//                     </div>
//                   </div>
//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label>Origem</Label>
//                       <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Origem" />
//                     </div>
//                     <div>
//                       <Label>Destino</Label>
//                       <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Destino" />
//                     </div>
//                   </div>
//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label>Valor (R$)</Label>
//                       <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
//                     </div>
//                     <div>
//                       <Label>Previsão</Label>
//                       <Input value={previsao} onChange={(e) => setPrevisao(e.target.value)} placeholder="Hoje às 14:00" />
//                     </div>
//                   </div>
//                   <div className="flex justify-between items-center px-3 py-2 rounded-md bg-success/10 border border-success/30 text-xs">
//                     <span className="text-success/80 font-semibold uppercase tracking-wider">Comissão Prevista</span>
//                     <span className="font-display font-bold text-success">R$ {comissaoPreview.toFixed(2)}</span>
//                   </div>
//                   <div>
//                     <Label>Observações</Label>
//                     <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
//                   </div>
//                 </TabsContent>
                
//                 <TabsContent value="excesso" className="space-y-3 mt-0">
//                   <div>
//                     <Label>Nome do Passageiro *</Label>
//                     <Input value={passageiro} onChange={(e) => setPassageiro(e.target.value)} placeholder="Ex: Maria das Dores" />
//                   </div>
//                   <div>
//                     <Label>Descrição da Bagagem</Label>
//                     <Input value={descricaoBens} onChange={(e) => setDescricaoBens(e.target.value)} placeholder="Ex: Isopor Grande de Peixe / Caixa de Mudança" />
//                   </div>
//                   <div>
//                     <Label>Valor Cobrado (R$) *</Label>
//                     <Input type="number" step="0.01" value={valorExcesso} onChange={(e) => setValorExcesso(e.target.value)} placeholder="0,00" />
//                   </div>
//                   <div className="flex justify-between items-center px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs">
//                     <span className="text-amber-500 font-semibold uppercase tracking-wider">Sua Participação (10%)</span>
//                     <span className="font-display font-bold text-amber-500">R$ {((Number(valorExcesso) || 0) * 0.10).toFixed(2)}</span>
//                   </div>
//                   <div className="flex items-start gap-2 bg-muted p-2.5 rounded-lg border border-border text-xs text-muted-foreground">
//                     <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
//                     <span>Lembrete: O prazo máximo regulamentar para conferência e prestação de contas desse valor é de 24 horas.</span>
//                   </div>
//                 </TabsContent>
//               </Tabs>

//               <DialogFooter className="mt-4">
//                 <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
//                 <Button onClick={salvar} disabled={salvando}>
//                   {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirmar Lançamento
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         </div>
//       </div>

//       {/* METAS QUADRO DUAL */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {/* Meta Encomendas */}
//         <Card className="glass-card p-5 border-l-4 border-l-primary flex flex-col justify-between">
//           <div>
//             <div className="flex justify-between items-start mb-2">
//               <div className="flex items-center gap-2">
//                 <Target className="h-5 w-5 text-primary" />
//                 <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Meta Mensal Encomendas</h2>
//               </div>
//               <span className="text-xs font-semibold px-2 py-0.5 bg-success/15 text-success rounded">
//                 {statsMensal.totalEntregas >= META_MES ? "🎯 Batida!" : `${statsMensal.progressoEntregas.toFixed(0)}%`}
//               </span>
//             </div>
//             <p className="font-display text-2xl font-bold">
//               R$ {statsMensal.totalEntregas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
//               <span className="text-muted-foreground text-sm font-normal"> / R$ {META_MES.toFixed(2)}</span>
//             </p>
//           </div>
//           <div className="mt-4">
//             <div className="h-2 w-full rounded-full bg-card-elevated overflow-hidden mb-1">
//               <div className="h-full bg-primary transition-all" style={{ width: `${statsMensal.progressoEntregas}%` }} />
//             </div>
//             <p className="text-[11px] text-muted-foreground">
//               {statsMensal.faltamEntregas > 0 ? `Faltam R$ ${statsMensal.faltamEntregas.toFixed(2)} para bater a meta.` : "Meta garantida no mês!"}
//             </p>
//           </div>
//         </Card>

//         {/* Meta Excesso */}
//         <Card className="glass-card p-5 border-l-4 border-l-amber-500 flex flex-col justify-between">
//           <div>
//             <div className="flex justify-between items-start mb-2">
//               <div className="flex items-center gap-2">
//                 <Briefcase className="h-5 w-5 text-amber-500" />
//                 <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Meta Lançamento Excesso</h2>
//               </div>
//               <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500/15 text-amber-500 rounded">
//                 {statsMensal.totalExcessoComissao >= META_EXCESSO ? "🎯 Concluída!" : `${statsMensal.progressoExcesso.toFixed(0)}%`}
//               </span>
//             </div>
//             <p className="font-display text-2xl font-bold text-amber-500">
//               R$ {statsMensal.totalExcessoComissao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
//               <span className="text-muted-foreground text-sm font-normal"> / R$ {META_EXCESSO.toFixed(2)}</span>
//             </p>
//           </div>
//           <div className="mt-4">
//             <div className="h-2 w-full rounded-full bg-card-elevated overflow-hidden mb-1">
//               <div className="h-full bg-amber-500 transition-all" style={{ width: `${statsMensal.progressoExcesso}%` }} />
//             </div>
//             <div className="flex justify-between items-center text-[11px]">
//               <span className="text-muted-foreground">
//                 {statsMensal.faltamExcesso > 0 ? `Faltam R$ ${statsMensal.faltamExcesso.toFixed(2)}` : "Meta batida com sucesso!"}
//               </span>
//               {statsMensal.pendentesPrestacaoContas > 0 && (
//                 <span className="text-destructive font-semibold flex items-center gap-1 animate-pulse">
//                   <AlertCircle className="h-3 w-3" /> {statsMensal.pendentesPrestacaoContas} acertos pendentes
//                 </span>
//               )}
//             </div>
//           </div>
//         </Card>
//       </div>

//       {/* KPIs COMPLETO */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//         <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-blue-500">
//           <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
//             <Send className="h-3.5 w-3.5 text-blue-400" /> Total Encomendas
//           </p>
//           <p className="mt-2 font-display text-xl font-bold">{statsMensal.enviadas + statsMensal.recebidas} un</p>
//           <p className="text-xs text-success mt-1">R$ {statsMensal.totalEntregas.toFixed(2)} acumulado</p>
//         </Card>
//         <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-amber-500 bg-amber-500/5">
//           <p className="text-xs uppercase tracking-wide text-amber-500 flex items-center gap-1.5 font-semibold">
//             <Truck className="h-3.5 w-3.5" /> Pra Chegar (Mês)
//           </p>
//           <p className="mt-2 font-display text-2xl font-bold text-amber-500">{statsMensal.praChegar}</p>
//         </Card>
//         <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-orange-500">
//           <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
//             <Briefcase className="h-3.5 w-3.5 text-orange-400" /> Caixa Excesso
//           </p>
//           <p className="mt-2 font-display text-xl font-bold">R$ {statsMensal.totalExcessoBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
//           <p className="text-xs text-amber-500 font-medium">Ganho: R$ {statsMensal.totalExcessoComissao.toFixed(2)}</p>
//         </Card>
//         <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-success">
//           <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
//             <Target className="h-3.5 w-3.5 text-success" /> Receita Líquida Total
//           </p>
//           <p className="mt-2 font-display text-xl font-bold text-success">R$ {(statsMensal.totalEntregas + statsMensal.totalExcessoComissao).toFixed(2)}</p>
//         </Card>
//       </div>

//       {/* FILTROS E PESQUISAS DINÂMICAS */}
//       <Card className="glass-card p-4 space-y-4">
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-2 gap-2">
//           <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
//             <FileText className="h-4 w-4 text-primary" /> Filtros Dinâmicos & Exportações
//             {filtradas.filter(isEntrega).length > 0 && (
//               <Button variant="ghost" size="sm" onClick={handleSelecionarTodos} className="h-7 text-xs text-primary gap-1 px-2 hover:bg-primary/5">
//                 {selecionados.length === filtradas.filter(isEntrega).length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
//                 Massa Encomendas
//               </Button>
//             )}
//           </div>
//           {filtradas.length > 0 && (
//             <div className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md flex flex-wrap gap-x-3 gap-y-1">
//               <span>Filtro: <span className="text-foreground font-bold">{resumoRelatorio.quantidade}</span></span>
//               <span className="text-amber-500 font-medium">Pra Chegar: <span className="font-bold">{resumoRelatorio.praChegarFiltrados}</span></span>
//               <span className="text-orange-500 font-medium">Excessos: <span className="font-bold">{resumoRelatorio.qtdExcessos}</span></span>
//               <span>Bruto Movimentado: <span className="text-foreground font-bold">R$ {resumoRelatorio.totalValor.toLocaleString("pt-BR", {minimumFractionDigits: 2})}</span></span>
//               <span>Comissão Líquida: <span className="text-success font-bold">R$ {resumoRelatorio.totalComissao.toLocaleString("pt-BR", {minimumFractionDigits: 2})}</span></span>
//             </div>
//           )}
//         </div>

//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
//           <div className="relative">
//             <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
//             <Input className="pl-10 h-11" placeholder="Buscar por texto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
//           </div>

//           <Select value={filtroPeriodo} onValueChange={(v) => setFiltroPeriodo(v as any)}>
//             <SelectTrigger className="h-11"><SelectValue placeholder="Período" /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="mes">Mês Atual</SelectItem>
//               <SelectItem value="tudo">Histórico Completo</SelectItem>
//             </SelectContent>
//           </Select>

//           <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
//             <SelectTrigger className="h-11"><SelectValue placeholder="Tipo Registro" /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="todos">Todos Registros</SelectItem>
//               <SelectItem value="enviada">Encomendas Enviadas</SelectItem>
//               <SelectItem value="recebida">Encomendas Recebidas</SelectItem>
//               <SelectItem value="excesso">Apenas Excesso Bagagem</SelectItem>
//             </SelectContent>
//           </Select>

//           <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
//             <SelectTrigger className="h-11"><SelectValue placeholder="Status Encomenda" /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="todos">Todos os status</SelectItem>
//               {STATUS_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
//             </SelectContent>
//           </Select>

//           <Button variant="secondary" onClick={exportarCSV} className="h-11 w-full gap-2 border" disabled={filtradas.length === 0}>
//             <Download className="h-4 w-4" /> Exportar CSV
//           </Button>

//           <Button variant="default" onClick={enviarRelatorioWhatsApp} className="h-11 w-full bg-green-600 hover:bg-green-700 text-white gap-2 font-medium" disabled={filtradas.length === 0 || enviandoWhats}>
//             {enviandoWhats ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar WhatsApp
//           </Button>
//         </div>
//       </Card>

//       {/* LISTAGEM PRINCIPAL */}
//       {loading ? (
//         <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
//       ) : filtradas.length === 0 ? (
//         <Card className="glass-card p-12 text-center">
//           <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
//           <p className="text-muted-foreground text-sm">Nenhum registro corresponde aos critérios de pesquisa definidos.</p>
//         </Card>
//       ) : (
//         <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
//           {filtradas.map((item) => {
//             if (isEntrega(item)) {
//               const isChecked = selecionados.includes(item.id);
//               return (
//                 <Card key={item.id} className={`glass-card p-5 hover:border-primary/40 transition-all border-l-4 relative group ${isChecked ? "ring-2 ring-primary border-primary bg-primary/5" : item.tipo === "enviada" ? "border-l-blue-500" : "border-l-purple-500"}`}>
//                   <div className="absolute top-4 right-4 z-10 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-background/80 p-1 rounded backdrop-blur-sm">
//                     <Checkbox checked={isChecked} onCheckedChange={() => handleSelecionarItem(item.id)} className="h-5 w-5 data-[state=checked]:bg-primary" />
//                   </div>
//                   <div className="flex items-start justify-between gap-3 mb-3 pr-6">
//                     <div className="min-w-0">
//                       <div className="flex items-center gap-2 flex-wrap">
//                         <h3 className="font-display font-bold text-base">{item.codigo}</h3>
//                         <Badge variant="outline" className={item.tipo === "enviada" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "bg-purple-500/15 text-purple-400 border-purple-500/30"}>
//                           {item.tipo === "enviada" ? <><Send className="h-3 w-3 mr-1" /> Enviada</> : <><Inbox className="h-3 w-3 mr-1" /> Recebida</>}
//                         </Badge>
//                       </div>
//                       <p className="text-sm text-muted-foreground mt-1 truncate">{item.cliente}</p>
//                     </div>
//                     <Badge variant="outline" className={statusBadge(item.status)}>{STATUS_OPTS.find((s) => s.value === item.status)?.label}</Badge>
//                   </div>
//                   <div className="space-y-1.5 text-xs text-muted-foreground">
//                     {(item.origem || item.destino) && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{item.origem || "?"} → {item.destino || "?"}</span></div>}
//                     {item.previsao && <div className="flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" /><span>{item.previsao}</span></div>}
//                     {item.responsavel && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" /><span className="truncate">{item.responsavel}</span></div>}
//                     {item.telefone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span>{item.telefone}</span></div>}
//                   </div>
//                   <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
//                     <div>
//                       <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor Bruto</p>
//                       <p className="font-display font-bold text-sm">R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
//                     </div>
//                     <div className="text-right">
//                       <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Comissão</p>
//                       <p className="font-display font-bold text-sm text-success">R$ {item.comissao.toFixed(2)}</p>
//                     </div>
//                   </div>
//                   <div className="mt-3 flex gap-2">
//                     <Select value={item.status} onValueChange={(v) => atualizarStatus(item.id, v as Status)}>
//                       <SelectTrigger className="h-9 text-xs flex-1"><SelectValue /></SelectTrigger>
//                       <SelectContent>
//                         {STATUS_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
//                       </SelectContent>
//                     </Select>
//                     <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => excluir(item.id)}>
//                       <Trash2 className="h-4 w-4" />
//                     </Button>
//                   </div>
//                 </Card>
//               );
//             } else {
//               const timer = getTempoRestantePrestacao(item.created_at);
//               return (
//                 <Card key={item.id} className={`glass-card p-5 hover:border-amber-500/40 transition-all border-l-4 relative group ${item.prestadoContas ? "border-l-emerald-500 bg-emerald-500/5" : "border-l-amber-500 bg-amber-500/5"}`}>
//                   <div className="flex items-start justify-between gap-3 mb-2">
//                     <div className="min-w-0">
//                       <div className="flex items-center gap-2">
//                         <Briefcase className="h-4 w-4 text-amber-500" />
//                         <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Excesso Bagagem</span>
//                       </div>
//                       <h3 className="font-display font-bold text-base mt-1 truncate">{item.passageiro}</h3>
//                     </div>
//                     <Badge variant="outline" className={item.prestadoContas ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}>
//                       {item.prestadoContas ? "Contas Prestadadas" : "Pendente Acerto"}
//                     </Badge>
//                   </div>
                  
//                   <p className="text-xs text-muted-foreground line-clamp-2 italic mb-3">"{item.descricaoBens}"</p>

//                   {!item.prestadoContas && (
//                     <div className={`flex items-center gap-1.5 text-xs font-medium p-1.5 rounded-md mb-3 ${timer.urgente ? "bg-destructive/10 text-destructive animate-pulse" : "bg-amber-500/10 text-amber-500"}`}>
//                       <Clock3 className="h-3.5 w-3.5" />
//                       <span>Prestação: {timer.texto}</span>
//                     </div>
//                   )}

//                   <div className="pt-2 border-t border-border/50 flex items-center justify-between">
//                     <div>
//                       <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor Cobrado</p>
//                       <p className="font-display font-bold text-sm">R$ {item.valorCobrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
//                     </div>
//                     <div className="text-right">
//                       <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Seu Ganho (10%)</p>
//                       <p className="font-display font-bold text-sm text-success">R$ {item.comissao.toFixed(2)}</p>
//                     </div>
//                   </div>

//                   <div className="mt-4 flex gap-2">
//                     <Button 
//                       variant="outline" 
//                       size="sm" 
//                       className={`flex-1 text-xs gap-1 h-9 ${item.prestadoContas ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" : "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"}`} 
//                       onClick={() => alternarPrestacaoContas(item.id)}
//                     >
//                       {item.prestadoContas ? "Reabrir Lançamento" : "Confirmar Acerto"}
//                     </Button>
//                     <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => excluir(item.id, true)}>
//                       <Trash2 className="h-4 w-4" />
//                     </Button>
//                   </div>
//                 </Card>
//               );
//             }
//           })}
//         </div>
//       )}

//       {/* FIXED BULK BAR */}
//       {selecionados.length > 0 && (
//         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover/95 border border-border px-6 py-4 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 z-50 backdrop-blur-md animate-in slide-in-from-bottom-5 w-[90%] max-w-2xl">
//           <div className="text-sm font-medium text-center sm:text-left">
//             <span className="bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded mr-2">{selecionados.length}</span>
//             {selecionados.length === 1 ? "encomenda selecionada" : "encomendas selecionadas"}
//           </div>
//           <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
//             <Select disabled={executandoEmMassa} onValueChange={(v) => atualizarStatusEmMassa(v as Status)}>
//               <SelectTrigger className="h-10 text-xs w-full sm:w-[180px] bg-background"><SelectValue placeholder="Alterar status para..." /></SelectTrigger>
//               <SelectContent>{STATUS_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
//             </Select>
//             <Button variant="destructive" size="icon" className="h-10 w-10 shrink-0" onClick={excluirEmMassa} disabled={executandoEmMassa}>
//               {executandoEmMassa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
//             </Button>
//             <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setSelecionados([])} disabled={executandoEmMassa}>Cancelar</Button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Package, Search, Send, Inbox, Target, Trash2, Plus, Loader2, MapPin, Clock3, User, Phone, Download, FileText, CheckSquare, Square, Truck, Briefcase, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sendText } from "@/utils/sendZapApi";

// === IMPORTAÇÃO DO SEU SERVIÇO DE WHATSAPP ===
// === TIPAGENS E INTERFACES ===
type Tipo = "enviada" | "recebida";
type Status = "pendente" | "em_transito" | "chegando" | "recebida" | "entregue" | "cancelada";

interface Entrega {
  id: string;
  codigo: string;
  cliente: string;
  telefone: string | null;
  origem: string | null;
  destino: string | null;
  tipo: Tipo;
  status: Status;
  valor: number;
  comissao: number;
  responsavel: string | null;
  previsao: string | null;
  observacoes: string | null;
  data_operacao: string;
  created_at: string;
}

interface ExcessoBagagem {
  id: string;
  passageiro: string;
  descricaoBens: string;
  valorCobrado: number;
  comissao: number;
  prestadoContas: boolean;
  created_at: string;
}

function isEntrega(item: Entrega | ExcessoBagagem): item is Entrega {
  return (item as Entrega).codigo !== undefined;
}

// === CONFIGURAÇÕES GLOBAIS ===
const META_MES = 100;
const META_EXCESSO = 100;
const WHATSAPP_DESTINO = "557791157974";

const STATUS_OPTS: { value: Status; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "em_transito", label: "Em trânsito" },
  { value: "chegando", label: "Chegando" },
  { value: "recebida", label: "Recebida" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelada", label: "Cancelada" },
];

const statusBadge = (s: Status) => {
  const map: Record<Status, string> = {
    pendente: "bg-muted text-muted-foreground",
    em_transito: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    chegando: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    recebida: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    entregue: "bg-success/15 text-success border-success/30",
    cancelada: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return map[s] || map.pendente;
};

export default function Entregas() {
  const [lista, setLista] = useState<Entrega[]>([]);
  const [listaExcesso, setListaExcesso] = useState<ExcessoBagagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  
  // FILTROS
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | Tipo | "excesso">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | Status>("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"mes" | "tudo">("mes");
  
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("entrega");

  // FORM STATES (ENTREGAS)
  const [codigo, setCodigo] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [tipo, setTipo] = useState<Tipo>("enviada");
  const [valor, setValor] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [previsao, setPrevisao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // FORM STATES (EXCESSO)
  const [passageiro, setPassageiro] = useState("");
  const [descricaoBens, setDescricaoBens] = useState("");
  const [valorExcesso, setValorExcesso] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [executandoEmMassa, setExecutandoEmMassa] = useState(false);
  const [enviandoWhats, setEnviandoWhats] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("entregas")
      .select("*")
      .order("data_operacao", { ascending: false })
      .order("created_at", { ascending: false });
    
    if (error) {
      toast({ title: "Erro ao carregar entregas", description: error.message, variant: "destructive" });
    } else {
      setLista((data ?? []) as Entrega[]);
    }

    const localExcesso = localStorage.getItem("rapihub_excessos");
    if (localExcesso) {
      setListaExcesso(JSON.parse(localExcesso));
    }

    setLoading(false);
    setSelecionados([]);
  };

  useEffect(() => { carregar(); }, []);

  const resetForm = () => {
    setCodigo(""); setCliente(""); setTelefone(""); setOrigem(""); setDestino("");
    setTipo("enviada"); setValor(""); setResponsavel(""); setPrevisao(""); setObservacoes("");
    setPassageiro(""); setDescricaoBens(""); setValorExcesso("");
  };

  const salvar = async () => {
    setSalvando(true);

    if (activeTab === "entrega") {
      if (!codigo.trim() || !cliente.trim()) {
        toast({ title: "Preencha código e cliente", variant: "destructive" });
        setSalvando(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("entregas").insert({
        codigo: codigo.trim(),
        cliente: cliente.trim(),
        telefone: telefone || null,
        origem: origem || null,
        destino: destino || null,
        tipo,
        valor: Number(valor) || 0,
        responsavel: responsavel || null,
        previsao: previsao || null,
        observacoes: observacoes || null,
        created_by: user?.id ?? null,
      });
      if (error) {
        toast({ title: "Erro ao salvar entrega", description: error.message, variant: "destructive" });
        setSalvando(false);
        return;
      }
      toast({ title: "Entrega registrada com sucesso!" });
    } else {
      if (!passageiro.trim() || !valorExcesso) {
        toast({ title: "Preencha o passageiro e o valor cobrado", variant: "destructive" });
        setSalvando(false);
        return;
      }

      const vExcesso = Number(valorExcesso) || 0;
      const novoExcesso: ExcessoBagagem = {
        id: crypto.randomUUID(),
        passageiro: passageiro.trim(),
        descricaoBens: descricaoBens.trim() || "Bagagem adicional",
        valorCobrado: vExcesso,
        comissao: vExcesso * 0.10, 
        prestadoContas: false,
        created_at: new Date().toISOString()
      };

      const novaLista = [novoExcesso, ...listaExcesso];
      setListaExcesso(novaLista);
      localStorage.setItem("rapihub_excessos", JSON.stringify(novaLista));
      toast({ title: "Excesso de bagagem registrado!" });
    }

    setSalvando(false);
    resetForm();
    setOpen(false);
    carregar();
  };

  const atualizarStatus = async (id: string, novo: Status) => {
    const { error } = await supabase.from("entregas").update({ status: novo }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setLista((prev) => prev.map((e) => (e.id === id ? { ...e, status: novo } : e)));
    toast({ title: "Status atualizado" });
  };

  const alternarPrestacaoContas = (id: string) => {
    const novaLista = listaExcesso.map(e => e.id === id ? { ...e, prestadoContas: !e.prestadoContas } : e);
    setListaExcesso(novaLista);
    localStorage.setItem("rapihub_excessos", JSON.stringify(novaLista));
    toast({ title: "Prestação de contas modificada" });
  };

  const excluir = async (id: string, isExcesso = false) => {
    if (!confirm("Excluir este registro permanentemente?")) return;
    
    if (isExcesso) {
      const novaLista = listaExcesso.filter(e => e.id !== id);
      setListaExcesso(novaLista);
      localStorage.setItem("rapihub_excessos", JSON.stringify(novaLista));
      setSelecionados((prev) => prev.filter((item) => item !== id));
      toast({ title: "Registro de excesso removido" });
    } else {
      const { error } = await supabase.from("entregas").delete().eq("id", id);
      if (error) {
        toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        return;
      }
      setLista((prev) => prev.filter((e) => e.id !== id));
      setSelecionados((prev) => prev.filter((item) => item !== id));
      toast({ title: "Entrega removida" });
    }
  };

  const handleSelecionarTodos = () => {
    if (selecionados.length === filtradas.length) {
      setSelecionados([]);
    } else {
      setSelecionados(filtradas.map(e => e.id));
    }
  };

  const handleSelecionarItem = (id: string) => {
    setSelecionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const atualizarStatusEmMassa = async (novoStatus: Status) => {
    if (selecionados.length === 0) return;
    
    // Filtra apenas as encomendas que estão selecionadas
    const encomendasSelecionadas = selecionados.filter(id => lista.some(e => e.id === id));
    
    if (encomendasSelecionadas.length === 0) {
      toast({ title: "Nenhuma encomenda válida selecionada para alteração de status", variant: "destructive" });
      return;
    }

    setExecutandoEmMassa(true);
    const { error } = await supabase.from("entregas").update({ status: novoStatus }).in("id", encomendasSelecionadas);
    setExecutandoEmMassa(false);

    if (error) {
      toast({ title: "Erro ao atualizar em massa", description: error.message, variant: "destructive" });
      return;
    }
    setLista(prev => prev.map(e => encomendasSelecionadas.includes(e.id) ? { ...e, status: novoStatus } : e));
    toast({ title: `${encomendasSelecionadas.length} encomendas atualizadas!` });
    setSelecionados([]);
  };

  const excluirEmMassa = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir as ${selecionados.length} movimentações selecionadas?`)) return;
    
    setExecutandoEmMassa(true);
    
    // Separa o que é encomenda do que é excesso de bagagem
    const encomendasParaDeletar = selecionados.filter(id => lista.some(e => e.id === id));
    const excessosParaDeletar = selecionados.filter(id => listaExcesso.some(e => e.id === id));

    if (encomendasParaDeletar.length > 0) {
      const { error } = await supabase.from("entregas").delete().in("id", encomendasParaDeletar);
      if (error) {
        toast({ title: "Erro ao excluir encomendas", description: error.message, variant: "destructive" });
        setExecutandoEmMassa(false);
        return;
      }
      setLista(prev => prev.filter(e => !encomendasParaDeletar.includes(e.id)));
    }

    if (excessosParaDeletar.length > 0) {
      const novaListaExcesso = listaExcesso.filter(e => !excessosParaDeletar.includes(e.id));
      setListaExcesso(novaListaExcesso);
      localStorage.setItem("rapihub_excessos", JSON.stringify(novaListaExcesso));
    }

    setExecutandoEmMassa(false);
    toast({ title: `${selecionados.length} itens excluídos com sucesso!` });
    setSelecionados([]);
  };

  const getTempoRestantePrestacao = (createdAtIso: string) => {
    const criacao = new Date(createdAtIso);
    const limite = new Date(criacao.getTime() + 24 * 60 * 60 * 1000);
    const diffMs = limite.getTime() - currentTime.getTime();
    
    if (diffMs <= 0) return { texto: "Prazo esgotado!", urgente: true };
    
    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { texto: `${horas}h ${minutos}m restantes`, urgente: horas < 4 };
  };

  const comissaoPreview = useMemo(() => {
    const v = Number(valor) || 0;
    return tipo === "enviada" ? v * 0.10 : 5;
  }, [valor, tipo]);

  const filtradas = useMemo(() => {
    const t = busca.toLowerCase();
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const entregasFiltradas = lista.filter((e) => {
      const matchTexto = !t || [e.codigo, e.cliente, e.origem, e.destino, e.responsavel].filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
      const matchTipo = filtroTipo === "todos" || e.tipo === filtroTipo;
      const matchStatus = filtroStatus === "todos" || e.status === filtroStatus;
      
      let matchPeriodo = true;
      if (filtroPeriodo === "mes") {
        const d = new Date(e.data_operacao);
        matchPeriodo = d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      }
      return matchTexto && matchTipo && matchStatus && matchPeriodo;
    });

    const excessosFiltrados = listaExcesso.filter((e) => {
      const matchTexto = !t || [e.passageiro, e.descricaoBens].filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
      const matchTipo = filtroTipo === "todos" || filtroTipo === "excesso";
      const matchStatus = filtroStatus === "todos"; 
      
      let matchPeriodo = true;
      if (filtroPeriodo === "mes") {
        const d = new Date(e.created_at);
        matchPeriodo = d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      }
      return matchTexto && matchTipo && matchStatus && matchPeriodo;
    });

    return [...entregasFiltradas, ...excessosFiltrados];
  }, [lista, listaExcesso, busca, filtroTipo, filtroStatus, filtroPeriodo]);

  const statsMensal = useMemo(() => {
    const hoje = new Date();
    const mes = hoje.getMonth(), ano = hoje.getFullYear();
    
    const doMes = lista.filter((e) => {
      const d = new Date(e.data_operacao);
      return d.getMonth() === mes && d.getFullYear() === ano;
    });

    const excessosDoMes = listaExcesso.filter((e) => {
      const d = new Date(e.created_at);
      return d.getMonth() === mes && d.getFullYear() === ano;
    });

    const enviadas = doMes.filter((e) => e.tipo === "enviada");
    const recebidas = doMes.filter((e) => e.tipo === "recebida");
    const praChegar = doMes.filter((e) => e.status === "chegando");
    
    const comEnv = enviadas.reduce((s, e) => s + Number(e.comissao || 0), 0);
    const comRec = recebidas.reduce((s, e) => s + Number(e.comissao || 0), 0);
    const totalEntregas = comEnv + comRec;

    const totalExcessoComissao = excessosDoMes.reduce((s, e) => s + Number(e.comissao || 0), 0);
    const totalExcessoBruto = excessosDoMes.reduce((s, e) => s + Number(e.valorCobrado || 0), 0);
    const pendentesPrestacaoContas = excessosDoMes.filter(e => !e.prestadoContas).length;

    return {
      enviadas: enviadas.length,
      recebidas: recebidas.length,
      praChegar: praChegar.length,
      totalEntregas,
      progressoEntregas: Math.min(100, (totalEntregas / META_MES) * 100),
      faltamEntregas: Math.max(0, META_MES - totalEntregas),
      
      totalExcessoComissao,
      totalExcessoBruto,
      pendentesPrestacaoContas,
      progressoExcesso: Math.min(100, (totalExcessoComissao / META_EXCESSO) * 100),
      faltamExcesso: Math.max(0, META_EXCESSO - totalExcessoComissao),
    };
  }, [lista, listaExcesso]);

  // DEFINE OS ITENS ALVO DE ACORDO COM A SELEÇÃO ATUAL DO USUÁRIO
  const itensParaExportar = useMemo(() => {
    if (selecionados.length > 0) {
      return filtradas.filter(item => selecionados.includes(item.id));
    }
    return filtradas;
  }, [filtradas, selecionados]);

  const resumoRelatorio = useMemo(() => {
    let totalValor = 0;
    let totalComissao = 0;
    let praChegarFiltrados = 0;
    let qtdExcessos = 0;

    itensParaExportar.forEach(item => {
      if (isEntrega(item)) {
        totalValor += Number(item.valor || 0);
        totalComissao += Number(item.comissao || 0);
        if (item.status === "chegando") praChegarFiltrados++;
      } else {
        totalValor += Number(item.valorCobrado || 0);
        totalComissao += Number(item.comissao || 0);
        qtdExcessos++;
      }
    });

    return {
      quantidade: itensParaExportar.length,
      totalValor,
      totalComissao,
      praChegarFiltrados,
      qtdExcessos,
      isFiltradoPorSelecao: selecionados.length > 0
    };
  }, [itensParaExportar, selecionados]);

  const enviarRelatorioWhatsApp = async () => {
    if (itensParaExportar.length === 0) {
      toast({ title: "Nenhum dado para enviar", variant: "destructive" });
      return;
    }
    setEnviandoWhats(true);

    const tipoRelatorio = resumoRelatorio.isFiltradoPorSelecao ? "SELECIONADO" : "CONSOLIDADO";
    let textoMsg = `*📋 RELATÓRIO ${tipoRelatorio} - NOVO HORIZONTE*\n`;
    textoMsg += `_Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}_\n\n`;
    
    textoMsg += `*📊 RESUMO DA SELEÇÃO:*\n`;
    textoMsg += `🔹 Total Itens: ${resumoRelatorio.quantidade}\n`;
    if (resumoRelatorio.praChegarFiltrados > 0) textoMsg += `📦 Encomendas Pra Chegar: ${resumoRelatorio.praChegarFiltrados}\n`;
    if (resumoRelatorio.qtdExcessos > 0) textoMsg += `🧳 Registros de Excesso: ${resumoRelatorio.qtdExcessos}\n`;
    textoMsg += `🔹 Bruto Movimentado: R$ ${resumoRelatorio.totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
    textoMsg += `💰 *Minha Comissão Geral: R$ ${resumoRelatorio.totalComissao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n\n`;
    
    textoMsg += `*📝 ITENS DETALHADOS:*\n`;
    textoMsg += `-------------------------------------------\n`;

    itensParaExportar.forEach((item, idx) => {
      if (isEntrega(item)) {
        const statusLabel = STATUS_OPTS.find(s => s.value === item.status)?.label || item.status;
        textoMsg += `${idx + 1}. *[ENCOMENDA]* Código: *${item.codigo}*\n`;
        textoMsg += `👤 Cliente: ${item.cliente}\n`;
        textoMsg += `📍 Rota: ${item.origem || "?"} ➔ ${item.destino || "?"}\n`;
        textoMsg += `⏰ Status: ${statusLabel} ${item.previsao ? `(${item.previsao})` : ""}\n`;
        textoMsg += `💵 Valor: R$ ${item.valor.toFixed(2)} | Comis: R$ ${item.comissao.toFixed(2)}\n`;
      } else {
        textoMsg += `${idx + 1}. *[EXCESSO BAGAGEM]* 🧳\n`;
        textoMsg += `👤 Passageiro: ${item.passageiro}\n`;
        textoMsg += `📝 Descrição: ${item.descricaoBens}\n`;
        textoMsg += `📢 Lançamento: ${item.prestadoContas ? "✅ Contas Prestadadas" : "❌ Pendente de Acerto"}\n`;
        textoMsg += `💵 Cobrado: R$ ${item.valorCobrado.toFixed(2)} | Comis (10%): R$ ${item.comissao.toFixed(2)}\n`;
      }
      textoMsg += `-------------------------------------------\n`;
    });

    try {
      await sendText({ number: WHATSAPP_DESTINO, text: textoMsg });
      toast({ title: resumoRelatorio.isFiltradoPorSelecao ? "Relatório dos selecionados enviado!" : "Relatório consolidado enviado!" });
      setSelecionados([]);
    } catch (error: any) {
      console.error("Erro WhatsApp:", error);
      toast({ title: "Erro ao enviar WhatsApp", description: "Falha na comunicação com o serviço de mensagens.", variant: "destructive" });
    } finally {
      setEnviandoWhats(false);
    }
  };

  const exportarCSV = () => {
    if (itensParaExportar.length === 0) {
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }
    const headers = ["Tipo Registro", "Identificador/Passageiro", "Detalhe/Cliente", "Status/Descricao", "Valor Bruto (R$)", "Comissao (R$)", "Data"];
    const rows = itensParaExportar.map(item => {
      if (isEntrega(item)) {
        return ["Encomenda", item.codigo, `"${item.cliente}"`, item.status, item.valor.toFixed(2), item.comissao.toFixed(2), new Date(item.data_operacao).toLocaleDateString("pt-BR")];
      } else {
        return ["Excesso Bagagem", `"${item.passageiro}"`, `"${item.descricaoBens}"`, item.prestadoContas ? "Prestado" : "Pendente", item.valorCobrado.toFixed(2), item.comissao.toFixed(2), new Date(item.created_at).toLocaleDateString("pt-BR")];
      }
    });
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sufixoArquivo = resumoRelatorio.isFiltradoPorSelecao ? "selecionados" : "geral";
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_${sufixoArquivo}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Relatório baixado com sucesso!" });
    setSelecionados([]);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-24 relative px-4 sm:px-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero border border-border p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/80 font-medium mb-2">Agência União de Negócios</p>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center gap-3">
              <Package className="h-7 w-7 text-primary" /> Painel de Controle Consolidado
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm">
              Gerencie Encomendas e Excessos de Bagagem Novo Horizonte. <span className="text-foreground font-medium">Prazo legal de 24h</span> para acerto de caixas extras.
            </p>
          </div>
          
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if(!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 px-5 gap-2 shrink-0"><Plus className="h-4 w-4" /> Registrar Operação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Registro Lançamento</DialogTitle></DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="entrega" className="gap-2"><Package className="h-4 w-4" /> Encomenda</TabsTrigger>
                  <TabsTrigger value="excesso" className="gap-2"><Briefcase className="h-4 w-4" /> Excesso Bagagem</TabsTrigger>
                </TabsList>
                
                <TabsContent value="entrega" className="space-y-3 mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Código *</Label>
                      <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ENC-1024" />
                    </div>
                    <div>
                      <Label>Tipo *</Label>
                      <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enviada">Enviada (10%)</SelectItem>
                          <SelectItem value="recebida">Recebida (R$ 5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Cliente *</Label>
                    <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Telefone</Label>
                      <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                    </div>
                    <div>
                      <Label>Responsável</Label>
                      <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Atendente / Agência" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Origem</Label>
                      <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Origem" />
                    </div>
                    <div>
                      <Label>Destino</Label>
                      <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Destino" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
                    </div>
                    <div>
                      <Label>Previsão</Label>
                      <Input value={previsao} onChange={(e) => setPrevisao(e.target.value)} placeholder="Hoje às 14:00" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 rounded-md bg-success/10 border border-success/30 text-xs">
                    <span className="text-success/80 font-semibold uppercase tracking-wider">Comissão Prevista</span>
                    <span className="font-display font-bold text-success">R$ {comissaoPreview.toFixed(2)}</span>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
                  </div>
                </TabsContent>
                
                <TabsContent value="excesso" className="space-y-3 mt-0">
                  <div>
                    <Label>Nome do Passageiro *</Label>
                    <Input value={passageiro} onChange={(e) => setPassageiro(e.target.value)} placeholder="Ex: Maria das Dores" />
                  </div>
                  <div>
                    <Label>Descrição da Bagagem</Label>
                    <Input value={descricaoBens} onChange={(e) => setDescricaoBens(e.target.value)} placeholder="Ex: Isopor Grande de Peixe / Caixa de Mudança" />
                  </div>
                  <div>
                    <Label>Valor Cobrado (R$) *</Label>
                    <Input type="number" step="0.01" value={valorExcesso} onChange={(e) => setValorExcesso(e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs">
                    <span className="text-amber-500 font-semibold uppercase tracking-wider">Sua Participação (10%)</span>
                    <span className="font-display font-bold text-amber-500">R$ {((Number(valorExcesso) || 0) * 0.10).toFixed(2)}</span>
                  </div>
                  <div className="flex items-start gap-2 bg-muted p-2.5 rounded-lg border border-border text-xs text-muted-foreground">
                    <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Lembrete: O prazo máximo regulamentar para conferência e prestação de contas desse valor é de 24 horas.</span>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={salvar} disabled={salvando}>
                  {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirmar Lançamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* BARRA DE SISTEMAS OPERACIONAIS NH */}
        <div className="mt-6 border-t border-border/40 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Sistemas Operacionais Novo Horizonte
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* EPASS */}
            <a
              href="http://epass.com.br/epass/vendas/pesquisa"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/40 transition-all group shadow-sm"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500/20 transition-colors shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  Epass <span className="text-xs font-normal text-muted-foreground group-hover:translate-x-0.5 transition-transform">→</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">Venda e pesquisa de passagens</p>
              </div>
            </a>

            {/* CENTRAL NH */}
            <a
              href="https://voyage-flow-henna.vercel.app/publico"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/40 transition-all group shadow-sm"
            >
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 transition-colors shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  Central NH <span className="text-xs font-normal text-muted-foreground group-hover:translate-x-0.5 transition-transform">→</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">Monitoramento de mapas e carros</p>
              </div>
            </a>

            {/* RPA */}
            <a
              href="https://voyage-flow-henna.vercel.app/publico"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/40 transition-all group shadow-sm"
            >
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500/20 transition-colors shrink-0">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  RPA <span className="text-xs font-normal text-muted-foreground group-hover:translate-x-0.5 transition-transform">→</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">Sistema oficial de encomendas</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* METAS QUADRO DUAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meta Encomendas */}
        <Card className="glass-card p-5 border-l-4 border-l-primary flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Meta Mensal Encomendas</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-success/15 text-success rounded">
                {statsMensal.totalEntregas >= META_MES ? "🎯 Batida!" : `${statsMensal.progressoEntregas.toFixed(0)}%`}
              </span>
            </div>
            <p className="font-display text-2xl font-bold">
              R$ {statsMensal.totalEntregas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              <span className="text-muted-foreground text-sm font-normal"> / R$ {META_MES.toFixed(2)}</span>
            </p>
          </div>
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-card-elevated overflow-hidden mb-1">
              <div className="h-full bg-primary transition-all" style={{ width: `${statsMensal.progressoEntregas}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {statsMensal.faltamEntregas > 0 ? `Faltam R$ ${statsMensal.faltamEntregas.toFixed(2)} para bater a meta.` : "Meta garantida no mês!"}
            </p>
          </div>
        </Card>

        {/* Meta Excesso */}
        <Card className="glass-card p-5 border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-amber-500" />
                <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Meta Lançamento Excesso</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500/15 text-amber-500 rounded">
                {statsMensal.totalExcessoComissao >= META_EXCESSO ? "🎯 Concluída!" : `${statsMensal.progressoExcesso.toFixed(0)}%`}
              </span>
            </div>
            <p className="font-display text-2xl font-bold text-amber-500">
              R$ {statsMensal.totalExcessoComissao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              <span className="text-muted-foreground text-sm font-normal"> / R$ {META_EXCESSO.toFixed(2)}</span>
            </p>
          </div>
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-card-elevated overflow-hidden mb-1">
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${statsMensal.progressoExcesso}%` }} />
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">
                {statsMensal.faltamExcesso > 0 ? `Faltam R$ ${statsMensal.faltamExcesso.toFixed(2)}` : "Meta batida com sucesso!"}
              </span>
              {statsMensal.pendentesPrestacaoContas > 0 && (
                <span className="text-destructive font-semibold flex items-center gap-1 animate-pulse">
                  <AlertCircle className="h-3 w-3" /> {statsMensal.pendentesPrestacaoContas} acertos pendentes
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* KPIs COMPLETO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-blue-500">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-blue-400" /> Total Encomendas
          </p>
          <p className="mt-2 font-display text-xl font-bold">{statsMensal.enviadas + statsMensal.recebidas} un</p>
          <p className="text-xs text-success mt-1">R$ {statsMensal.totalEntregas.toFixed(2)} acumulado</p>
        </Card>
        <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-amber-500 bg-amber-500/5">
          <p className="text-xs uppercase tracking-wide text-amber-500 flex items-center gap-1.5 font-semibold">
            <Truck className="h-3.5 w-3.5" /> Pra Chegar (Mês)
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-amber-500">{statsMensal.praChegar}</p>
        </Card>
        <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-orange-500">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-orange-400" /> Caixa Excesso
          </p>
          <p className="mt-2 font-display text-xl font-bold">R$ {statsMensal.totalExcessoBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-amber-500 font-medium">Ganho: R$ {statsMensal.totalExcessoComissao.toFixed(2)}</p>
        </Card>
        <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-success">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-success" /> Receita Líquida Total
          </p>
          <p className="mt-2 font-display text-xl font-bold text-success">R$ {(statsMensal.totalEntregas + statsMensal.totalExcessoComissao).toFixed(2)}</p>
        </Card>
      </div>

      {/* FILTROS E PESQUISAS DINÂMICAS */}
      <Card className="glass-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-2 gap-2">
          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4 text-primary" /> Filtros Dinâmicos & Exportações
            {filtradas.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleSelecionarTodos} className="h-7 text-xs text-primary gap-1 px-2 hover:bg-primary/5">
                {selecionados.length === filtradas.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                Selecionar Todos da Tela
              </Button>
            )}
          </div>
          {itensParaExportar.length > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md flex flex-wrap gap-x-3 gap-y-1">
              <span>{resumoRelatorio.isFiltradoPorSelecao ? "⚙️ Focando Selecionados:" : "🌍 Focando Lista Inteira:"} <span className="text-foreground font-bold">{resumoRelatorio.quantidade}</span></span>
              {resumoRelatorio.praChegarFiltrados > 0 && <span className="text-amber-500 font-medium">Pra Chegar: <span className="font-bold">{resumoRelatorio.praChegarFiltrados}</span></span>}
              {resumoRelatorio.qtdExcessos > 0 && <span className="text-orange-500 font-medium">Excessos: <span className="font-bold">{resumoRelatorio.qtdExcessos}</span></span>}
              <span>Movimentado: <span className="text-foreground font-bold">R$ {resumoRelatorio.totalValor.toLocaleString("pt-BR", {minimumFractionDigits: 2})}</span></span>
              <span>Comissão: <span className="text-success font-bold">R$ {resumoRelatorio.totalComissao.toLocaleString("pt-BR", {minimumFractionDigits: 2})}</span></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
            <Input className="pl-10 h-11" placeholder="Buscar por texto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>

          <Select value={filtroPeriodo} onValueChange={(v) => { setFiltroPeriodo(v as any); setSelecionados([]); }}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mês Atual</SelectItem>
              <SelectItem value="tudo">Histórico Completo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroTipo} onValueChange={(v) => { setFiltroTipo(v as any); setSelecionados([]); }}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Tipo Registro" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Registros</SelectItem>
              <SelectItem value="enviada">Encomendas Enviadas</SelectItem>
              <SelectItem value="recebida">Encomendas Recebidas</SelectItem>
              <SelectItem value="excesso">Apenas Excesso Bagagem</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroStatus} onValueChange={(v) => { setFiltroStatus(v as any); setSelecionados([]); }}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Status Encomenda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="secondary" onClick={exportarCSV} className="h-11 w-full gap-2 border" disabled={itensParaExportar.length === 0}>
            <Download className="h-4 w-4" /> {resumoRelatorio.isFiltradoPorSelecao ? `Exportar (${selecionados.length})` : "Exportar Tudo"}
          </Button>

          <Button variant="default" onClick={enviarRelatorioWhatsApp} className="h-11 w-full bg-green-600 hover:bg-green-700 text-white gap-2 font-medium" disabled={itensParaExportar.length === 0 || enviandoWhats}>
            {enviandoWhats ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {resumoRelatorio.isFiltradoPorSelecao ? `Enviar Zap (${selecionados.length})` : "Enviar Zap Tudo"}
          </Button>
        </div>
      </Card>

      {/* LISTAGEM UNIFICADA CARDS */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtradas.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Nenhum registro corresponde aos critérios de pesquisa definidos.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((item) => {
            const isChecked = selecionados.includes(item.id);
            if (isEntrega(item)) {
              return (
                <Card key={item.id} className={`glass-card p-5 hover:border-primary/40 transition-all border-l-4 relative group ${isChecked ? "ring-2 ring-primary border-primary bg-primary/5" : item.tipo === "enviada" ? "border-l-blue-500" : "border-l-purple-500"}`}>
                  <div className="absolute top-4 right-4 z-10 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-background/80 p-1 rounded backdrop-blur-sm">
                    <Checkbox checked={isChecked} onCheckedChange={() => handleSelecionarItem(item.id)} className="h-5 w-5 data-[state=checked]:bg-primary" />
                  </div>
                  <div className="flex items-start justify-between gap-3 mb-3 pr-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-base">{item.codigo}</h3>
                        <Badge variant="outline" className={item.tipo === "enviada" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "bg-purple-500/15 text-purple-400 border-purple-500/30"}>
                          {item.tipo === "enviada" ? <><Send className="h-3 w-3 mr-1" /> Enviada</> : <><Inbox className="h-3 w-3 mr-1" /> Recebida</>}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">{item.cliente}</p>
                    </div>
                    <Badge variant="outline" className={statusBadge(item.status)}>{STATUS_OPTS.find((s) => s.value === item.status)?.label}</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {(item.origem || item.destino) && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{item.origem || "?"} → {item.destino || "?"}</span></div>}
                    {item.previsao && <div className="flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" /><span>{item.previsao}</span></div>}
                    {item.responsavel && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" /><span className="truncate">{item.responsavel}</span></div>}
                    {item.telefone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span>{item.telefone}</span></div>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor Bruto</p>
                      <p className="font-display font-bold text-sm">R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Comissão</p>
                      <p className="font-display font-bold text-sm text-success">R$ {item.comissao.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Select value={item.status} onValueChange={(v) => atualizarStatus(item.id, v as Status)}>
                      <SelectTrigger className="h-9 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => excluir(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            } else {
              const timer = getTempoRestantePrestacao(item.created_at);
              return (
                <Card key={item.id} className={`glass-card p-5 hover:border-amber-500/40 transition-all border-l-4 relative group ${isChecked ? "ring-2 ring-amber-500 border-amber-500 bg-amber-500/5" : item.prestadoContas ? "border-l-emerald-500 bg-emerald-500/5" : "border-l-amber-500 bg-amber-500/5"}`}>
                  <div className="absolute top-4 right-4 z-10 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-background/80 p-1 rounded backdrop-blur-sm">
                    <Checkbox checked={isChecked} onCheckedChange={() => handleSelecionarItem(item.id)} className="h-5 w-5 data-[state=checked]:bg-amber-500" />
                  </div>
                  <div className="flex items-start justify-between gap-3 mb-2 pr-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Excesso Bagagem</span>
                      </div>
                      <h3 className="font-display font-bold text-base mt-1 truncate">{item.passageiro}</h3>
                    </div>
                    <Badge variant="outline" className={item.prestadoContas ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}>
                      {item.prestadoContas ? "Contas Prestadas" : "Pendente Acerto"}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 italic mb-3">"{item.descricaoBens}"</p>

                  {!item.prestadoContas && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium p-1.5 rounded-md mb-3 ${timer.urgente ? "bg-destructive/10 text-destructive animate-pulse" : "bg-amber-500/10 text-amber-500"}`}>
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>Prestação: {timer.texto}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor Cobrado</p>
                      <p className="font-display font-bold text-sm">R$ {item.valorCobrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Seu Ganho (10%)</p>
                      <p className="font-display font-bold text-sm text-success">R$ {item.comissao.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`flex-1 text-xs gap-1 h-9 ${item.prestadoContas ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" : "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"}`} 
                      onClick={() => alternarPrestacaoContas(item.id)}
                    >
                      {item.prestadoContas ? "Reabrir Lançamento" : "Confirmar Acerto"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => excluir(item.id, true)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            }
          })}
        </div>
      )}

      {/* FIXED BULK BAR */}
      {selecionados.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover/95 border border-border px-6 py-4 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 z-50 backdrop-blur-md animate-in slide-in-from-bottom-5 w-[90%] max-w-2xl">
          <div className="text-sm font-medium text-center sm:text-left">
            <span className="bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded mr-2">{selecionados.length}</span>
            {selecionados.length === 1 ? "item selecionado" : "itens selecionados"}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <Select disabled={executandoEmMassa} onValueChange={(v) => atualizarStatusEmMassa(v as Status)}>
              <SelectTrigger className="h-10 text-xs w-full sm:w-[180px] bg-background"><SelectValue placeholder="Mudar status Encomendas..." /></SelectTrigger>
              <SelectContent>{STATUS_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="destructive" size="icon" className="h-10 w-10 shrink-0" onClick={excluirEmMassa} disabled={executandoEmMassa}>
              {executandoEmMassa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setSelecionados([])} disabled={executandoEmMassa}>Limpar</Button>
          </div>
        </div>
      )}
    </div>
  );
}