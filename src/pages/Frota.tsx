import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bus, MapPin, User, Plus, Filter, Loader2, Edit2, Trash2, Map, Wifi, Snowflake, Plug, Droplet, ArrowDownRight, ArrowUpRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

type VStatus = "operando" | "agendado" | "finalizado" | "manutencao";
interface Veiculo {
  id: string; placa: string; modelo: string; capacidade: number;
  motorista_nome: string | null; status: VStatus; observacoes: string | null;
  embarques?: { id: string; origem: string; destino: string; data_saida: string; status: string }[];
}

const statusStyle: Record<VStatus, string> = {
  operando: "bg-success/15 text-success border-success/30",
  agendado: "bg-accent/15 text-accent border-accent/30",
  finalizado: "bg-muted text-muted-foreground border-border",
  manutencao: "bg-warning/15 text-warning border-warning/30",
};
const statusLabel: Record<VStatus, string> = {
  operando: "Em operação", agendado: "Agendado", finalizado: "Finalizado", manutencao: "Manutenção",
};

const COM_LIST = [
  { id: "wifi", label: "Wi-Fi", icon: <Wifi className="h-3.5 w-3.5" /> },
  { id: "ac", label: "Ar-Cond", icon: <Snowflake className="h-3.5 w-3.5" /> },
  { id: "usb", label: "USB", icon: <Plug className="h-3.5 w-3.5" /> },
  { id: "agua", label: "Água", icon: <Droplet className="h-3.5 w-3.5" /> },
];

interface VeiculoMeta {
  observacoes: string;
  classe: "Convencional" | "Executivo" | "Semi-Leito" | "Leito" | "Leito Cama";
  rota: "descida" | "subida" | "nenhuma";
  comodidades: string[];
}

const parseMeta = (obs: string | null): VeiculoMeta => {
  if (!obs) return { observacoes: "", classe: "Convencional", rota: "nenhuma", comodidades: [] };
  try {
    const data = JSON.parse(obs);
    if (data.isJsonMeta) {
      return {
        observacoes: data.observacoes || "",
        classe: data.classe || "Convencional",
        rota: data.rota || "nenhuma",
        comodidades: data.comodidades || [],
      };
    }
  } catch (e) {}
  return { observacoes: obs, classe: "Convencional", rota: "nenhuma", comodidades: [] };
};

const schema = z.object({
  placa: z.string().trim().min(4, "Placa inválida").max(10),
  modelo: z.string().trim().min(2, "Informe o modelo").max(120),
  capacidade: z.coerce.number().int().min(1).max(100),
  motorista_nome: z.string().trim().max(120).optional(),
  status: z.enum(["operando", "agendado", "finalizado", "manutencao"]),
});

