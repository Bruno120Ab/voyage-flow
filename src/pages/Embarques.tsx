import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, Calendar, Clock, MapPin, MessageCircle, ChevronLeft, ChevronRight, Users, DollarSign, AlertCircle, CheckCircle2, Bus, UserPlus, Edit2, Trash2, Map, Wifi, Snowflake, Plug, Droplet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

type EStatus = "rascunho" | "confirmado" | "pendente" | "em_rota" | "finalizado" | "cancelado";
type PStatus = "pendente" | "parcial" | "pago";

interface Embarque {
  id: string; origem: string; destino: string; local_embarque: string | null;
  data_saida: string; data_retorno: string | null;
  valor_operacao: number; custo_operacao: number;
  status: EStatus; pagamento_status: PStatus; observacoes: string | null;
  veiculo_id: string | null;
  veiculos?: { placa: string; modelo: string; observacoes: string | null } | null;
}
interface Veiculo { id: string; placa: string; modelo: string; observacoes: string | null; }
interface Passageiro { id: string; nome: string; telefone: string | null; whatsapp: string | null; }
interface EmbPax {
  id: string; embarque_id: string; passageiro_id: string;
  vendido: boolean; comprovante_enviado: boolean; bilhete_impresso: boolean;
  pagamento_status: PStatus; valor_pago: number; poltrona: string | null;
  passageiros: Passageiro;
}

const statusStyle: Record<EStatus, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  confirmado: "bg-success/15 text-success border-success/30",
  pendente: "bg-warning/15 text-warning border-warning/30",
  em_rota: "bg-accent/15 text-accent border-accent/30",
  finalizado: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
};
const statusLabel: Record<EStatus, string> = {
  rascunho: "Rascunho", confirmado: "Confirmado", pendente: "Pendente",
  em_rota: "Em rota", finalizado: "Finalizado", cancelado: "Cancelado",
};

const COM_LIST = [
  { id: "wifi", label: "Wi-Fi", icon: <Wifi className="h-3 w-3" /> },
  { id: "ac", label: "Ar-Cond", icon: <Snowflake className="h-3 w-3" /> },
  { id: "usb", label: "USB", icon: <Plug className="h-3 w-3" /> },
  { id: "agua", label: "Água", icon: <Droplet className="h-3 w-3" /> },
];

interface Meta {
  observacoes: string;
  rota: "descida" | "subida" | "nenhuma";
  classe?: string;
  comodidades?: string[];
}

const parseMeta = (obs: string | null): Meta => {
  if (!obs) return { observacoes: "", rota: "nenhuma", classe: "Convencional", comodidades: [] };
  try {
    const data = JSON.parse(obs);
    if (data.isJsonMeta) {
      return {
        observacoes: data.observacoes || "",
        rota: data.rota || "nenhuma",
        classe: data.classe || "Convencional",
        comodidades: data.comodidades || [],
      };
    }
  } catch (e) {}
  return { observacoes: obs, rota: "nenhuma", classe: "Convencional", comodidades: [] };
};

const schema = z.object({
  origem: z.string().trim().min(2).max(120),
  destino: z.string().trim().min(2).max(120),
  local_embarque: z.string().trim().max(200).optional(),
  data_saida: z.string().min(1, "Informe a data de saída"),
  data_retorno: z.string().optional(),
  valor_operacao: z.coerce.number().min(0),
  custo_operacao: z.coerce.number().min(0),
  veiculo_id: z.string().optional(),
  status: z.enum(["rascunho", "confirmado", "pendente", "em_rota", "finalizado", "cancelado"]),
});

