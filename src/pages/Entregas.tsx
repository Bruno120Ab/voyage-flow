import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Package, Search, Send, Inbox, Target, TrendingUp, Trash2, Plus, Loader2, MapPin, Clock3, User, Phone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

const META_MES = 100;

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
  return map[s];
};

export default function Entregas() {
  const [lista, setLista] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | Tipo>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | Status>("todos");
  const [open, setOpen] = useState(false);

  // form
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
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("entregas")
      .select("*")
      .order("data_operacao", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setLista((data ?? []) as Entrega[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const resetForm = () => {
    setCodigo(""); setCliente(""); setTelefone(""); setOrigem(""); setDestino("");
    setTipo("enviada"); setValor(""); setResponsavel(""); setPrevisao(""); setObservacoes("");
  };

  const salvar = async () => {
    if (!codigo.trim() || !cliente.trim()) {
      toast({ title: "Preencha código e cliente", variant: "destructive" });
      return;
    }
    setSalvando(true);
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
    setSalvando(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Entrega registrada" });
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
    setLista((l) => l.map((e) => (e.id === id ? { ...e, status: novo } : e)));
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta entrega?")) return;
    const { error } = await supabase.from("entregas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    setLista((l) => l.filter((e) => e.id !== id));
  };

  const comissaoPreview = useMemo(() => {
    const v = Number(valor) || 0;
    return tipo === "enviada" ? v * 0.10 : 5;
  }, [valor, tipo]);

  const filtradas = useMemo(() => {
    const t = busca.toLowerCase();
    return lista.filter((e) => {
      const matchT = !t || [e.codigo, e.cliente, e.origem, e.destino, e.responsavel]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
      const matchTipo = filtroTipo === "todos" || e.tipo === filtroTipo;
      const matchSt = filtroStatus === "todos" || e.status === filtroStatus;
      return matchT && matchTipo && matchSt;
    });
  }, [lista, busca, filtroTipo, filtroStatus]);

  const stats = useMemo(() => {
    const hoje = new Date();
    const mes = hoje.getMonth(), ano = hoje.getFullYear();
    const doMes = lista.filter((e) => {
      const d = new Date(e.data_operacao);
      return d.getMonth() === mes && d.getFullYear() === ano;
    });
    const enviadas = doMes.filter((e) => e.tipo === "enviada");
    const recebidas = doMes.filter((e) => e.tipo === "recebida");
    const comEnv = enviadas.reduce((s, e) => s + Number(e.comissao || 0), 0);
    const comRec = recebidas.reduce((s, e) => s + Number(e.comissao || 0), 0);
    const total = comEnv + comRec;
    const valorBruto = doMes.reduce((s, e) => s + Number(e.valor || 0), 0);
    return {
      enviadas: enviadas.length,
      recebidas: recebidas.length,
      comEnv, comRec, total, valorBruto,
      progresso: Math.min(100, (total / META_MES) * 100),
      faltam: Math.max(0, META_MES - total),
    };
  }, [lista]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero border border-border p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/80 font-medium mb-2">Central de Encomendas</p>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center gap-3">
              <Package className="h-7 w-7 text-primary" /> Entregas
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm">
              Controle entradas e saídas. <span className="text-foreground font-medium">Enviada = 10% do valor</span> · <span className="text-foreground font-medium">Recebida = R$ 5</span>.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 px-5 gap-2"><Plus className="h-4 w-4" /> Nova entrega</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar entrega</DialogTitle></DialogHeader>
              <div className="space-y-3">
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
                    <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Cidade origem" />
                  </div>
                  <div>
                    <Label>Destino</Label>
                    <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Cidade destino" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Previsão</Label>
                    <Input value={previsao} onChange={(e) => setPrevisao(e.target.value)} placeholder="14:30 ou Hoje" />
                  </div>
                </div>
                <div className="flex justify-between items-center px-3 py-2 rounded-md bg-success/10 border border-success/30 text-xs">
                  <span className="text-success/80 font-semibold uppercase tracking-wider">
                    Comissão prevista ({tipo === "enviada" ? "10%" : "R$ 5 fixo"})
                  </span>
                  <span className="font-display font-bold text-success">
                    R$ {comissaoPreview.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={salvar} disabled={salvando}>
                  {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* META */}
      <Card className="glass-card p-5 sm:p-6 border-l-4 border-l-primary">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Meta mensal de comissão</p>
              <p className="font-display text-xl font-bold">
                R$ {stats.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                <span className="text-muted-foreground text-sm font-normal"> / R$ {META_MES.toFixed(2)}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {stats.faltam > 0 ? `Faltam R$ ${stats.faltam.toFixed(2)}` : "🎯 Meta batida!"}
            </p>
            <p className="font-display text-lg font-bold text-success">{stats.progresso.toFixed(0)}%</p>
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-card-elevated overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-success transition-all"
            style={{ width: `${stats.progresso}%` }}
          />
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-blue-500">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-blue-400" /> Enviadas (mês)
          </p>
          <p className="mt-2 font-display text-2xl font-bold">{stats.enviadas}</p>
          <p className="text-xs text-success mt-1">R$ {stats.comEnv.toFixed(2)} em comissão</p>
        </Card>
        <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-purple-500">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5 text-purple-400" /> Recebidas (mês)
          </p>
          <p className="mt-2 font-display text-2xl font-bold">{stats.recebidas}</p>
          <p className="text-xs text-success mt-1">R$ {stats.comRec.toFixed(2)} em comissão</p>
        </Card>
        <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-amber-500">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" /> Valor bruto (mês)
          </p>
          <p className="mt-2 font-display text-xl font-bold">R$ {stats.valorBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="glass-card p-4 sm:p-5 border-l-4 border-l-success">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-success" /> Comissão total
          </p>
          <p className="mt-2 font-display text-xl font-bold text-success">R$ {stats.total.toFixed(2)}</p>
        </Card>
      </div>

      {/* FILTROS */}
      <Card className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
            <Input className="pl-10 h-11" placeholder="Buscar código, cliente, cidade..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="enviada">Enviadas</SelectItem>
              <SelectItem value="recebida">Recebidas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* LISTA */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtradas.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Nenhuma entrega encontrada.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((e) => (
            <Card key={e.id} className={`glass-card p-5 hover:border-primary/40 transition-all border-l-4 ${e.tipo === "enviada" ? "border-l-blue-500" : "border-l-purple-500"}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-base">{e.codigo}</h3>
                    <Badge variant="outline" className={e.tipo === "enviada" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "bg-purple-500/15 text-purple-400 border-purple-500/30"}>
                      {e.tipo === "enviada" ? <><Send className="h-3 w-3 mr-1" /> Enviada</> : <><Inbox className="h-3 w-3 mr-1" /> Recebida</>}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{e.cliente}</p>
                </div>
                <Badge variant="outline" className={statusBadge(e.status)}>
                  {STATUS_OPTS.find((s) => s.value === e.status)?.label}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {(e.origem || e.destino) && (
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{e.origem || "?"} → {e.destino || "?"}</span></div>
                )}
                {e.previsao && <div className="flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" /><span>{e.previsao}</span></div>}
                {e.responsavel && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" /><span className="truncate">{e.responsavel}</span></div>}
                {e.telefone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span>{e.telefone}</span></div>}
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor</p>
                  <p className="font-display font-bold text-sm">R$ {Number(e.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Comissão</p>
                  <p className="font-display font-bold text-sm text-success">R$ {Number(e.comissao).toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Select value={e.status} onValueChange={(v) => atualizarStatus(e.id, v as Status)}>
                  <SelectTrigger className="h-9 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => excluir(e.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