export default function Frota() {
  const [items, setItems] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState("todos");
  
  const [form, setForm] = useState({ 
    placa: "", modelo: "", capacidade: "46", motorista_nome: "", status: "agendado" as VStatus, 
    observacoes: "", classe: "Convencional", rota: "nenhuma", comodidades: [] as string[] 
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("veiculos").select("*, embarques(id, origem, destino, data_saida, status)").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Veiculo[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleEdit = (v: Veiculo) => {
    setEditingId(v.id);
    const meta = parseMeta(v.observacoes);
    setForm({
      placa: v.placa,
      modelo: v.modelo,
      capacidade: String(v.capacidade),
      motorista_nome: v.motorista_nome || "",
      status: v.status,
      observacoes: meta.observacoes,
      classe: meta.classe,
      rota: meta.rota,
      comodidades: meta.comodidades,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Tem certeza que deseja excluir este veículo?")) return;
    const old = items;
    setItems(items.filter(i => i.id !== id));
    const { error } = await supabase.from("veiculos").delete().eq("id", id);
    if(error) { toast.error(error.message); setItems(old); return; }
    toast.success("Veículo excluído");
  };

  const handleSave = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    
    const obsJson = JSON.stringify({
      isJsonMeta: true,
      observacoes: form.observacoes,
      classe: form.classe,
      rota: form.rota,
      comodidades: form.comodidades,
    });

    const payload = {
      placa: parsed.data.placa.toUpperCase(),
      modelo: parsed.data.modelo,
      capacidade: parsed.data.capacidade,
      motorista_nome: parsed.data.motorista_nome || null,
      status: parsed.data.status,
      observacoes: obsJson,
    };

    if (editingId) {
      const { error } = await supabase.from("veiculos").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Veículo atualizado");
    } else {
      const { error } = await supabase.from("veiculos").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Veículo cadastrado");
    }
    
    setSaving(false);
    setOpen(false);
    resetForm();
    load();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ placa: "", modelo: "", capacidade: "46", motorista_nome: "", status: "agendado", observacoes: "", classe: "Convencional", rota: "nenhuma", comodidades: [] });
  };

  const filteredItems = items.filter(v => {
    if (tab === "todos") return true;
    const meta = parseMeta(v.observacoes);
    return meta.rota === tab;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Frota Operacional</p>
          <h1 className="font-display text-3xl lg:text-4xl font-bold">Gestão de Carros</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Controle a disponibilidade, status e as configurações completas dos ônibus da sua frota.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo ônibus</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl">
              <DialogHeader><DialogTitle className="font-display text-xl">{editingId ? "Editar ônibus" : "Cadastrar ônibus"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-3">
                  <div><Label>Placa</Label><Input value={form.placa} onChange={e => setForm(f => ({...f, placa: e.target.value}))} placeholder="ABC-1D23" /></div>
                  <div><Label>Modelo</Label><Input value={form.modelo} onChange={e => setForm(f => ({...f, modelo: e.target.value}))} placeholder="Paradiso 1800 DD" /></div>
                  <div><Label>Motorista responsável</Label><Input value={form.motorista_nome} onChange={e => setForm(f => ({...f, motorista_nome: e.target.value}))} placeholder="Carlos Mendes" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Capacidade</Label><Input type="number" value={form.capacidade} onChange={e => setForm(f => ({...f, capacidade: e.target.value}))} /></div>
                    <div>
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v: VStatus) => setForm(f => ({...f, status: v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(statusLabel) as VStatus[]).map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label>Classe do Ônibus</Label>
                    <Select value={form.classe} onValueChange={(v: any) => setForm(f => ({...f, classe: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Convencional", "Executivo", "Semi-Leito", "Leito", "Leito Cama"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                    <Label className="mb-2 block">Comodidades</Label>
                    <div className="flex flex-wrap gap-2">
                      {COM_LIST.map(c => {
                        const active = form.comodidades.includes(c.id);
                        return (
                          <Badge
                            key={c.id}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer py-1.5"
                            onClick={() => {
                              if (active) setForm(f => ({ ...f, comodidades: f.comodidades.filter(x => x !== c.id) }));
                              else setForm(f => ({ ...f, comodidades: [...f.comodidades, c.id] }));
                            }}
                          >
                            {c.icon} <span className="ml-1">{c.label}</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div><Label>Observações Gerais</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} rows={2} /></div>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 mt-2">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar veículo
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["operando", "agendado", "finalizado", "manutencao"] as VStatus[]).map((s) => (
          <Card key={s} className="glass-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{statusLabel[s]}</p>
            <p className="font-display text-3xl font-bold mt-1">{items.filter(i => i.status === s).length}</p>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="flex items-center gap-4">
          <TabsList className="bg-card-elevated/50">
            <TabsTrigger value="todos">Todos os carros</TabsTrigger>
            <TabsTrigger value="descida" className="gap-2"><ArrowDownRight className="h-3.5 w-3.5 text-primary" /> Descida (Litoral)</TabsTrigger>
            <TabsTrigger value="subida" className="gap-2"><ArrowUpRight className="h-3.5 w-3.5 text-warning" /> Subida (Sudoeste)</TabsTrigger>
          </TabsList>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filteredItems.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <Bus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Nenhum veículo encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Sua frota não possui carros nesta categoria.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredItems.map((v) => {
              const meta = parseMeta(v.observacoes);
              return (
                <Card key={v.id} className="glass-card flex flex-col sm:flex-row overflow-hidden hover:border-primary/40 transition-all group">
                  <div className="bg-primary/5 p-6 flex flex-col items-center justify-center sm:w-48 border-b sm:border-b-0 sm:border-r border-border/50 shrink-0">
                    <Bus className="h-10 w-10 text-primary mb-3 opacity-80" />
                    <Badge variant="outline" className="bg-background font-bold text-[10px] uppercase tracking-wider mb-1 border-primary/20">{meta.classe}</Badge>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">{v.capacidade} lugares</p>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display font-bold text-xl">{v.placa}</h3>
                          <Badge variant="outline" className={`text-[10px] ${statusStyle[v.status]}`}>{statusLabel[v.status]}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">{v.modelo}</p>
                      </div>
                      <div className="flex gap-1 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(v)}><Edit2 className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(v.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    
                    <div className="mt-auto space-y-3">
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                          <User className="h-3.5 w-3.5" /> <span className="font-medium text-foreground text-xs">{v.motorista_nome || "Sem motorista"}</span>
                        </div>
                        {meta.rota !== "nenhuma" && (
                          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${meta.rota === "descida" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
                            <Map className="h-3.5 w-3.5" /> 
                            <span className="font-medium">
                              {meta.rota === "descida" ? "Linha Descida (Litoral)" : "Linha Subida (Sudoeste)"}
                            </span>
                          </div>
                        )}
                      </div>

                      {v.embarques && v.embarques.filter(e => e.status !== 'cancelado' && e.status !== 'finalizado').length > 0 && (
                        <div className="pt-3 border-t border-border/50">
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Viagens Agendadas</p>
                          <div className="space-y-1.5">
                            {v.embarques.filter(e => e.status !== 'cancelado' && e.status !== 'finalizado')
                              .sort((a,b) => new Date(a.data_saida).getTime() - new Date(b.data_saida).getTime())
                              .map(emb => {
                                const dt = new Date(emb.data_saida);
                                return (
                                  <div key={emb.id} className="flex justify-between items-center bg-primary/5 border border-primary/10 rounded-md p-1.5 px-2.5">
                                    <span className="text-xs font-medium">{emb.origem} → {emb.destino}</span>
                                    <span className="text-[10px] text-muted-foreground font-semibold">{dt.toLocaleDateString("pt-BR", {day:'2-digit', month:'short'})}</span>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}
                      
                      {meta.comodidades.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                          {meta.comodidades.map(c => {
                              const info = COM_LIST.find(x => x.id === c);
                              if(!info) return null;
                              return <div key={c} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-accent/5 border border-border/50 px-2 py-1 rounded-md">{info.icon} {info.label}</div>
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Tabs>
    </div>
  );
}
