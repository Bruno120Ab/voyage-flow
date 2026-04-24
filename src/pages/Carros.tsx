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
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "embarques_do_dia";
const DATA_RESET_KEY = "embarques_data_reset";

const dadosIniciais = [];

export default function PaginaEmbarques() {
  const [embarques, setEmbarques] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [embarqueSelecionado, setEmbarqueSelecionado] = useState(null);
  const [busca, setBusca] = useState("");

  const agora = new Date();
const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(
  agora.getMinutes()
).padStart(2, "0")}`;

const isHorarioAtual = (hora) => {
  if (!hora) return false;

  // garante comparação só HH:mm (caso venha datetime depois)
  const normalizado = hora.slice(0, 5);
  return normalizado === horaAtual;
};
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
    prioridade: "Normal",
  });

  const salvarLocal = (dados) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        timestamp: new Date().getTime(),
        data: dados,
      })
    );
  };

  const resetarEmbarquesDoDia = () => {
    const atualizado = embarques.map((item) => ({
      ...item,
      passou: false,
      status: "Pendente",
      horaReal: "",
      carro: "--",
      motorista: "",
      encomenda: "",
      observacao: "",
    }));

    setEmbarques(atualizado);
    salvarLocal(atualizado);

    localStorage.setItem(
      DATA_RESET_KEY,
      new Date().toLocaleDateString("pt-BR")
    );
  };

  const verificarResetAutomatico = (dadosAtuais) => {
    const hoje = new Date().toLocaleDateString("pt-BR");
    const ultimaData = localStorage.getItem(DATA_RESET_KEY);

    if (ultimaData !== hoje) {
      const atualizado = dadosAtuais.map((item) => ({
        ...item,
        passou: false,
        status: "Pendente",
        horaReal: "",
        carro: "--",
        motorista: "",
        encomenda: "",
        observacao: "",
      }));

      setEmbarques(atualizado);
      salvarLocal(atualizado);

      localStorage.setItem(DATA_RESET_KEY, hoje);
    }
  };

  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);

    if (salvo) {
      const parsed = JSON.parse(salvo);
      const dados = parsed.data || [];

      setEmbarques(dados);

      setTimeout(() => {
        verificarResetAutomatico(dados);
      }, 100);

      return;
    }

    setEmbarques(dadosIniciais);
    salvarLocal(dadosIniciais);

    localStorage.setItem(
      DATA_RESET_KEY,
      new Date().toLocaleDateString("pt-BR")
    );
  }, []);

  const calcularPrevisao = (cidadeOrigem, horaSaidaReal) => {
    if (!cidadeOrigem || !horaSaidaReal) return "";

    const tempos = {
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

    const h = String(data.getHours()).padStart(2, "0");
    const m = String(data.getMinutes()).padStart(2, "0");

    return `${h}:${m}`;
  };
  

  const abrirModal = (item) => {
    setEmbarqueSelecionado(item);

    setForm({
      horaReal: item.horaReal || "",
      carro: item.carro && item.carro !== "--" ? item.carro : "",
      motorista: item.motorista || "",
      encomenda: item.encomenda || "",
      observacao: item.observacao || "",
    });

    setModalOpen(true);
  };

const horaParaMinutos = (hora) => {
  if (!hora) return null;
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return h * 60 + m;

};
const agoraMin = agora.getHours() * 60 + agora.getMinutes();
const getStatusHorario = (horaSaidaPrevista, passou) => {
  const itemMin = horaParaMinutos(horaSaidaPrevista);
  if (itemMin === null) return "normal";

  const diff = itemMin - agoraMin;

  // já passou da hora e não saiu ainda
  if (diff < 0 && !passou) return "atrasado";

  // está chegando (até 15 min antes ou depois da hora)
  if (diff <= 15 && diff >= -10 && !passou) return "iminente";

  return "normal";
};
  const confirmarEmbarque = () => {
    if (!embarqueSelecionado) return;

    const atualizado = embarques.map((item) =>
      item.id === embarqueSelecionado.id
        ? {
            ...item,
            passou: true,
            status: "Concluído",
            horaReal: form.horaReal,
            carro: form.carro,
            motorista: form.motorista,
            encomenda: form.encomenda,
            observacao: form.observacao,
          }
        : item
    );

    setEmbarques(atualizado);
    salvarLocal(atualizado);
    setModalOpen(false);
  };

  const excluirServico = (id) => {
    const atualizado = embarques.filter((item) => item.id !== id);

    setEmbarques(atualizado);
    salvarLocal(atualizado);
  };

  const criarNovoEmbarque = () => {
    const previsao = calcularPrevisao(
      novoEmbarque.cidadeOrigem,
      novoEmbarque.horaSaidaReal
    );

    const novo = {
      id: Date.now(),
      passou: false,
      status: "Pendente",
      servico: novoEmbarque.servico,
      rota: `${novoEmbarque.cidadeOrigem} → ${novoEmbarque.cidadeDestino}`,
      prioridade: novoEmbarque.prioridade,
      horaSaidaPrevista: novoEmbarque.horaSaidaPrevista,
      horaSaidaReal: novoEmbarque.horaSaidaReal,
      previsaoChegada: previsao,
      carro: "--",
      motorista: "",
      horaReal: "",
      encomenda: "",
      observacao: "",
    };

    const atualizado = [novo, ...embarques];

    setEmbarques(atualizado);
    salvarLocal(atualizado);

    setNovoEmbarque({
      servico: "",
      cidadeOrigem: "",
      cidadeDestino: "",
      horaSaidaPrevista: "",
      horaSaidaReal: "",
      prioridade: "Normal",
    });

    setNovoModalOpen(false);
  };

  const copiarMensagem = () => {
    if (!embarqueSelecionado) return;

    const mensagem = `✅ Embarque concluído

