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
  if (!hora || !hora.includes(":")) return 0;

  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
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
        <div className="space-y-4">
          {embarquesFiltrados.map((item) => {
  const statusHorario = getStatusHorario(item.horaSaidaPrevista, item.passou);

            return(
                  <Card key={item.id}   className={`p-6 rounded-2xl transition-all ${
        statusHorario === "atrasado"
          ? "border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20"
          : statusHorario === "iminente"
          ? "border-yellow-500 bg-yellow-500/10 animate-pulse"
          : ""
      }`}>
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {item.rota}
                    </h3>

                    <p className="text-sm text-muted-foreground mt-1">
                      Serviço #{item.servico}
                    </p>
                  </div>

                  <div className="text-sm font-medium">
                    {item.passou ? "✅ Concluído" : "⏳ Pendente"}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border p-4 bg-muted/20">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      Horário de Sistema
                    </p>

                    <p className="text-lg font-semibold">
                      {item.horaSaidaPrevista || "--"}
                    </p>
                  </div>

                  <div className="rounded-2xl border p-4 bg-muted/20">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      Aviso Oficial da Rodoviária
                    </p>

                    <p className="text-lg font-semibold">
                      {item.previsaoChegada || "--"}
                    </p>
                  </div>
                </div>

                {item.passou && (
                  <div className="rounded-2xl border p-4 bg-muted/30">
                    <h4 className="font-semibold mb-3">
                      Resumo do embarque concluído
                    </h4>

                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <strong>Hora de chegada</strong>
                        <br />
                        {item.horaReal || "--"}
                      </div>

                      <div>
                        <strong>Número do carro</strong>
                        <br />
                        {item.carro || "--"}
                      </div>

                      <div>
                        <strong>Motorista</strong>
                        <br />
                        {item.motorista || "--"}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => abrirModal(item)}
                    className="rounded-xl"
                  >
                    {item.passou ? "Editar" : "Confirmar embarque"}
                  </Button>

                  {item.passou && (
                   <>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => excluirServico(item.id)}
                    >
                      Excluir serviço
                    </Button>
                    <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={copymsg}
                    >
                    Copiar relatório completo
                    </Button>
                   </>
                  )}
                </div>
              </div>
            </Card>
            )
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