const onlyDigits = (s: string | null) => (s ?? "").replace(/\D/g, "");
const waLink = (phone: string | null, msg: string) => {
  const n = onlyDigits(phone);
  if (!n) return null;
  const num = n.startsWith("55") ? n : `55${n}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
};

export default function Embarques() {
  const [items, setItems] = useState<Embarque[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [allPax, setAllPax] = useState<Passageiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"dashboard" | "calendario" | "lista">("dashboard");
  const [rotaFiltro, setRotaFiltro] = useState<"todos" | "descida" | "subida">("todos");
  const [selected, setSelected] = useState<Embarque | null>(null);
  const [selectedPax, setSelectedPax] = useState<EmbPax[]>([]);
  const [paxLoading, setPaxLoading] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [form, setForm] = useState({
    origem: "", destino: "", local_embarque: "",
    data_saida: "", data_retorno: "",
    valor_operacao: "0", custo_operacao: "0",
    veiculo_id: "none", status: "rascunho" as EStatus, observacoes: "",
    rota: "nenhuma",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: emb, error }, { data: vs }, { data: ps }] = await Promise.all([
      supabase.from("embarques").select("*, veiculos(placa, modelo, observacoes)").order("data_saida", { ascending: true }),
      supabase.from("veiculos").select("id, placa, modelo, observacoes").order("placa"),
      supabase.from("passageiros").select("id, nome, telefone, whatsapp").order("nome"),
    ]);
    if (error) toast.error(error.message);
    setItems((emb as any) ?? []);
    setVeiculos((vs as Veiculo[]) ?? []);
    setAllPax((ps as Passageiro[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadPax = async (embarqueId: string) => {
    setPaxLoading(true);
    const { data, error } = await supabase
      .from("embarque_passageiros")
      .select("*, passageiros(id, nome, telefone, whatsapp)")
      .eq("embarque_id", embarqueId);
    if (error) toast.error(error.message);
    setSelectedPax((data as any) ?? []);
    setPaxLoading(false);
  };

  const handleEdit = (e: Embarque) => {
    setEditingId(e.id);
    const meta = parseMeta(e.observacoes);
    setForm({
      origem: e.origem,
      destino: e.destino,
      local_embarque: e.local_embarque || "",
      data_saida: e.data_saida.slice(0, 16),
      data_retorno: e.data_retorno ? e.data_retorno.slice(0, 16) : "",
      valor_operacao: String(e.valor_operacao),
      custo_operacao: String(e.custo_operacao),
      veiculo_id: e.veiculo_id || "none",
      status: e.status,
      observacoes: meta.observacoes,
      rota: meta.rota,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Tem certeza que deseja excluir este embarque?")) return;
    const old = items;
    setItems(items.filter(i => i.id !== id));
    const { error } = await supabase.from("embarques").delete().eq("id", id);
    if(error) { toast.error(error.message); setItems(old); return; }
    toast.success("Embarque excluído");
  };

  const handleSave = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    
    const obsJson = JSON.stringify({
      isJsonMeta: true,
      observacoes: form.observacoes,
      rota: form.rota,
    });

    const payload = {
      origem: parsed.data.origem,
      destino: parsed.data.destino,
      local_embarque: parsed.data.local_embarque || null,
      data_saida: new Date(parsed.data.data_saida).toISOString(),
      data_retorno: parsed.data.data_retorno ? new Date(parsed.data.data_retorno).toISOString() : null,
      valor_operacao: parsed.data.valor_operacao,
      custo_operacao: parsed.data.custo_operacao,
      veiculo_id: form.veiculo_id && form.veiculo_id !== "none" ? form.veiculo_id : null,
      status: parsed.data.status,
      observacoes: obsJson,
    };

    if (editingId) {
      const { error } = await supabase.from("embarques").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Embarque atualizado");
    } else {
      const { error } = await supabase.from("embarques").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Embarque criado");
    }
    
    setSaving(false);
    setOpen(false);
    resetForm();
    load();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ origem: "", destino: "", local_embarque: "", data_saida: "", data_retorno: "", valor_operacao: "0", custo_operacao: "0", veiculo_id: "none", status: "rascunho", observacoes: "", rota: "nenhuma" });
  };

  const openDetails = (e: Embarque) => {
    setSelected(e);
    loadPax(e.id);
  };

  const toggleFlag = async (id: string, field: "vendido" | "comprovante_enviado" | "bilhete_impresso", val: boolean) => {
    setSelectedPax(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
    const patch = { [field]: val } as { vendido?: boolean; comprovante_enviado?: boolean; bilhete_impresso?: boolean };
    const { error } = await supabase.from("embarque_passageiros").update(patch).eq("id", id);
    if (error) { toast.error(error.message); loadPax(selected!.id); }
  };

  const addPaxToEmbarque = async (passageiroId: string) => {
    if (!selected) return;
    const { error } = await supabase.from("embarque_passageiros").insert({
      embarque_id: selected.id, passageiro_id: passageiroId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Passageiro adicionado");
    loadPax(selected.id);
  };

  // ===== Dashboard stats =====
  const stats = useMemo(() => {
    const now = Date.now();
    const D7 = 7 * 24 * 60 * 60 * 1000;
    const proximos = items.filter(e => {
      const t = new Date(e.data_saida).getTime();
      return t >= now && t <= now + D7 && e.status !== "cancelado" && e.status !== "finalizado";
    });
    const hoje = items.filter(e => {
      const d = new Date(e.data_saida);
      const h = new Date();
      return d.toDateString() === h.toDateString() && e.status !== "cancelado";
    });
    const pendentes = items.filter(e => e.status === "pendente" || e.status === "rascunho");
    const receita = items.filter(e => e.status !== "cancelado").reduce((s, e) => s + Number(e.valor_operacao), 0);
    return { proximos, hoje, pendentes, receita, total: items.length };
  }, [items]);

  const proximas = useMemo(() => {
    const now = Date.now();
    return items
      .filter(e => new Date(e.data_saida).getTime() >= now - 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.data_saida).getTime() - new Date(b.data_saida).getTime())
      .slice(0, 6);
  }, [items]);

  const listItems = items.filter(e => {
    if (rotaFiltro === "todos") return true;
    const meta = parseMeta(e.observacoes);
    return meta.rota === rotaFiltro;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Operação</p>
          <h1 className="font-display text-3xl font-bold">Embarques</h1>
          <p className="text-muted-foreground mt-1">Dashboard, calendário e checklist por passageiro — nada escapa.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo embarque</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display text-xl">{editingId ? "Editar embarque" : "Novo embarque"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Origem</Label><Input value={form.origem} onChange={e => setForm(f => ({...f, origem: e.target.value}))} placeholder="São Paulo" /></div>
                  <div><Label>Destino</Label><Input value={form.destino} onChange={e => setForm(f => ({...f, destino: e.target.value}))} placeholder="Foz do Iguaçu" /></div>
                </div>
                <div><Label>Local de embarque</Label><Input value={form.local_embarque} onChange={e => setForm(f => ({...f, local_embarque: e.target.value}))} placeholder="Terminal Tietê - Plataforma 12" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Saída</Label><Input type="datetime-local" value={form.data_saida} onChange={e => setForm(f => ({...f, data_saida: e.target.value}))} /></div>
                  <div><Label>Retorno</Label><Input type="datetime-local" value={form.data_retorno} onChange={e => setForm(f => ({...f, data_retorno: e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor_operacao} onChange={e => setForm(f => ({...f, valor_operacao: e.target.value}))} /></div>
                  <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.custo_operacao} onChange={e => setForm(f => ({...f, custo_operacao: e.target.value}))} /></div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Veículo escalado</Label>
                  <Select value={form.veiculo_id} onValueChange={(v) => setForm(f => ({...f, veiculo_id: v}))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar veículo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum veículo definido ainda</SelectItem>
                      {veiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sentido Padrão (Rota)</Label>
                  <Select value={form.rota} onValueChange={(v: any) => setForm(f => ({...f, rota: v}))}>
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
                  <Select value={form.status} onValueChange={(v: EStatus) => setForm(f => ({...f, status: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(statusLabel) as EStatus[]).map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} rows={2} /></div>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 mt-2">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar embarque
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <TabsList className="bg-card-elevated/50">
            <TabsTrigger value="dashboard"><Bus className="h-3.5 w-3.5 mr-1.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="calendario"><Calendar className="h-3.5 w-3.5 mr-1.5" />Calendário</TabsTrigger>
            <TabsTrigger value="lista"><Clock className="h-3.5 w-3.5 mr-1.5" />Lista de Viagens</TabsTrigger>
          </TabsList>

          {tab === "lista" && (
            <div className="flex bg-card-elevated/50 p-1 rounded-lg">
              <Button size="sm" variant={rotaFiltro === "todos" ? "secondary" : "ghost"} className="text-xs h-8" onClick={() => setRotaFiltro("todos")}>Todos</Button>
              <Button size="sm" variant={rotaFiltro === "descida" ? "secondary" : "ghost"} className="text-xs h-8 gap-1.5 text-primary" onClick={() => setRotaFiltro("descida")}><ArrowDownRight className="h-3 w-3" /> Descida</Button>
              <Button size="sm" variant={rotaFiltro === "subida" ? "secondary" : "ghost"} className="text-xs h-8 gap-1.5 text-warning" onClick={() => setRotaFiltro("subida")}><ArrowUpRight className="h-3 w-3" /> Subida</Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Stat icon={<AlertCircle className="h-4 w-4" />} label="Saindo hoje" value={stats.hoje.length} accent="text-destructive" />
                <Stat icon={<Calendar className="h-4 w-4" />} label="Próximos 7 dias" value={stats.proximos.length} accent="text-warning" />
                <Stat icon={<Clock className="h-4 w-4" />} label="Pendentes" value={stats.pendentes.length} accent="text-accent" />
                <Stat icon={<Bus className="h-4 w-4" />} label="Total operações" value={stats.total} accent="text-primary" />
                <Stat icon={<DollarSign className="h-4 w-4" />} label="Receita prevista" value={`R$ ${stats.receita.toLocaleString("pt-BR")}`} accent="text-success" />
              </div>

              {stats.hoje.length > 0 && (
                <Card className="glass-card p-5 border-destructive/40">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <h3 className="font-display font-semibold">Saindo hoje — não esqueça!</h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {stats.hoje.map(e => <EmbCard key={e.id} e={e} onClick={() => openDetails(e)} />)}
                  </div>
                </Card>
              )}

              <div>
                <h3 className="font-display font-semibold mb-3">Próximas saídas</h3>
                {proximas.length === 0 ? (
                  <Card className="glass-card p-8 text-center text-muted-foreground">Nenhum embarque agendado.</Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {proximas.map(e => <EmbCard key={e.id} e={e} onClick={() => openDetails(e)} />)}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="calendario">
              <CalendarView items={items} month={calMonth} setMonth={setCalMonth} onPick={openDetails} />
            </TabsContent>

            <TabsContent value="lista">
              {listItems.length === 0 ? (
                <Card className="glass-card p-12 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">Nenhum embarque encontrado nesta categoria</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {listItems.map(e => <EmbCard key={e.id} e={e} onClick={() => openDetails(e)} onEdit={handleEdit} onDelete={handleDelete} detailed />)}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="bg-card border-border w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-xl">{selected.origem} → {selected.destino}</SheetTitle>
                <p className="text-sm text-muted-foreground">{new Date(selected.data_saida).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}</p>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <Card className="glass-card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className={`${statusStyle[selected.status]} mt-1`}>{statusLabel[selected.status]}</Badge>
                  </div>
                  {selected.local_embarque && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Local</p>
                      <p className="text-sm font-medium">{selected.local_embarque}</p>
                    </div>
                  )}
                </Card>

                <div className="flex items-center justify-between">
                  <h4 className="font-display font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Passageiros ({selectedPax.length})</h4>
                  <AddPaxButton allPax={allPax} alreadyIds={selectedPax.map(p => p.passageiro_id)} onAdd={addPaxToEmbarque} />
                </div>

                {paxLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : selectedPax.length === 0 ? (
                  <Card className="glass-card p-6 text-center text-sm text-muted-foreground">Nenhum passageiro vinculado ainda.</Card>
                ) : (
                  <div className="space-y-2">
                    {selectedPax.map(p => {
                      const wa = waLink(p.passageiros.whatsapp ?? p.passageiros.telefone, `Oi ${p.passageiros.nome.split(" ")[0]}! Tudo certo pro embarque ${selected.origem} → ${selected.destino} em ${new Date(selected.data_saida).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}${selected.local_embarque ? ` no ${selected.local_embarque}` : ""}.`);
                      const done = p.vendido && p.comprovante_enviado && p.bilhete_impresso;
                      return (
                        <Card key={p.id} className={`glass-card p-3 ${done ? "border-success/40" : ""}`}>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                                {p.passageiros.nome.split(" ").map(w => w[0]).slice(0, 2).join("")}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{p.passageiros.nome}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{p.passageiros.telefone || "Sem telefone"}</p>
                              </div>
                            </div>
                            {done && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <CheckItem label="Vendido" checked={p.vendido} onChange={(v) => toggleFlag(p.id, "vendido", v)} />
                            <CheckItem label="Comprovante" checked={p.comprovante_enviado} onChange={(v) => toggleFlag(p.id, "comprovante_enviado", v)} />
                            <CheckItem label="Impresso" checked={p.bilhete_impresso} onChange={(v) => toggleFlag(p.id, "bilhete_impresso", v)} />
                          </div>
                          {wa ? (
                            <a href={wa} target="_blank" rel="noreferrer">
                              <Button size="sm" className="w-full bg-success hover:bg-success/90 text-success-foreground"><MessageCircle className="h-3.5 w-3.5 mr-1.5" />WhatsApp</Button>
                            </a>
                          ) : (
                            <Button size="sm" disabled className="w-full">Sem WhatsApp</Button>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <Card className="glass-card p-4">
      <span className={`${accent} flex items-center gap-1.5 text-xs uppercase tracking-wide font-medium`}>{icon}{label}</span>
      <p className="font-display text-2xl font-bold mt-1">{value}</p>
    </Card>
  );
}

function EmbCard({ e, onClick, onEdit, onDelete, detailed = false }: { e: Embarque; onClick: () => void; onEdit?: (e: Embarque) => void; onDelete?: (id: string) => void; detailed?: boolean }) {
  const lucro = Number(e.valor_operacao) - Number(e.custo_operacao);
  const dt = new Date(e.data_saida);
  const meta = parseMeta(e.observacoes);
  const vMeta = parseMeta(e.veiculos?.observacoes || null);

  return (
    <Card className="glass-card flex flex-col sm:flex-row overflow-hidden hover:border-primary/40 transition-all group">
      <div className="bg-primary/5 p-6 flex flex-col items-center justify-center sm:w-40 border-b sm:border-b-0 sm:border-r border-border/50 shrink-0 cursor-pointer" onClick={onClick}>
        <span className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
        <span className="font-display font-bold text-3xl leading-none text-primary mb-1">{dt.getDate()}</span>
        <span className="text-xs font-medium text-muted-foreground">{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div className="cursor-pointer flex-1" onClick={onClick}>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-xl">{e.origem} → {e.destino}</h3>
              <Badge variant="outline" className={`text-[10px] ${statusStyle[e.status]}`}>{statusLabel[e.status]}</Badge>
            </div>
            {e.local_embarque && <p className="text-muted-foreground text-sm flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {e.local_embarque}</p>}
          </div>
          <div className="flex gap-1 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}><Edit2 className="h-4 w-4" /></Button>}
            {onDelete && <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </div>

        <div className="mt-auto space-y-3 cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            {e.veiculos ? (
              <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                <Bus className="h-3.5 w-3.5" /> <span className="font-medium text-foreground text-xs">{e.veiculos.placa} • {e.veiculos.modelo}</span>
                {vMeta.classe && <span className="ml-1 text-[10px] uppercase border border-border/50 px-1 rounded bg-background">{vMeta.classe}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground bg-warning/10 text-warning px-2 py-1 rounded-md text-xs">
                <AlertCircle className="h-3.5 w-3.5" /> <span className="font-medium">Sem veículo</span>
              </div>
            )}
            
            {meta.rota !== "nenhuma" && (
              <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${meta.rota === "descida" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
                <Map className="h-3.5 w-3.5" /> 
                <span className="font-medium">
                  {meta.rota === "descida" ? "Descida (Litoral)" : "Subida (Sudoeste)"}
                </span>
              </div>
            )}
          </div>

          {vMeta.comodidades && vMeta.comodidades.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
              {vMeta.comodidades.map((c: string) => {
                  const info = COM_LIST.find(x => x.id === c);
                  if(!info) return null;
                  return <div key={c} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-accent/5 border border-border/50 px-2 py-1 rounded-md">{info.icon} {info.label}</div>
              })}
            </div>
          )}
          
          {detailed && (
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50 text-center">
              <div><p className="text-[10px] uppercase text-muted-foreground">Valor</p><p className="text-sm font-semibold">R$ {Number(e.valor_operacao).toLocaleString("pt-BR")}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Custo</p><p className="text-sm font-semibold">R$ {Number(e.custo_operacao).toLocaleString("pt-BR")}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Lucro</p><p className={`text-sm font-bold ${lucro > 0 ? "text-gradient-gold" : "text-muted-foreground"}`}>R$ {lucro.toLocaleString("pt-BR")}</p></div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center gap-1.5 text-[11px] cursor-pointer rounded px-2 py-1.5 border transition-colors ${checked ? "bg-success/10 border-success/40 text-success" : "border-border hover:border-primary/30"}`}>
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="h-3.5 w-3.5" />
      <span className="font-medium">{label}</span>
    </label>
  );
}

