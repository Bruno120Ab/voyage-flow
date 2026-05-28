import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Bus, MapPin, Clock, Search, RotateCcw, Plus, Package, User, CheckCircle2, AlertCircle, Copy, Trash2, ArrowRight, ArrowDownRight, ArrowUpRight, MapPinned } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";
import { solicitarLocalizacao } from "@/utils/cco";
import { sendText } from "@/utils/sendZapApi";

type EmbarqueDia = Database["public"]["Tables"]["embarques_dia"]["Row"];

export default function PaginaEmbarques() {
  const [embarques, setEmbarques] = useState<EmbarqueDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [embarqueSelecionado, setEmbarqueSelecionado] = useState<EmbarqueDia | null>(null);
  const [busca, setBusca] = useState("");
  const [veiculos, setVeiculos] = useState<{placa: string, modelo: string}[]>([]);
const [grupoDestino, setGrupoDestino] =
  useState<"porto" | "ilheus">("porto");
  const [confirmarQuebraOpen, setConfirmarQuebraOpen] =
  useState(false);

const [enviandoQuebra, setEnviandoQuebra] =
  useState(false);
  const agora = new Date();

  const [form, setForm] = useState({
    horaReal: "",
    carro: "",
    motorista: "",
    encomenda: "",
    observacao: "",
  });

  const [formServico, setFormServico] = useState({
    servico: "",
    cidadeOrigem: "",
    cidadeDestino: "",
    horaSaidaPrevista: "",
    horaSaidaReal: "",
    carro: "",
    prioridade: "Normal" as "Normal" | "Alta" | "Baixa",
    sentido: "nenhum" as "descida" | "subida" | "nenhum",
  });
  const [idEditando, setIdEditando] = useState<string | null>(null);

  // ---- LOAD ----
  const carregar = async () => {
    const { data, error } = await supabase
      .from("embarques_dia")
      .select("*")
      .order("data_operacao", { ascending: false })
      .order("hora_saida_prevista", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar embarques", description: error.message, variant: "destructive" });
    } else {
      setEmbarques((data ?? []) as EmbarqueDia[]);
    }
    
    const { data: vData } = await supabase.from("veiculos").select("placa, modelo").order("placa");
    if (vData) setVeiculos(vData);
    
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    const channel = supabase
      .channel("embarques-dia")
      .on("postgres_changes", { event: "*", schema: "public", table: "embarques_dia" }, carregar)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ---- AÇÕES ----
  const resetarEmbarquesDoDia = async () => {
    if (!confirm("Reiniciar todos os embarques do dia? Isso marca tudo como pendente novamente.")) return;
    const ids = embarques.map(e => e.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("embarques_dia")
      .update({ passou: false, status: "pendente", hora_real: "", carro: "--", motorista: "", encomenda: "", observacao: "" })
      .in("id", ids);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dia reiniciado" });
      carregar();
    }
  };

  const calcularPrevisao = (cidadeOrigem: string, horaStr: string) => {
    if (!cidadeOrigem || !horaStr) return "";
    const tempos: Record<string, number> = {
      "Vitória da Conquista": 60,
      VCA: 60,
      Itapetinga: 45,
      Itambé: 0,
    };
    const minutosAdicionar = tempos[cidadeOrigem] ?? 60;
    const [hora, minuto] = horaStr.split(":").map(Number);
    if (isNaN(hora) || isNaN(minuto)) return "";
    const data = new Date();
    data.setHours(hora);
    data.setMinutes(minuto + minutosAdicionar);
    return `${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;
  };

  const abrirModalNovo = () => {
    setIdEditando(null);
    setFormServico({ servico: "", cidadeOrigem: "", cidadeDestino: "", horaSaidaPrevista: "", horaSaidaReal: "", carro: "--", prioridade: "Normal", sentido: "nenhum" });
    setNovoModalOpen(true);
  };

  const abrirModalEditar = (item: EmbarqueDia) => {
    setIdEditando(item.id);
    setFormServico({
      servico: item.servico || "",
      cidadeOrigem: item.cidade_origem || "",
      cidadeDestino: item.cidade_destino || "",
      horaSaidaPrevista: item.hora_saida_prevista || "",
      horaSaidaReal: item.hora_saida_real || "",
      carro: item.carro || "--",
      prioridade: (item.prioridade as any) || "Normal",
      sentido: ((item as any).sentido as any) || "nenhum",
    });
    setNovoModalOpen(true);
  };

  const abrirModal = (item: EmbarqueDia) => {
    setEmbarqueSelecionado(item);
    setForm({
      horaReal: item.hora_real || "",
      carro: item.carro && item.carro !== "--" ? item.carro : "",
      motorista: item.motorista || "",
      encomenda: item.encomenda || "",
      observacao: item.observacao || "",
    });
    setModalOpen(true);
  };

  const parseTimeMin = (hora: string | null) => {
    if (!hora || typeof hora !== "string") return null;
    const horaFormatada = hora.slice(0, 5);
    if (!horaFormatada.includes(":")) return null;
    const [h, m] = horaFormatada.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();

  const getStatusHorario = (horaSaidaPrevista: string | null, passou: boolean) => {
    const itemMin = parseTimeMin(horaSaidaPrevista);
    if (itemMin === null) return "normal";
    const diff = itemMin - agoraMin;
    if (diff < 0 && !passou) return "atrasado";
    if (diff <= 15 && diff >= -10 && !passou) return "iminente";
    return "normal";
  };
  const grupos = {
    porto: "120363022584191223@g.us",
    ilheus: "120363039500978573@g.us",
  };
    // const confirmarEmbarque = async () => {
    //   if (!embarqueSelecionado) return;
    //   const { error } = await supabase
    //     .from("embarques_dia")
    //     .update({
    //       passou: true,
    //       status: "concluido",
    //       hora_real: form.horaReal,
    //       carro: form.carro || "--",
    //       motorista: form.motorista,
    //       encomenda: form.encomenda,
    //       observacao: form.observacao,
    //     })
    //     .eq("id", embarqueSelecionado.id);
    //   if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    //   else {
    //     toast({ title: "Embarque confirmado" });
    //     setModalOpen(false);
    //     carregar();
    //   }
    // };
  const confirmarEmbarque = async (
    enviarGrupo = false,
    grupo?: "porto" | "ilheus"
  ) => {
    if (!embarqueSelecionado) return;

    const payload = {
      passou: true,
      status: "concluido",
      hora_real: form.horaReal,
      carro: form.carro || "--",
      motorista: form.motorista,
      encomenda: form.encomenda,
      observacao: form.observacao,
    };

    const { error } = await supabase
      .from("embarques_dia")
      .update(payload)
      .eq("id", embarqueSelecionado.id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });

      return;
    }

    // ENVIO OPCIONAL
    if (enviarGrupo) {
      try {
      const texto = `
  🛣️ *LINHA ${embarqueSelecionado.rota?.toUpperCase()}*
     Hora em sistema: ${embarqueSelecionado.hora_saida_prevista || "--"}

  🔢*Serviço:* #${embarqueSelecionado.servico}
  🚌*Carro:* ${form.carro || "--"}
  👨‍✈️*Motorista:* ${form.motorista || "--"}

  ⏰Saindo de Itambe as: ${form.horaReal || "--"}                                         
  *PONTO DE APOIO DE ITAMBÉ-BA*                                                                                                                                                                                             

  ${
    form.encomenda?.trim()
      ? `📦 *Encomendas:*
  ${form.encomenda}

  `
      : ""
  }${
    form.observacao?.trim()
      ? `📝 *Observações:*
  ${form.observacao}`
      : ""
  }
  `.trim();

        await sendText({
    number: grupos[grupo || "porto"],
    text: texto,
  });

        toast({
          title: "Check-in salvo e enviado",
        });

      } catch (err) {
        console.error(err);

        toast({
          title: "Check-in salvo",
          description: "Falha ao enviar grupo",
        });
      }
    } else {
      toast({
        title: "Check-in salvo",
      });
    }

    setModalOpen(false);

    carregar();
  };
  const informarCarroQuebrado = async () => {
  if (!embarqueSelecionado) return;

  try {
    const sentido = (embarqueSelecionado as any).sentido;

    const CCO = "120363409669761672@g.us";

    const SETOR_PORTO =
      "120363409669761672@g.us";

    const SETOR_ILHEUS =
      "120363409669761672@g.us";

    const agencias: Record<string, string> = {
      "Porto Seguro": "120363409669761672@g.us",
      "Ilhéus": "120363409669761672@g.us",
      "Itapetinga": "120363409669761672@g.us",
    };

    const agencia =
      agencias[
        embarqueSelecionado.cidade_destino || ""
      ];

    const grupoSetor =
      sentido === "descida"
        ? SETOR_PORTO
        : SETOR_ILHEUS;

    const destinos = [
      CCO,
      grupoSetor,
      agencia,
    ].filter(Boolean);

    const texto = `
🚨 *CARRO QUEBRADO*

🚌 ${embarqueSelecionado.rota}

🔢 Serviço #${embarqueSelecionado.servico}

🚐 Carro:
${form.carro || "--"}

👨‍✈️ Motorista:
${form.motorista || "--"}

🕒 Hora:
${form.horaReal || "--"}

${
form.observacao?.trim()
? `📝 ${form.observacao}`
: ""
}
`.trim();

    await Promise.all(
      destinos.map((numero) =>
        sendText({
          number: numero,
          text: texto,
        })
      )
    );

    toast({
      title: "Aviso enviado",
      description:
        "CCO, setor e agência notificados",
    });

  } catch (err) {
    console.error(err);

    toast({
      title: "Falha ao enviar aviso",
      variant: "destructive",
    });
  }
};
  const excluirServico = async (id: string) => {
    if (!confirm("Excluir este embarque?")) return;
    const { error } = await supabase.from("embarques_dia").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      carregar();
    }
  };

  const salvarServico = async () => {
    if (!formServico.servico || !formServico.cidadeOrigem || !formServico.cidadeDestino) {
      toast({ title: "Preencha serviço, origem e destino", variant: "destructive" });
      return;
    }
    const previsao = calcularPrevisao(formServico.cidadeOrigem, formServico.horaSaidaReal || formServico.horaSaidaPrevista);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (idEditando) {
      const { error } = await supabase.from("embarques_dia").update({
        servico: formServico.servico,
        rota: `${formServico.cidadeOrigem} → ${formServico.cidadeDestino}`,
        cidade_origem: formServico.cidadeOrigem,
        cidade_destino: formServico.cidadeDestino,
        hora_saida_prevista: formServico.horaSaidaPrevista,
        hora_saida_real: formServico.horaSaidaReal,
        carro: formServico.carro && formServico.carro !== "--" ? formServico.carro : "--",
        previsao_chegada: previsao,
        sentido: formServico.sentido,
      } as any).eq("id", idEditando);
      
      if (error) toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Serviço atualizado" });
        setNovoModalOpen(false);
        carregar();
      }
    } else {
      const hojeOperacao = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("embarques_dia").insert({
        servico: formServico.servico,
        rota: `${formServico.cidadeOrigem} → ${formServico.cidadeDestino}`,
        cidade_origem: formServico.cidadeOrigem,
        cidade_destino: formServico.cidadeDestino,
        hora_saida_prevista: formServico.horaSaidaPrevista,
        hora_saida_real: formServico.horaSaidaReal,
        carro: formServico.carro && formServico.carro !== "--" ? formServico.carro : "--",
        previsao_chegada: previsao,
        prioridade: formServico.prioridade,
        data_operacao: hojeOperacao,
        created_by: user?.id ?? null,
        sentido: formServico.sentido,
      } as any);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        return;
      }
      setNovoModalOpen(false);
      toast({ title: "Embarque criado" });
      carregar();
    }
  };

  const copymsg = (item: EmbarqueDia) => {
    const mensagem = `✅ EMBARQUE CONCLUÍDO\n\n🚌 Serviço: #${item.servico}\n📍 Rota: ${item.rota}\n\n🕐 Horário de sistema: ${item.hora_saida_prevista || "--"}\n📢 Aviso oficial da rodoviária: ${item.previsao_chegada || "--"}\n\n✅ Hora real de chegada: ${item.hora_real || "--"}\n🚐 Número do carro: ${item.carro || "--"}\n👨‍✈️ Motorista: ${item.motorista || "--"}\n📦 Encomenda: ${item.encomenda || "--"}\n📝 Observação: ${item.observacao || "--"}\n\nTudo ocorreu corretamente e sem intercorrências.`;
    navigator.clipboard.writeText(mensagem);
    toast({ title: "Relatório copiado para a área de transferência" });
  };

  const total = embarques.length;
  const concluidos = embarques.filter((i) => i.passou).length;
  const pendentes = total - concluidos;

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroSentido, setFiltroSentido] = useState<"todos" | "descida" | "subida">("todos");

  const embarquesFiltrados = useMemo(() => {
    const horaAtualMinutos = agora.getHours() * 60 + agora.getMinutes();
    const filtrados = embarques.filter((item) => {
      const matchBusca =
        item.servico?.toLowerCase().includes(busca.toLowerCase()) ||
        item.rota?.toLowerCase().includes(busca.toLowerCase());
      if (!matchBusca) return false;

      const sentidoItem = ((item as any).sentido as string) || "nenhum";
      if (filtroSentido !== "todos" && sentidoItem !== filtroSentido) return false;

      const horaItem = item.hora_saida_prevista || item.previsao_chegada || "";
      const horaItemMinutos = parseTimeMin(horaItem) ?? 0;

      if (filtroStatus === "pendentes") return !item.passou;
      if (filtroStatus === "concluidos") return item.passou;
      if (filtroStatus === "faltamHoje")
        return !item.passou && horaItemMinutos >= horaAtualMinutos;
      return true;
    });

    return filtrados.sort((a, b) => {
      const aMin = parseTimeMin(a.hora_saida_prevista || a.previsao_chegada) ?? 0;
      const bMin = parseTimeMin(b.hora_saida_prevista || b.previsao_chegada) ?? 0;
      return aMin - bMin;
    });
  }, [embarques, busca, filtroStatus, filtroSentido]);

  const calcularTempoRestante = (hora: string | null, passou: boolean) => {
    if (!hora || passou) return "Finalizado";
    const itemMin = parseTimeMin(hora);
    if (itemMin === null) return "--";
    const atualMin = agora.getHours() * 60 + agora.getMinutes();
    const diff = itemMin - atualMin;
    if (diff < 0) return "Atrasado";
    const horas = Math.floor(diff / 60);
    const minutos = diff % 60;
    if (horas > 0) return `Em ${horas}h ${minutos}min`;
    return `Em ${minutos}min`;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Operação</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Monitor de Frotas</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestão inteligente das saídas diárias, status de carros e check-ins.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <Button variant="outline" className="border-border hover:border-primary/40 hover:bg-primary/5 transition-all flex-1 sm:flex-none" onClick={resetarEmbarquesDoDia}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reiniciar Dia
          </Button>
          <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow flex-1 sm:flex-none" onClick={abrirModalNovo}>
            <Plus className="w-4 h-4 mr-2" /> Novo Serviço
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="glass-card p-4 sm:p-5 border-t-4 border-t-primary">
          <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Total do Dia</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold">{total}</h2>
        </Card>
        <Card className="glass-card p-4 sm:p-5 border-t-4 border-t-success">
          <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Check-in Concluído</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-success">{concluidos}</h2>
        </Card>
        <Card className="glass-card p-4 sm:p-5 border-t-4 border-t-warning">
          <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Aguardando Saída</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-warning">{pendentes}</h2>
        </Card>
      </div>

      <div className="bg-card-elevated/50 p-2 rounded-xl flex flex-col md:flex-row gap-2 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-background/50 border-transparent focus-visible:border-primary transition-colors w-full h-10 rounded-lg"
            placeholder="Buscar por número do serviço ou destino..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1 w-full md:w-auto p-1 bg-background/30 rounded-lg">
          <Button size="sm" variant={filtroStatus === "todos" ? "secondary" : "ghost"} className="text-xs rounded-md flex-1 md:flex-none" onClick={() => setFiltroStatus("todos")}>Todos</Button>
          <Button size="sm" variant={filtroStatus === "pendentes" ? "secondary" : "ghost"} className="text-xs rounded-md flex-1 md:flex-none" onClick={() => setFiltroStatus("pendentes")}>Pendentes</Button>
          <Button size="sm" variant={filtroStatus === "concluidos" ? "secondary" : "ghost"} className="text-xs rounded-md flex-1 md:flex-none" onClick={() => setFiltroStatus("concluidos")}>Concluídos</Button>
          <Button size="sm" variant={filtroStatus === "faltamHoje" ? "secondary" : "ghost"} className="text-xs rounded-md flex-1 md:flex-none" onClick={() => setFiltroStatus("faltamHoje")}>Faltam Hoje</Button>
        </div>
        <div className="flex flex-wrap gap-1 w-full md:w-auto p-1 bg-background/30 rounded-lg">
          <Button size="sm" variant={filtroSentido === "todos" ? "secondary" : "ghost"} className="text-xs rounded-md flex-1 md:flex-none" onClick={() => setFiltroSentido("todos")}>Todos sentidos</Button>
          <Button size="sm" variant={filtroSentido === "descida" ? "secondary" : "ghost"} className="text-xs rounded-md gap-1 flex-1 md:flex-none" onClick={() => setFiltroSentido("descida")}>
            <ArrowDownRight className="h-3 w-3 text-primary" /> Descendo
          </Button>
          <Button size="sm" variant={filtroSentido === "subida" ? "secondary" : "ghost"} className="text-xs rounded-md gap-1 flex-1 md:flex-none" onClick={() => setFiltroSentido("subida")}>
            <ArrowUpRight className="h-3 w-3 text-warning" /> Subindo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : embarquesFiltrados.length === 0 ? (
        <Card className="glass-card p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
          <Bus className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-display font-semibold text-foreground">Nenhuma viagem encontrada</h3>
          <p className="text-sm">Altere os filtros ou adicione novos serviços para hoje.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {embarquesFiltrados.map((item) => {
            const statusHorario = getStatusHorario(item.hora_saida_prevista, item.passou);
            const isWarning = statusHorario === "iminente" || statusHorario === "atrasado";
            
            let statusColor = "bg-secondary text-secondary-foreground border-transparent";
            let statusText = "Agendado";
            let StatusIcon = Clock;

            if (item.passou) {
              statusColor = "bg-success/10 text-success border-success/30";
              statusText = "Concluído";
              StatusIcon = CheckCircle2;
            } else if (statusHorario === "atrasado") {
              statusColor = "bg-destructive/10 text-destructive border-destructive/30";
              statusText = "Atrasado";
              StatusIcon = AlertCircle;
            } else if (statusHorario === "iminente") {
              statusColor = "bg-warning/10 text-warning border-warning/30";
              statusText = "Embarcando";
              StatusIcon = AlertCircle;
            }

            const [origem, destino] = item.rota.includes('→') ? item.rota.split('→').map(s => s.trim()) : [item.cidade_origem || 'Origem', item.cidade_destino || 'Destino'];

            return (
              <Card 
                key={item.id} 
                className={`glass-card overflow-hidden flex flex-col lg:flex-row transition-all hover:border-primary/40 group ${isWarning && !item.passou ? (statusHorario === "atrasado" ? "border-destructive/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-warning/40") : ""}`}
              >
                {/* Timeline Section */}
                <div className={`p-6 flex lg:flex-col justify-between items-center lg:items-start lg:w-56 lg:border-r border-border/50 shrink-0 ${!item.passou && isWarning ? (statusHorario === 'atrasado' ? 'bg-destructive/5' : 'bg-warning/5') : 'bg-card-elevated/20'}`}>
                  <div className="flex flex-col text-center lg:text-left">
                    <p className="text-xs uppercase font-semibold text-muted-foreground mb-1 tracking-wider">Partida</p>
                    <h3 className="font-display text-2xl font-bold">{item.hora_saida_prevista || "--"}</h3>
                    <p className="text-sm font-medium text-foreground/80">{origem}</p>
                  </div>
                  
                  <div className="hidden lg:flex flex-col items-center my-3 mx-4 self-center opacity-30">
                    <div className="w-1 h-1 rounded-full bg-foreground mb-1"></div>
                    <div className="w-1 h-1 rounded-full bg-foreground mb-1"></div>
                    <div className="w-1 h-1 rounded-full bg-foreground mb-1"></div>
                    <ArrowRight className="h-4 w-4 text-foreground rotate-90 my-1" />
                  </div>
                  
                  <div className="flex lg:hidden flex-1 items-center mx-6 opacity-30">
                    <div className="w-full border-t-2 border-dashed border-foreground/50"></div>
                    <ArrowRight className="h-4 w-4 text-foreground shrink-0 ml-2" />
                  </div>

                  <div className="flex flex-col text-center lg:text-left">
                    <p className="text-xs uppercase font-semibold text-muted-foreground mb-1 tracking-wider">Chegada <span className="lowercase text-[10px]">(Aviso)</span></p>
                    <h3 className="font-display text-xl font-semibold text-muted-foreground">{item.previsao_chegada || "--"}</h3>
                    <p className="text-sm font-medium text-foreground/80">{destino}</p>
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs rounded-md uppercase font-bold tracking-wider px-2 py-0.5">Serviço #{item.servico}</Badge>
                          <Badge variant="outline" className={`border ${statusColor} gap-1 font-semibold`}>
                            <StatusIcon className="h-3 w-3" /> {statusText}
                          </Badge>
                          {((item as any).sentido === "descida") && (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 text-xs">
                              <ArrowDownRight className="h-3 w-3" /> Descendo
                            </Badge>
                          )}
                          {((item as any).sentido === "subida") && (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1 text-xs">
                              <ArrowUpRight className="h-3 w-3" /> Subindo
                            </Badge>
                          )}
                        </div>
                        {!item.passou && (
                          <p className={`text-sm font-medium mt-2 flex items-center gap-1.5 ${statusHorario === "atrasado" ? "text-destructive" : statusHorario === "iminente" ? "text-warning" : "text-muted-foreground"}`}>
                            <Clock className="h-3.5 w-3.5" />
                            {calcularTempoRestante(item.hora_saida_prevista, item.passou)}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {item.passou ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => abrirModal(item)} className="h-8 flex-1 sm:flex-none">Editar Check-in</Button>
                            <Button size="sm" variant="secondary" onClick={() => copymsg(item)} className="h-8 gap-1.5 flex-1 sm:flex-none"><Copy className="h-3 w-3" /> Relatório</Button>
                            <Button size="icon" variant="ghost" onClick={() => excluirServico(item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-4 w-4" /></Button>
                          </>
                        ) : (
                          <>
                          <Button
                          size="sm"
                          variant="outline"
                          className="
                            h-9
                            gap-2
                            border-primary/20
                            hover:border-primary/40
                            hover:bg-primary/5
                          "
                        onClick={() => {
  console.log("🚌 ITEM SELECIONADO:", item);

  solicitarLocalizacao(item);
}}
                        >
                          <MapPinned className="h-4 w-4" />
                          CCO

                          
                        </Button>
                        
                            <Button size="sm" variant="outline" onClick={() => abrirModalEditar(item)} className="h-9 flex-1 sm:flex-none">Editar Serviço</Button>
                            <Button onClick={() => abrirModal(item)} className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow shadow-primary/20 h-9 px-6 rounded-full font-semibold transition-transform active:scale-95 flex-1 sm:flex-none">Fazer Check-in</Button>
                            <Button size="icon" variant="ghost" onClick={() => excluirServico(item.id)} className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operational Details row */}
                  <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="bg-secondary/50 p-2 rounded-lg text-muted-foreground"><Bus className="h-4 w-4" /></div>
                        <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Veículo</p>
                        <p className="font-medium">{item.carro && item.carro !== "--" ? item.carro : <span className="text-muted-foreground/60 italic">A definir</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="bg-secondary/50 p-2 rounded-lg text-muted-foreground"><User className="h-4 w-4" /></div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Motorista</p>
                        <p className="font-medium truncate">{item.motorista || <span className="text-muted-foreground/60 italic">A definir</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="bg-secondary/50 p-2 rounded-lg text-muted-foreground"><Package className="h-4 w-4" /></div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Encomendas</p>
                        <p className="font-medium truncate">{item.encomenda || <span className="text-muted-foreground/60 italic">Nenhuma</span>}</p>
                      </div>
                    </div>
                  </div>
                  
                  {item.passou && item.hora_real && (
                    <div className="mt-3 bg-success/5 border border-success/20 rounded-lg p-2.5 flex items-center justify-between">
                       <p className="text-xs text-success/80 font-medium flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Horário real do Check-in: <span className="font-bold">{item.hora_real}</span></p>
                       {item.observacao && <p className="text-xs text-muted-foreground italic truncate max-w-[50%]">"{item.observacao}"</p>}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* modal confirmar / check-in */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl max-w-md bg-card/95 backdrop-blur-xl border-border/60 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{embarqueSelecionado?.passou ? 'Editar Check-in' : 'Fazer Check-in do Veículo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            
            {embarqueSelecionado && !embarqueSelecionado.passou && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm flex items-center gap-3">
                 <div className="bg-primary/10 p-2 rounded-full"><Bus className="h-4 w-4 text-primary" /></div>
                 <div>
                   <p className="font-medium">Serviço #{embarqueSelecionado.servico}</p>
                   <p className="text-xs text-muted-foreground">Previsão: {embarqueSelecionado.hora_saida_prevista}</p>
                 </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* <div className="space-y-1.5">
                <Label>Hora real do check-in</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 bg-background/50" placeholder="HH:mm" value={form.horaReal} onChange={(e) => setForm({ ...form, horaReal: e.target.value })} />
                </div>
              </div> */}
              <div className="space-y-1.5">
  <Label>Hora real do check-in</Label>

  <div className="flex gap-2">
    <div className="relative flex-1">
      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

      <Input
        className="pl-9 bg-background/50"
        placeholder="HH:mm"
        value={form.horaReal}
        onChange={(e) =>
          setForm({
            ...form,
            horaReal: e.target.value,
          })
        }
      />
    </div>

<Button
  type="button"
  variant="outline"
  className="flex items-center gap-2"
  onClick={() => {
    const agora = new Date();

    const horaAtual = agora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    setForm({
      ...form,
      horaReal: horaAtual,
    });
  }}
>
  <Clock className="h-4 w-4" />
  
</Button>
  </div>
</div>
              <div className="space-y-1.5">
                <Label>Veículo Escalado (Frota)</Label>
                <Select value={form.carro || "--"} onValueChange={(v) => setForm({ ...form, carro: v })}>
                  <SelectTrigger className="bg-background/50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="--">A definir</SelectItem>
                    {veiculos.map(v => <SelectItem key={v.placa} value={v.placa}>{v.placa} — {v.modelo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Motorista</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 bg-background/50" placeholder="Nome do Motorista" value={form.motorista} onChange={(e) => setForm({ ...form, motorista: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Encomendas</Label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 bg-background/50" placeholder="Ex: 2 caixas para Vitória" value={form.encomenda} onChange={(e) => setForm({ ...form, encomenda: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações Adicionais</Label>
              <Input className="bg-background/50" placeholder="Algum detalhe relevante?" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
            
            {/* <div className="pt-2 space-y-1">
              <Button 
              className="w-full rounded-xl bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow" 
              onClick={() => confirmarEmbarque(false)}
>
                {embarqueSelecionado?.passou ? 'Salvar Edições' : 'Salvar Checkin'}
              </Button>

            <Button
            variant="outline"
            className="w-full rounded-xl   hover:opacity-90 shadow-glow"            
            onClick={() => confirmarEmbarque(true)}
            >
            📤 Confirmar Checkin
            </Button>
            </div> */}
          {/* <div className="pt-2 space-y-2">

  <Button
    className="
      w-full
      rounded-xl
      bg-gradient-gold
      text-primary-foreground
      hover:opacity-90
      shadow-glow
    "
    onClick={() => confirmarEmbarque(false)}
  >
    {embarqueSelecionado?.passou
      ? "Salvar Edições"
      : "✅ Salvar Check-in"}
  </Button>

  {!embarqueSelecionado?.passou && (
    <div className="grid grid-cols-2 gap-2">

      <Button
        variant="outline"
        className="
          rounded-xl
          border-primary/20
          hover:border-primary/40
          hover:bg-primary/5
        "
        onClick={() =>
          confirmarEmbarque(
            true,
            "porto"
          )
        }
      >
        🚌 Checkin Setor Porto
      </Button>

      <Button
        variant="outline"
        className="
          rounded-xl
          border-warning/20
          hover:border-warning/40
          hover:bg-warning/5
        "
        onClick={() =>
          confirmarEmbarque(
            true,
            "ilheus"
          )
        }
      >
        🌊 Checkin Setor Ilhéus
      </Button>
<Button
variant="destructive"
className="
w-full
rounded-xl
font-semibold
"
onClick={() =>
setConfirmarQuebraOpen(true)
}
>
🚨 sos
</Button>
    </div>
  )}

</div> */}
   <div className="pt-2 space-y-2">

  <Button
    className="
      w-full
      rounded-xl
      bg-gradient-gold
      text-primary-foreground
      hover:opacity-90
      shadow-glow
    "
    onClick={() => confirmarEmbarque(false)}
  >
    {embarqueSelecionado?.passou
      ? "Salvar Edições"
      : "✅ Salvar Check-in"}
  </Button>

  {!embarqueSelecionado?.passou && (
    <div className="grid grid-cols-2 gap-2">

      <Button
        variant="outline"
        className="
          rounded-xl
          border-primary/20
          hover:border-primary/40
          hover:bg-primary/5
        "
        onClick={() =>
          confirmarEmbarque(
            true,
            "porto"
          )
        }
      >
        🚌 Checkin Setor Porto
      </Button>

      <Button
        variant="outline"
        className="
          rounded-xl
          border-warning/20
          hover:border-warning/40
          hover:bg-warning/5
        "
        onClick={() =>
          confirmarEmbarque(
            true,
            "ilheus"
          )
        }
      >
        🌊 Checkin Setor Ilhéus
      </Button>
<Button
variant="destructive"
className="
w-full
rounded-xl
font-semibold
"
onClick={() =>
setConfirmarQuebraOpen(true)
}
>
🚨 sos
</Button>
    </div>
  )}

</div>
          </div>
        </DialogContent>
      </Dialog>

      {/* modal novo / editar serviço */}
      <Dialog open={novoModalOpen} onOpenChange={setNovoModalOpen}>
        <DialogContent className="rounded-2xl max-w-md bg-card/95 backdrop-blur-xl border-border/60 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{idEditando ? "Editar Serviço" : "Novo Serviço de Frota"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Número do Serviço</Label>
              <Input className="bg-background/50" placeholder="Ex: 8599" value={formServico.servico} onChange={(e) => setFormServico({ ...formServico, servico: e.target.value })} />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade Origem</Label>
                <Input className="bg-background/50" placeholder="Saindo de..." value={formServico.cidadeOrigem} onChange={(e) => setFormServico({ ...formServico, cidadeOrigem: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade Destino</Label>
                <Input className="bg-background/50" placeholder="Indo para..." value={formServico.cidadeDestino} onChange={(e) => setFormServico({ ...formServico, cidadeDestino: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sentido</Label>
              <Select value={formServico.sentido} onValueChange={(v: any) => setFormServico({ ...formServico, sentido: v })}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Não definido</SelectItem>
                  <SelectItem value="descida">⬇ Descendo (Litoral – Ilhéus / Porto Seguro)</SelectItem>
                  <SelectItem value="subida">⬆ Subindo (Sudoeste – Conquista)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Saída Prevista</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 bg-background/50" placeholder="HH:mm" value={formServico.horaSaidaPrevista} onChange={(e) => setFormServico({ ...formServico, horaSaidaPrevista: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Hora Real (Opcional)</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 bg-background/50" placeholder="HH:mm" value={formServico.horaSaidaReal} onChange={(e) => setFormServico({ ...formServico, horaSaidaReal: e.target.value })} />
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <Button className="w-full rounded-xl bg-primary" onClick={salvarServico}>{idEditando ? "Salvar Alterações" : "Criar Serviço"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
open={confirmarQuebraOpen}
onOpenChange={setConfirmarQuebraOpen}
>
<DialogContent className="max-w-sm">

<DialogHeader>
<DialogTitle>
🚨 Confirmar ocorrência
</DialogTitle>
</DialogHeader>

<div className="space-y-3">

<p className="text-sm text-muted-foreground">
Isso enviará alerta para:
</p>

<div className="rounded-lg border p-3 text-sm">

<div>📡 CCO</div>

<div>
🚌 Grupo do Setor
</div>

<div>
🏢 Agência próxima
</div>

</div>

<p className="text-sm font-medium text-destructive">
Use apenas em caso real de quebra.
</p>

<div className="flex gap-2">

<Button
variant="outline"
className="flex-1"
onClick={() =>
setConfirmarQuebraOpen(false)
}
>
Cancelar
</Button>

<Button
variant="destructive"
className="flex-1"
disabled={enviandoQuebra}
onClick={async () => {

setEnviandoQuebra(true);

await informarCarroQuebrado();

setEnviandoQuebra(false);

setConfirmarQuebraOpen(false);

}}
>
{enviandoQuebra
? "Enviando..."
: "Confirmar"}
</Button>

</div>

</div>

</DialogContent>
</Dialog>
    </div>
  );
}