Serviço: #${embarqueSelecionado.servico}
Rota: ${embarqueSelecionado.rota}
Hora chegada: ${form.horaReal}
Carro: ${form.carro}
Motorista: ${form.motorista}
Encomenda: ${form.encomenda}
Observação: ${form.observacao}`;

    navigator.clipboard.writeText(mensagem);
  };

//   const embarquesFiltrados = useMemo(() => {
//     return embarques.filter(
//       (item) =>
//         item.servico?.toLowerCase().includes(busca.toLowerCase()) ||
//         item.rota?.toLowerCase().includes(busca.toLowerCase())
//     );
//   }, [embarques, busca]);

  const copymsg = () => {
  if (!embarqueSelecionado) return;

  const mensagem = `✅ EMBARQUE CONCLUÍDO

🚌 Serviço: #${embarqueSelecionado.servico}
📍 Rota: ${embarqueSelecionado.rota}

🕐 Horário de sistema: ${
    embarqueSelecionado.horaSaidaPrevista || "--"
  }

📢 Aviso oficial da rodoviária: ${
    embarqueSelecionado.previsaoChegada || "--"
  }

✅ Hora real de chegada: ${form.horaReal || "--"}
🚐 Número do carro: ${form.carro || "--"}
👨‍✈️ Motorista: ${form.motorista || "--"}
📦 Encomenda: ${form.encomenda || "--"}
📝 Observação: ${form.observacao || "--"}