function CalendarView({ items, month, setMonth, onPick }: { items: Embarque[]; month: Date; setMonth: (d: Date) => void; onPick: (e: Embarque) => void }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const byDay = useMemo(() => {
    const map = new globalThis.Map<number, Embarque[]>();
    items.forEach(e => {
      const d = new Date(e.data_saida);
      if (d.getFullYear() === year && d.getMonth() === m) {
        const k = d.getDate();
        const arr = map.get(k) ?? [];
        arr.push(e);
        map.set(k, arr);
      }
    });
    return map;
  }, [items, year, m]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === m && today.getDate() === d;

  return (
    <Card className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setMonth(new Date(year, m - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <h3 className="font-display font-semibold capitalize">{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h3>
        <Button variant="ghost" size="icon" onClick={() => setMonth(new Date(year, m + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase text-muted-foreground font-semibold mb-2">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => <div key={d} className="text-center p-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const dayItems = d ? byDay.get(d) ?? [] : [];
          return (
            <div key={i} className={`min-h-[88px] rounded-lg border p-1.5 ${d ? "bg-card-elevated/30 border-border/50" : "bg-transparent border-transparent"} ${isToday(d ?? 0) ? "border-primary/60 bg-primary/5" : ""}`}>
              {d && (
                <>
                  <div className={`text-xs font-semibold mb-1 ${isToday(d) ? "text-primary" : ""}`}>{d}</div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(e => (
                      <button key={e.id} onClick={() => onPick(e)} className="block w-full text-left text-[10px] truncate px-1.5 py-0.5 rounded bg-gradient-gold text-primary-foreground font-medium hover:opacity-90">
                        {new Date(e.data_saida).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {e.destino}
                      </button>
                    ))}
                    {dayItems.length > 3 && <p className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 3}</p>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AddPaxButton({ allPax, alreadyIds, onAdd }: { allPax: Passageiro[]; alreadyIds: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const available = allPax.filter(p => !alreadyIds.includes(p.id));
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="border-border"><UserPlus className="h-3.5 w-3.5 mr-1.5" />Adicionar</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Adicionar passageiro</DialogTitle></DialogHeader>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Todos os passageiros já estão neste embarque.</p>
          ) : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {available.map(p => (
                <button key={p.id} onClick={() => { onAdd(p.id); setOpen(false); }} className="w-full text-left p-3 rounded-lg hover:bg-card-elevated/60 border border-transparent hover:border-border transition-colors">
                  <p className="font-medium text-sm">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.telefone || "Sem telefone"}</p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
