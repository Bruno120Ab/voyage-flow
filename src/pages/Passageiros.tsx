import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Phone, MessageCircle, Search, Plus, Star, Loader2, Users, Flame, RotateCcw, Snowflake, ArrowRight, Edit2, Trash2, User, MapPin, DollarSign, TrendingUp, NotebookPen, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

type Tag = "novo" | "recorrente" | "vip" | "retorno" | "inativo" | "quente";
interface Passageiro {
  id: string; nome: string; telefone: string | null; whatsapp: string | null;
  cidade: string | null; tag: Tag; total_viagens: number; ticket_medio: number;
  ultima_viagem: string | null; observacoes: string | null;
}
interface Lead {
  id: string; nome: string; telefone: string | null; whatsapp: string | null;
  destino: string | null; valor_estimado: number; etapa: string;
  observacoes: string | null; updated_at: string;
}
interface EmbPax {
  passageiro_id: string;
  embarque: { destino: string; origem: string; data_saida: string; data_retorno: string | null } | null;
}

const tagStyle: Record<Tag, string> = {
  vip: "bg-gradient-gold text-primary-foreground border-0",
  recorrente: "bg-accent/15 text-accent border-accent/30",
  retorno: "bg-warning/15 text-warning border-warning/30",
  inativo: "bg-muted text-muted-foreground border-border",
  quente: "bg-destructive/15 text-destructive border-destructive/30",
  novo: "bg-primary/10 text-primary border-primary/20",
};
const tagLabel: Record<Tag, string> = {
  vip: "VIP", recorrente: "Recorrente", retorno: "Retorno", inativo: "Inativo", quente: "Quente", novo: "Novo",
};

// Apenas 3 classificações expostas no cadastro (mapeadas pras tags internas)
const formTags: { value: Tag; label: string }[] = [
  { value: "quente", label: "Fechar venda" },
  { value: "retorno", label: "Vender volta" },
  { value: "inativo", label: "Inativo" },
];

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  cidade: z.string().trim().max(80).optional(),
  tag: z.enum(["quente", "retorno", "inativo"]),
  observacoes: z.string().max(500).optional(),
  valor_compra: z.string().optional(),
});

