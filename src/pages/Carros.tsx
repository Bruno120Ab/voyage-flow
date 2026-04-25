import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type EmbarqueDia = Database["public"]["Tables"]["embarques_dia"]["Row"];

export default function PaginaEmbarques() {
  const [embarques, setEmbarques] = useState<EmbarqueDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [embarqueSelecionado, setEmbarqueSelecionado] = useState<EmbarqueDia | null>(null);
  const [busca, setBusca] = useState("");

  const agora = new Date();

  const [form, setForm] = useState({
    horaReal: "",
    carro: "",
    motorista: "",
    encomenda: "",
    observacao: "",
  });

  const [novoEmbarque, setNovoEmbarque] = useState({
    servico: "",
    cidadeOrigem: "",
    cidadeDestino: "",
    horaSaidaPrevista: "",
    horaSaidaReal: "",
    prioridade: "Normal" as "Normal" | "Alta" | "Baixa",
  });

  // ---- LOAD ----
  const carregar = async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("embarques_dia")
      .select("*")
      .eq("data_operacao", hoje)
      .order("hora_saida_prevista", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar embarques", description: error.message, variant: "destructive" });
    } else {
      setEmbarques((data ?? []) as EmbarqueDia[]);
    }
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
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Dia reiniciado" });
  };

  const calcularPrevisao = (cidadeOrigem: string, horaSaidaReal: string) => {
    if (!cidadeOrigem || !horaSaidaReal) return "";
    const tempos: Record<string, number> = {
      "Vitória da Conquista": 60,
      VCA: 60,
      Itapetinga: 45,
      Itambé: 0,
    };
    const minutosAdicionar = tempos[cidadeOrigem] ?? 60;
    const [hora, minuto] = horaSaidaReal.split(":").map(Number);
    if (isNaN(hora) || isNaN(minuto)) return "";
    const data = new Date();
    data.setHours(hora);
    data.setMinutes(minuto + minutosAdicionar);
    return `${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;
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

  const horaParaMinutos = (hora: string | null) => {
    if (!hora) return null;
    const [h, m] = hora.slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  };
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();

  const getStatusHorario = (horaSaidaPrevista: string | null, passou: boolean) => {
    const itemMin = horaParaMinutos(horaSaidaPrevista);
    if (itemMin === null) return "normal";
    const diff = itemMin - agoraMin;
    if (diff < 0 && !passou) return "atrasado";
    if (diff <= 15 && diff >= -10 && !passou) return "iminente";
    return "normal";
  };

  const confirmarEmbarque = async () => {
    if (!embarqueSelecionado) return;
    const { error } = await supabase
      .from("embarques_dia")
      .update({
        passou: true,
        status: "concluido",
        hora_real: form.horaReal,
        carro: form.carro || "--",
        motorista: form.motorista,
        encomenda: form.encomenda,
        observacao: form.observacao,
      })
      .eq("id", embarqueSelecionado.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Embarque confirmado" });
      setModalOpen(false);
    }
  };

  const excluirServico = async (id: string) => {
    if (!confirm("Excluir este embarque?")) return;
    const { error } = await supabase.from("embarques_dia").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
  };

  const criarNovoEmbarque = async () => {
    if (!novoEmbarque.servico || !novoEmbarque.cidadeOrigem || !novoEmbarque.cidadeDestino) {
      toast({ title: "Preencha serviço, origem e destino", variant: "destructive" });
      return;
    }
    const previsao = calcularPrevisao(novoEmbarque.cidadeOrigem, novoEmbarque.horaSaidaReal);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("embarques_dia").insert({
      servico: novoEmbarque.servico,
      rota: `${novoEmbarque.cidadeOrigem} → ${novoEmbarque.cidadeDestino}`,
      cidade_origem: novoEmbarque.cidadeOrigem,
      cidade_destino: novoEmbarque.cidadeDestino,
      hora_saida_prevista: novoEmbarque.horaSaidaPrevista,
      hora_saida_real: novoEmbarque.horaSaidaReal,
      previsao_chegada: previsao,
      prioridade: novoEmbarque.prioridade,
      created_by: user?.id ?? null,
    });
    if (error) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      return;
    }
    setNovoEmbarque({ servico: "", cidadeOrigem: "", cidadeDestino: "", horaSaidaPrevista: "", horaSaidaReal: "", prioridade: "Normal" });
    setNovoModalOpen(false);
    toast({ title: "Embarque criado" });
  };

  const copymsg = () => {
    if (!embarqueSelecionado) return;
    const mensagem = `✅ EMBARQUE CONCLUÍDO

🚌 Serviço: #${embarqueSelecionado.servico}
📍 Rota: ${embarqueSelecionado.rota}

🕐 Horário de sistema: ${embarqueSelecionado.hora_saida_prevista || "--"}
📢 Aviso oficial da rodoviária: ${embarqueSelecionado.previsao_chegada || "--"}

✅ Hora real de chegada: ${form.horaReal || "--"}
🚐 Número do carro: ${form.carro || "--"}
👨‍✈️ Motorista: ${form.motorista || "--"}
📦 Encomenda: ${form.encomenda || "--"}
📝 Observação: ${form.observacao || "--"}

Tudo ocorreu corretamente e sem intercorrências.`;
    navigator.clipboard.writeText(mensagem);
    toast({ title: "Mensagem copiada" });
  };

  const total = embarques.length;
  const concluidos = embarques.filter((i) => i.passou).length;
  const pendentes = total - concluidos;

  const [filtroStatus, setFiltroStatus] = useState("todos");

  const converterHoraParaMinutos = (hora: string | null) => {
    if (!hora || typeof hora !== "string") return 0;
    const horaFormatada = hora.slice(0, 5);
    if (!horaFormatada.includes(":")) return 0;
    const [h, m] = horaFormatada.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  };

  const embarquesFiltrados = useMemo(() => {
    const horaAtualMinutos = agora.getHours() * 60 + agora.getMinutes();
    const filtrados = embarques.filter((item) => {
      const matchBusca =
        item.servico?.toLowerCase().includes(busca.toLowerCase()) ||
        item.rota?.toLowerCase().includes(busca.toLowerCase());
      if (!matchBusca) return false;

      const horaItem = item.hora_saida_prevista || item.previsao_chegada || "";
      const horaItemMinutos = converterHoraParaMinutos(horaItem);

      if (filtroStatus === "pendentes") return !item.passou;
      if (filtroStatus === "concluidos") return item.passou;
      if (filtroStatus === "faltamHoje")
        return !item.passou && horaItemMinutos >= horaAtualMinutos;
      return true;
    });

    return filtrados.sort((a, b) => {
      const aMin = converterHoraParaMinutos(a.hora_saida_prevista || a.previsao_chegada || "00:00");
      const bMin = converterHoraParaMinutos(b.hora_saida_prevista || b.previsao_chegada || "00:00");
      return aMin - bMin;
    });
  }, [embarques, busca, filtroStatus]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Central de Embarques</h1>
            <p className="text-muted-foreground">
              Controle operacional completo de linhas, motoristas e saídas
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={resetarEmbarquesDoDia}>
              Reiniciar dia
            </Button>
            <Button className="rounded-2xl" onClick={() => setNovoModalOpen(true)}>
              + Novo embarque
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 rounded-2xl">
            <p className="text-sm text-muted-foreground">Total do dia</p>
            <h2 className="text-3xl font-bold">{total}</h2>
          </Card>
          <Card className="p-5 rounded-2xl">
            <p className="text-sm text-muted-foreground">Concluídos</p>
            <h2 className="text-3xl font-bold">{concluidos}</h2>
          </Card>
          <Card className="p-5 rounded-2xl">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <h2 className="text-3xl font-bold">{pendentes}</h2>
          </Card>
        </div>

        <Card className="p-5 rounded-2xl">
          <div className="grid md:grid-cols-3 gap-3">
            <Input
              placeholder="Buscar por serviço ou rota..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="pendentes">Somente pendentes</option>
              <option value="concluidos">Somente concluídos</option>
              <option value="faltamHoje">Carros que ainda faltam passar</option>
            </select>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            {embarquesFiltrados.length === 0 && (
              <Card className="p-10 rounded-2xl text-center text-muted-foreground">
                Nenhum embarque para exibir hoje.
              </Card>
            )}
            {embarquesFiltrados.map((item) => {
              const statusHorario = getStatusHorario(item.hora_saida_prevista, item.passou);

              const calcularTempoRestante = (hora: string | null) => {
                if (!hora || item.passou) return "Finalizado";
                const itemMin = converterHoraParaMinutos(hora);
                if (!itemMin) return "--";
                const atualMin = agora.getHours() * 60 + agora.getMinutes();
                const diff = itemMin - atualMin;
                if (diff < 0) return "Atrasado";
                const horas = Math.floor(diff / 60);
                const minutos = diff % 60;
                if (horas > 0) return `Faltam ${horas}h ${minutos}min`;
                return `Faltam ${minutos}min`;
              };

              return (
                <details
                  key={item.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    statusHorario === "atrasado"
                      ? "border-red-500 bg-red-500/5"
                      : statusHorario === "iminente"
                      ? "border-yellow-500 bg-yellow-500/5"
                      : "border-border"
                  }`}
                >
                  <summary className="list-none cursor-pointer p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base truncate">{item.rota}</h3>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                          <span>Serviço #{item.servico}</span>
                          <span>•</span>
                          <span>{item.hora_saida_prevista || "--"}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className={`text-xs font-semibold px-2 py-1 rounded-full ${item.passou ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}`}>
                          {item.passou ? "Concluído" : "Pendente"}
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {calcularTempoRestante(item.hora_saida_prevista)}
                        </p>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t p-4 space-y-4 bg-muted/10">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border p-3">
                        <p className="text-xs text-muted-foreground">Horário Sistema</p>
                        <p className="font-bold text-lg">{item.hora_saida_prevista || "--"}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <p className="text-xs text-muted-foreground">Aviso Rodoviária</p>
                        <p className="font-bold text-lg">{item.previsao_chegada || "--"}</p>
                      </div>
                    </div>

                    {item.passou && (
                      <div className="rounded-xl border p-3">
                        <p className="font-semibold text-sm mb-2">Resumo do embarque</p>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Chegada</p>
                            <p className="font-semibold">{item.hora_real || "--"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Carro</p>
                            <p className="font-semibold">{item.carro || "--"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Motorista</p>
                            <p className="font-semibold">{item.motorista || "--"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => abrirModal(item)} className="rounded-lg">
                        {item.passou ? "Editar" : "Confirmar"}
                      </Button>
                      {item.passou && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setEmbarqueSelecionado(item); setForm({ horaReal: item.hora_real || "", carro: item.carro || "", motorista: item.motorista || "", encomenda: item.encomenda || "", observacao: item.observacao || "" }); setTimeout(copymsg, 10); }} className="rounded-lg">
                            Relatório
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => excluirServico(item.id)} className="rounded-lg">
                            Excluir
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      {/* modal novo embarque */}
      <Dialog open={novoModalOpen} onOpenChange={setNovoModalOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo embarque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Número do serviço" value={novoEmbarque.servico} onChange={(e) => setNovoEmbarque({ ...novoEmbarque, servico: e.target.value })} />
            <Input placeholder="Cidade origem" value={novoEmbarque.cidadeOrigem} onChange={(e) => setNovoEmbarque({ ...novoEmbarque, cidadeOrigem: e.target.value })} />
            <Input placeholder="Cidade destino" value={novoEmbarque.cidadeDestino} onChange={(e) => setNovoEmbarque({ ...novoEmbarque, cidadeDestino: e.target.value })} />
            <Input placeholder="Saída prevista (HH:mm)" value={novoEmbarque.horaSaidaPrevista} onChange={(e) => setNovoEmbarque({ ...novoEmbarque, horaSaidaPrevista: e.target.value })} />
            <Input placeholder="Hora real que saiu (HH:mm)" value={novoEmbarque.horaSaidaReal} onChange={(e) => setNovoEmbarque({ ...novoEmbarque, horaSaidaReal: e.target.value })} />
            <Button className="w-full rounded-xl" onClick={criarNovoEmbarque}>Salvar embarque</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* modal confirmar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar embarque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Hora real de chegada" value={form.horaReal} onChange={(e) => setForm({ ...form, horaReal: e.target.value })} />
            <Input placeholder="Número do carro" value={form.carro} onChange={(e) => setForm({ ...form, carro: e.target.value })} />
            <Input placeholder="Motorista" value={form.motorista} onChange={(e) => setForm({ ...form, motorista: e.target.value })} />
            <Input placeholder="Encomenda" value={form.encomenda} onChange={(e) => setForm({ ...form, encomenda: e.target.value })} />
            <Input placeholder="Observação" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            <Button variant="outline" className="w-full rounded-xl" onClick={copymsg}>Copiar mensagem</Button>
            <Button className="w-full rounded-xl" onClick={confirmarEmbarque}>Finalizar embarque</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