Tudo ocorreu corretamente e sem intercorrências.`;

  navigator.clipboard.writeText(mensagem);
}; 
  const total = embarques.length;
  const concluidos = embarques.filter((i) => i.passou).length;
  const pendentes = total - concluidos;

  const [filtroStatus, setFiltroStatus] = useState("todos"); 
// todos | pendentes | concluidos | faltamHoje

const [filtroHorario, setFiltroHorario] = useState(""); 
// ex: 14:00


// ADICIONE ESSA FUNÇÃO ANTES DO useMemo()
const converterHoraParaMinutos = (hora) => {
  // evita undefined, null, vazio e formatos inválidos
  if (!hora || typeof hora !== "string") return 0;

  // pega apenas HH:mm caso venha "14:30:00" ou datetime
  const horaFormatada = hora.slice(0, 5);

  // valida se realmente possui :
  if (!horaFormatada.includes(":")) return 0;

  const partes = horaFormatada.split(":");

  if (partes.length < 2) return 0;

  const h = Number(partes[0]);
  const m = Number(partes[1]);

  // evita NaN
  if (isNaN(h) || isNaN(m)) return 0;

  return h * 60 + m;
};



// SUBSTITUA seu embarquesFiltrados por esse:

const embarquesFiltrados = useMemo(() => {
  const horaAtualMinutos =
    agora.getHours() * 60 + agora.getMinutes();

  const horarioFiltroMinutos = filtroHorario
    ? converterHoraParaMinutos(filtroHorario)
    : null;

  const filtrados = embarques.filter((item) => {
    const matchBusca =
      item.servico?.toLowerCase().includes(busca.toLowerCase()) ||
      item.rota?.toLowerCase().includes(busca.toLowerCase());

    if (!matchBusca) return false;

    const horaItem = item.horaSaidaPrevista || item.previsaoChegada || "";
    const horaItemMinutos = converterHoraParaMinutos(horaItem);

    let matchStatus = true;

    if (filtroStatus === "pendentes") matchStatus = !item.passou;
    if (filtroStatus === "concluidos") matchStatus = item.passou;
    if (filtroStatus === "faltamHoje")
      matchStatus = !item.passou && horaItemMinutos >= horaAtualMinutos;

    let matchHorario = true;

    if (horarioFiltroMinutos !== null) {
      matchHorario =
        !item.passou && horaItemMinutos >= horarioFiltroMinutos;
    }

    return matchStatus && matchHorario;
  });

  // ✅ ORDENAÇÃO POR HORA (CRESCENTE)
  return filtrados.sort((a, b) => {
    const aMin = converterHoraParaMinutos(
      a.horaSaidaPrevista || a.previsaoChegada || "00:00"
    );
    const bMin = converterHoraParaMinutos(
      b.horaSaidaPrevista || b.previsaoChegada || "00:00"
    );

    return aMin - bMin;
  });
}, [embarques, busca, filtroStatus, filtroHorario]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* topo */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Central de Embarques</h1>
            <p className="text-muted-foreground">
              Controle operacional completo de linhas, motoristas e saídas
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={resetarEmbarquesDoDia}
            >
              Reiniciar dia
            </Button>

            <Button
              className="rounded-2xl"
              onClick={() => setNovoModalOpen(true)}
            >
              + Novo embarque
            </Button>
          </div>
        </div>

        {/* cards resumo */}
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

        {/* busca */}
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
      <option value="faltamHoje">
        Carros que ainda faltam passar
      </option>
    </select>

    {/* <Input
      type="time"
      value={filtroHorario}
      onChange={(e) => setFiltroHorario(e.target.value)}
      placeholder="Filtrar por horário"
    /> */}
  </div>
</Card>

        {/* lista */}
       <div className="space-y-3">
  {embarquesFiltrados.map((item) => {
    const statusHorario = getStatusHorario(
      item.horaSaidaPrevista,
      item.passou
    );

    const calcularTempoRestante = (hora) => {
  if (!hora || item.passou) return "Finalizado";

  const itemMin = converterHoraParaMinutos(hora);

  // se vier inválido
  if (!itemMin) return "--";

  const agora = new Date();
  const atualMin =
    agora.getHours() * 60 + agora.getMinutes();

  const diff = itemMin - atualMin;

  if (diff < 0) return "Atrasado";

  const horas = Math.floor(diff / 60);
  const minutos = diff % 60;

  if (horas > 0) {
    return `Faltam ${horas}h ${minutos}min`;
  }

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
        {/* CARD RESUMIDO */}
        <summary className="list-none cursor-pointer p-4">
          <div className="flex items-center justify-between gap-3">
            {/* esquerda */}
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">
                {item.rota}
              </h3>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                <span>Serviço #{item.servico}</span>
                <span>•</span>
                <span>
                  {item.horaSaidaPrevista || "--"}
                </span>
              </div>
            </div>

            {/* direita */}
            <div className="text-right space-y-1">
              <div
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  item.passou
                    ? "bg-green-500/10 text-green-600"
                    : "bg-yellow-500/10 text-yellow-600"
                }`}
              >
                {item.passou ? "Concluído" : "Pendente"}
              </div>

              <p className="text-xs font-medium text-muted-foreground">
                {calcularTempoRestante(
                  item.horaSaidaPrevista
                )}
              </p>
            </div>
          </div>
        </summary>

        {/* DETALHES EXPANDIDOS */}
        <div className="border-t p-4 space-y-4 bg-muted/10">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">
                Horário Sistema
              </p>
              <p className="font-bold text-lg">
                {item.horaSaidaPrevista || "--"}
              </p>
            </div>

            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">
                Aviso Rodoviária
              </p>
              <p className="font-bold text-lg">
                {item.previsaoChegada || "--"}
              </p>
            </div>
          </div>

          {item.passou && (
            <div className="rounded-xl border p-3">
              <p className="font-semibold text-sm mb-2">
                Resumo do embarque
              </p>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Chegada
                  </p>
                  <p className="font-semibold">
                    {item.horaReal || "--"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Carro
                  </p>
                  <p className="font-semibold">
                    {item.carro || "--"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Motorista
                  </p>
                  <p className="font-semibold">
                    {item.motorista || "--"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => abrirModal(item)}
              className="rounded-lg"
            >
              {item.passou ? "Editar" : "Confirmar"}
            </Button>

            {item.passou && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copymsg}
                  className="rounded-lg"
                >
                  Relatório
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => excluirServico(item.id)}
                  className="rounded-lg"
                >
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
        
      </div>

      {/* modal novo embarque */}
      <Dialog open={novoModalOpen} onOpenChange={setNovoModalOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo embarque</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Número do serviço"
              value={novoEmbarque.servico}
              onChange={(e) =>
                setNovoEmbarque({
                  ...novoEmbarque,
                  servico: e.target.value,
                })
              }
            />

            <Input
              placeholder="Cidade origem"
              value={novoEmbarque.cidadeOrigem}
              onChange={(e) =>
                setNovoEmbarque({
                  ...novoEmbarque,
                  cidadeOrigem: e.target.value,
                })
              }
            />

            <Input
              placeholder="Cidade destino"
              value={novoEmbarque.cidadeDestino}
              onChange={(e) =>
                setNovoEmbarque({
                  ...novoEmbarque,
                  cidadeDestino: e.target.value,
                })
              }
            />

            <Input
              placeholder="Saída prevista"
              value={novoEmbarque.horaSaidaPrevista}
              onChange={(e) =>
                setNovoEmbarque({
                  ...novoEmbarque,
                  horaSaidaPrevista: e.target.value,
                })
              }
            />

            <Input
              placeholder="Hora real que saiu"
              value={novoEmbarque.horaSaidaReal}
              onChange={(e) =>
                setNovoEmbarque({
                  ...novoEmbarque,
                  horaSaidaReal: e.target.value,
                })
              }
            />

            <Button
              className="w-full rounded-xl"
              onClick={criarNovoEmbarque}
            >
              Salvar embarque
            </Button>
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
            <Input
              placeholder="Hora real de chegada"
              value={form.horaReal}
              onChange={(e) =>
                setForm({
                  ...form,
                  horaReal: e.target.value,
                })
              }
            />

            <Input
              placeholder="Número do carro"
              value={form.carro}
              onChange={(e) =>
                setForm({
                  ...form,
                  carro: e.target.value,
                })
              }
            />

            <Input
              placeholder="Motorista"
              value={form.motorista}
              onChange={(e) =>
                setForm({
                  ...form,
                  motorista: e.target.value,
                })
              }
            />

            <Input
              placeholder="Encomenda"
              value={form.encomenda}
              onChange={(e) =>
                setForm({
                  ...form,
                  encomenda: e.target.value,
                })
              }
            />

            <Input
              placeholder="Observação"
              value={form.observacao}
              onChange={(e) =>
                setForm({
                  ...form,
                  observacao: e.target.value,
                })
              }
            />

            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={copiarMensagem}
            >
              Copiar mensagem
            </Button>

            <Button
              className="w-full rounded-xl"
              onClick={confirmarEmbarque}
            >
              Finalizar embarque
            </Button>
            
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}