const onlyDigits = (s: string | null) => (s ?? "").replace(/\D/g, "");
const waLink = (phone: string | null, msg: string) => {
  const n = onlyDigits(phone);
  if (!n) return null;
  const num = n.startsWith("55") ? n : `55${n}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
};

type ActionItem = {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  subtitle: string;
  meta: string;
  msg: string;
  badge?: { label: string; className: string };
  observacoes?: string | null;
  ticket?: number;
};
const getComissao = (valor: number) => valor * 0.08;

export default function Passageiros() {
  const [items, setItems] = useState<Passageiro[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [embPax, setEmbPax] = useState<EmbPax[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"todos" | "fechar" | "retorno" | "inativos">("fechar");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", telefone: "", whatsapp: "", cidade: "", tag: "quente" as Tag, observacoes: "", valor_compra: "" });

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("Tem certeza que deseja deletar este passageiro?");
    if (!confirm) return;

    const oldItems = items;
    setItems(prev => prev.filter(p => p.id !== id));

    const { error } = await supabase
      .from("passageiros")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao deletar passageiro");
      setItems(oldItems); // rollback
      return;
    }

    toast.success("Passageiro deletado");
  };

  const load = async () => {
    setLoading(true);
    const [pax, lds, eps] = await Promise.all([
      supabase.from("passageiros").select("*").order("nome"),
      supabase.from("leads").select("*").in("etapa", ["negociacao", "aguardando"]).order("updated_at", { ascending: false }),
      supabase.from("embarque_passageiros").select("passageiro_id, embarque:embarques(destino, origem, data_saida, data_retorno)"),
    ]);
    if (pax.error) toast.error(pax.error.message);
    if (lds.error) toast.error(lds.error.message);
    if (eps.error) toast.error(eps.error.message);
    setItems((pax.data as Passageiro[]) ?? []);
    setLeads((lds.data as Lead[]) ?? []);
    setEmbPax((eps.data as any) ?? []);
    setLoading(false);
  };
  
  useEffect(() => { load(); }, []);

  const handleEdit = (p: Passageiro) => {
    setEditingId(p.id);
    setForm({
      nome: p.nome,
      telefone: p.telefone || "",
      whatsapp: p.whatsapp || "",
      cidade: p.cidade || "",
      tag: p.tag,
      observacoes: p.observacoes || "",
      valor_compra: p.ticket_medio ? String(p.ticket_medio) : "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    
    const ticketValue = parsed.data.valor_compra ? parseFloat(parsed.data.valor_compra.replace(/\./g, '').replace(',', '.')) || 0 : 0;

    const payload = {
      nome: parsed.data.nome,
      telefone: parsed.data.telefone || null,
      whatsapp: parsed.data.whatsapp || parsed.data.telefone || null,
      cidade: parsed.data.cidade || null,
      tag: parsed.data.tag,
      observacoes: parsed.data.observacoes || null,
      ticket_medio: ticketValue,
    };

    if (editingId) {
      const { error } = await supabase.from("passageiros").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Passageiro atualizado");
    } else {
      const { error } = await supabase.from("passageiros").insert({
        ...payload,
        total_viagens: ticketValue > 0 ? 1 : 0,
      });
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Passageiro cadastrado");
    }

    setOpen(false);
    setEditingId(null);
    setForm({ nome: "", telefone: "", whatsapp: "", cidade: "", tag: "quente", observacoes: "", valor_compra: "" });
    load();
  };

  // ===== Categorização inteligente =====
  const { fecharVenda, venderVolta, inativos } = useMemo(() => {
    const now = Date.now();
    const D30 = 30 * 24 * 60 * 60 * 1000;
    const D60 = 60 * 24 * 60 * 60 * 1000;

    const fecharVenda: ActionItem[] = [
      ...leads.map(l => ({
        id: `lead-${l.id}`,
        nome: l.nome,
        telefone: l.telefone,
        whatsapp: l.whatsapp ?? l.telefone,
        subtitle: l.destino ? `→ ${l.destino}` : "Negociação em aberto",
        meta: l.valor_estimado > 0 ? `R$ ${Number(l.valor_estimado).toLocaleString("pt-BR")}` : "—",
        msg: `Oi ${l.nome.split(" ")[0]}! Tudo bem? Passando pra confirmar se você quer fechar a viagem${l.destino ? ` para ${l.destino}` : ""}. Posso te garantir a vaga agora?`,
        badge: { label: l.etapa === "aguardando" ? "Aguardando" : "Negociação", className: l.etapa === "aguardando" ? "bg-warning/15 text-warning border-warning/30" : "bg-primary/15 text-primary border-primary/30" },
        observacoes: l.observacoes,
        ticket: l.valor_estimado,
      })),
      ...items.filter(p => p.tag === "quente").map(p => ({
        id: `pax-${p.id}`,
        nome: p.nome,
        telefone: p.telefone,
        whatsapp: p.whatsapp ?? p.telefone,
        subtitle: p.cidade ? `${p.cidade}` : "Marcado para fechar venda",
        meta: p.ticket_medio > 0 ? `Ticket R$ ${Number(p.ticket_medio).toLocaleString("pt-BR")}` : "—",
        msg: `Oi ${p.nome.split(" ")[0]}! Tudo bem? Passando pra confirmar se você quer fechar a viagem. Posso te garantir a vaga agora?`,
        badge: { label: "Fechar venda", className: "bg-destructive/15 text-destructive border-destructive/30" },
        observacoes: p.observacoes,
        ticket: p.ticket_medio,
      })),
    ];

    const idaSemVolta = new Map<string, { destino: string; origem: string; dias: number }>();
    for (const ep of embPax) {
      const e = ep.embarque;
      if (!e || !e.data_saida) continue;
      const t = new Date(e.data_saida).getTime();
      if (now - t > D30 || t > now) continue;
      if (e.data_retorno) continue;
      const prev = idaSemVolta.get(ep.passageiro_id);
      const dias = Math.floor((now - t) / (24 * 60 * 60 * 1000));
      if (!prev || dias < prev.dias) idaSemVolta.set(ep.passageiro_id, { destino: e.destino, origem: e.origem, dias });
    }
    const venderVolta: ActionItem[] = [];
    const jaIncluido = new Set<string>();
    for (const p of items) {
      const info = idaSemVolta.get(p.id);
      if (!info) continue;
      jaIncluido.add(p.id);
      venderVolta.push({
        id: p.id,
        nome: p.nome,
        telefone: p.telefone,
        whatsapp: p.whatsapp ?? p.telefone,
        subtitle: `Foi para ${info.destino} há ${info.dias} ${info.dias === 1 ? "dia" : "dias"}`,
        meta: `Sem retorno marcado`,
        msg: `Oi ${p.nome.split(" ")[0]}! Tudo bem? Vi aqui que você foi pra ${info.destino} e ainda não fechou a volta. Quer que eu garanta sua poltrona pro retorno?`,
        badge: { label: "Vender volta", className: "bg-warning/15 text-warning border-warning/30" },
        observacoes: p.observacoes,
        ticket: p.ticket_medio,
      });
    }
    for (const p of items) {
      if (p.tag !== "retorno" || jaIncluido.has(p.id)) continue;
      venderVolta.push({
        id: p.id,
        nome: p.nome,
        telefone: p.telefone,
        whatsapp: p.whatsapp ?? p.telefone,
        subtitle: p.cidade ? `${p.cidade}` : "Marcado para vender volta",
        meta: p.ticket_medio > 0 ? `Ticket R$ ${Number(p.ticket_medio).toLocaleString("pt-BR")}` : "—",
        msg: `Oi ${p.nome.split(" ")[0]}! Tudo bem? Quer que eu garanta sua poltrona pro retorno?`,
        badge: { label: "Vender volta", className: "bg-warning/15 text-warning border-warning/30" },
        observacoes: p.observacoes,
        ticket: p.ticket_medio,
      });
    }

    const inativos: ActionItem[] = items
      .filter(p => {
        if (p.tag === "inativo") return true;
        if (!p.ultima_viagem) return p.total_viagens > 0;
        return now - new Date(p.ultima_viagem).getTime() > D60;
      })
      .map(p => {
        const dias = p.ultima_viagem ? Math.floor((now - new Date(p.ultima_viagem).getTime()) / (24 * 60 * 60 * 1000)) : null;
        return {
          id: p.id,
          nome: p.nome,
          telefone: p.telefone,
          whatsapp: p.whatsapp ?? p.telefone,
          subtitle: dias ? `Última viagem há ${dias} dias` : "Sem viagens recentes",
          meta: `${p.total_viagens} viagens`,
          msg: `Oi ${p.nome.split(" ")[0]}! Faz um tempo que não viajamos juntos. Tô com novas excursões saindo, posso te mandar os destinos e datas?`,
          badge: { label: tagLabel[p.tag], className: tagStyle[p.tag] },
          observacoes: p.observacoes,
          ticket: p.ticket_medio,
        };
      });

    return { fecharVenda, venderVolta, inativos };
  }, [items, leads, embPax]);

  const applySearch = <T extends { nome: string; telefone: string | null }>(arr: T[]) =>
    arr.filter(x => !search || x.nome.toLowerCase().includes(search.toLowerCase()) || (x.telefone ?? "").includes(search));

  const counts = {
    todos: items.length,
    fechar: fecharVenda.length,
    fecharTicket: fecharVenda.reduce((acc, i) => acc + (i.ticket || 0), 0),
    retorno: venderVolta.length,
    retornoTicket: venderVolta.reduce((acc, i) => acc + (i.ticket || 0), 0),
    inativos: inativos.length,
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Central Comercial</p>
          <h1 className="font-display text-3xl font-bold">Gestão de Clientes</h1>
          <p className="text-muted-foreground mt-1">Leads para fechar, retornos pendentes e base inativa — tudo em um lugar.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            setEditingId(null);
            setForm({ nome: "", telefone: "", whatsapp: "", cidade: "", tag: "quente", observacoes: "", valor_compra: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow rounded-full px-6 h-10 font-semibold"><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-lg bg-card/95 backdrop-blur-xl border-border/60 shadow-2xl">
            <DialogHeader><DialogTitle className="font-display text-xl">{editingId ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 bg-background/50" value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} placeholder="Ex: Bruno Abreu" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 bg-background/50" value={form.telefone} onChange={e => setForm(f => ({...f, telefone: e.target.value}))} placeholder="(11) 98765-4321" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 bg-background/50" value={form.whatsapp} onChange={e => setForm(f => ({...f, whatsapp: e.target.value}))} placeholder="(11) 98765-4321" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 bg-background/50" value={form.cidade} onChange={e => setForm(f => ({...f, cidade: e.target.value}))} placeholder="Ex: São Paulo" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Classificação / Foco</Label>
                  <Select value={form.tag} onValueChange={(v: Tag) => setForm(f => ({...f, tag: v}))}>
                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {formTags.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Valor do Ticket Médio (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 bg-background/50" type="number" step="0.01" value={form.valor_compra} onChange={e => setForm(f => ({...f, valor_compra: e.target.value}))} placeholder="Ex: 1500.00" />
                </div>
                {Number(form.valor_compra) > 0 && (
                  <p className="text-xs text-success mt-1.5 font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Comissão (8%): R$ {getComissao(Number(form.valor_compra)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Observações Adicionais</Label>
                <div className="relative">
                  <NotebookPen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea className="pl-9 bg-background/50 min-h-[80px]" value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} placeholder="Detalhes relevantes sobre o passageiro..." />
                </div>
              </div>
              
              <div className="pt-2">
                <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl h-10 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} {editingId ? "Salvar Alterações" : "Cadastrar Cliente"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Flame className="h-4 w-4" />} label="Fechar Venda" value={counts.fechar} pipeline={counts.fecharTicket} accent="text-destructive border-t-destructive" active={tab === "fechar"} onClick={() => setTab("fechar")} />
        <StatCard icon={<RotateCcw className="h-4 w-4" />} label="Vender Volta" value={counts.retorno} pipeline={counts.retornoTicket} accent="text-warning border-t-warning" active={tab === "retorno"} onClick={() => setTab("retorno")} />
        <StatCard icon={<Snowflake className="h-4 w-4" />} label="Inativos" value={counts.inativos} accent="text-muted-foreground border-t-muted-foreground" active={tab === "inativos"} onClick={() => setTab("inativos")} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Base total" value={counts.todos} accent="text-primary border-t-primary" active={tab === "todos"} onClick={() => setTab("todos")} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
        <div className="bg-card-elevated/50 p-2 rounded-xl flex flex-col md:flex-row gap-2 items-center">
          <TabsList className="bg-background/30 rounded-lg p-1">
            <TabsTrigger value="fechar" className="rounded-md"><Flame className="h-3.5 w-3.5 mr-1.5" />Fechar venda</TabsTrigger>
            <TabsTrigger value="retorno" className="rounded-md"><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Vender retorno</TabsTrigger>
            <TabsTrigger value="inativos" className="rounded-md"><Snowflake className="h-3.5 w-3.5 mr-1.5" />Inativos</TabsTrigger>
            <TabsTrigger value="todos" className="rounded-md"><Users className="h-3.5 w-3.5 mr-1.5" />Todos</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 w-full md:max-w-sm ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." className="pl-9 bg-background/50 border-transparent focus-visible:border-primary transition-colors h-10 rounded-lg w-full" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <TabsContent value="fechar"><ActionGrid items={applySearch(fecharVenda)} emptyMsg="Nenhum lead em negociação no momento. Bom momento pra prospectar!" /></TabsContent>
            <TabsContent value="retorno"><ActionGrid items={applySearch(venderVolta)} emptyMsg="Excelente! Ninguém com ida sem retorno nos últimos 30 dias." /></TabsContent>
            <TabsContent value="inativos"><ActionGrid items={applySearch(inativos)} emptyMsg="Sua base está aquecida — nenhum cliente inativo." /></TabsContent>
            <TabsContent value="todos"><PassageirosTable items={applySearch(items)} onEdit={handleEdit} onDelete={handleDelete} /></TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, accent, active, onClick, pipeline }: { icon: React.ReactNode; label: string; value: number; accent: string; active: boolean; onClick: () => void; pipeline?: number }) {
  const accentColorClass = accent.split(' ').find(c => c.startsWith('text-')) || '';
  const accentBorderClass = accent.split(' ').find(c => c.startsWith('border-t-')) || '';
  
  return (
    <Card onClick={onClick} className={`glass-card p-5 cursor-pointer transition-all border-t-4 ${accentBorderClass} ${active ? "shadow-glow scale-[1.02]" : "hover:scale-[1.01]"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`${accentColorClass} flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold`}>{icon}{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <p className="font-display text-3xl font-bold">{value}</p>
        {pipeline !== undefined && pipeline > 0 && (
          <div className="text-right">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Pipeline Ativo</p>
            <p className="text-sm font-bold text-foreground">R$ {pipeline.toLocaleString("pt-BR")}</p>
            <p className="text-[10px] text-success font-semibold flex items-center gap-1 justify-end"><TrendingUp className="h-3 w-3" /> R$ {(pipeline * 0.08).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function ActionGrid({ items, emptyMsg }: { items: ActionItem[]; emptyMsg: string }) {
  if (items.length === 0) {
    return (
      <Card className="glass-card p-16 text-center flex flex-col items-center justify-center text-muted-foreground">
        {/* <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-4" /> */}
        <h3 className="text-lg font-display font-semibold text-foreground">Tudo limpo por aqui!</h3>
        <p className="text-sm">{emptyMsg}</p>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map(it => {
        const wa = waLink(it.whatsapp ?? it.telefone, it.msg);
        return (
          <Card key={it.id} className="glass-card flex flex-col p-5 hover:border-primary/40 transition-all group overflow-hidden relative">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-gold shadow-glow flex items-center justify-center text-primary-foreground text-sm font-bold tracking-wider">
                  {it.nome.split(" ").map(w => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-base truncate text-foreground/90">{it.nome}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{it.subtitle}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-card-elevated/30 rounded-lg p-2.5 mb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{it.telefone || "Sem telefone"}</span>
              </div>
              {it.badge && <Badge variant="outline" className={`shrink-0 text-[10px] uppercase font-bold tracking-wider px-2 border-transparent bg-background ${it.badge.className}`}>{it.badge.label}</Badge>}
            </div>

            {(it.observacoes || (it.ticket !== undefined && it.ticket > 0)) && (
              <div className="flex flex-col gap-2 text-xs text-muted-foreground mb-4 pb-4 border-b border-border/50">
                {it.ticket !== undefined && it.ticket > 0 && (
                  <div className="grid grid-cols-2 gap-2 bg-secondary/20 p-2.5 rounded-lg border border-border/30">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">Ticket</p>
                      <p className="font-bold text-foreground text-sm">R$ {Number(it.ticket).toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-success/70 font-semibold mb-0.5">Comissão Estimada</p>
                      <p className="font-bold text-success text-sm flex items-center gap-1"><TrendingUp className="h-3 w-3" /> R$ {getComissao(Number(it.ticket)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                )}
                {it.observacoes && (
                  <div className="italic line-clamp-2 mt-1 px-1" title={it.observacoes}>
                    "{it.observacoes}"
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-auto flex gap-2">
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer" className="flex-1">
                  <Button className="w-full h-10 bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow rounded-xl font-semibold">
                    <MessageCircle className="h-4 w-4 mr-2" />Contato <ArrowRight className="h-4 w-4 ml-1 opacity-60" />
                  </Button>
                </a>
              ) : (
                <Button disabled className="flex-1 h-10 rounded-xl bg-muted text-muted-foreground">Sem WhatsApp</Button>
              )}
              {it.telefone && (
                <a href={`tel:${it.telefone}`}>
                  <Button variant="outline" className="border-border h-10 w-10 p-0 rounded-xl hover:bg-primary/5 hover:text-primary"><Phone className="h-4 w-4" /></Button>
                </a>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function PassageirosTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Passageiro[];
  onEdit: (p: Passageiro) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <Card className="glass-card p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
        <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-display font-semibold text-foreground">Nenhum cliente cadastrado</h3>
        <p className="text-sm">Cadastre um novo passageiro para vê-lo aqui.</p>
      </Card>
    );
  }
  return (
    <Card className="glass-card overflow-hidden border border-border/50">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card-elevated/20">
              <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground p-4 w-[250px]">Cliente</th>
              <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground p-4">Região</th>
              <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground p-4">Histórico</th>
              <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground p-4">LTV / Comissão</th>
              <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground p-4">Status</th>
              <th className="text-left font-medium text-[11px] uppercase tracking-wider text-muted-foreground p-4">Infos Adicionais</th>
              <th className="text-right font-medium text-[11px] uppercase tracking-wider text-muted-foreground p-4 w-[120px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-border/30 hover:bg-primary/5 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-secondary text-secondary-foreground border border-border/50 flex items-center justify-center text-xs font-bold">{p.nome.split(" ").map(w => w[0]).slice(0,2).join("")}</div>
                    <div className="min-w-0">
                      <p className="font-semibold flex items-center gap-1.5 text-foreground/90 truncate">{p.nome}{p.tag === "vip" && <Star className="h-3.5 w-3.5 text-primary fill-primary" />}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.telefone || "Sem fone"}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground font-medium text-xs">{p.cidade || "—"}</td>
                <td className="p-4">
                  <Badge variant="secondary" className="bg-background/50 border-border/40 font-semibold">{p.total_viagens} {p.total_viagens === 1 ? 'viagem' : 'viagens'}</Badge>
                </td>
                <td className="p-4">
                  <div className="font-bold text-sm text-foreground/90">R$ {Number(p.ticket_medio).toLocaleString("pt-BR")}</div>
                  {p.ticket_medio > 0 && (
                    <div className="text-[10px] text-success font-medium flex items-center gap-1 mt-0.5">
                      <TrendingUp className="h-3 w-3" /> R$ {getComissao(Number(p.ticket_medio)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <Badge variant="outline" className={`font-semibold tracking-wide uppercase text-[10px] px-2 py-0.5 border-transparent bg-background ${tagStyle[p.tag]}`}>{tagLabel[p.tag]}</Badge>
                </td>
                <td className="p-4 text-muted-foreground text-xs max-w-[200px] truncate" title={p.observacoes || ""}>
                  {p.observacoes ? <span className="italic">"{p.observacoes}"</span> : "—"}
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(p.whatsapp || p.telefone) && (
                      <a href={waLink(p.whatsapp ?? p.telefone, `Oi ${p.nome.split(" ")[0]}!`) ?? "#"} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success hover:bg-success/10"><MessageCircle className="h-4 w-4" /></Button>
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => onEdit(p)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
