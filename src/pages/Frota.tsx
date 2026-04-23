import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bus, MapPin, User, Plus, Filter, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

type VStatus = "operando" | "agendado" | "finalizado" | "manutencao";
interface Veiculo {
  id: string; placa: string; modelo: string; capacidade: number;
  motorista_nome: string | null; status: VStatus; observacoes: string | null;
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

const schema = z.object({
  placa: z.string().trim().min(4, "Placa inválida").max(10),
  modelo: z.string().trim().min(2, "Informe o modelo").max(120),
  capacidade: z.coerce.number().int().min(1).max(100),
  motorista_nome: z.string().trim().max(120).optional(),
  status: z.enum(["operando", "agendado", "finalizado", "manutencao"]),
  observacoes: z.string().max(500).optional(),
});

export default function Frota() {
  const [items, setItems] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ placa: "", modelo: "", capacidade: "46", motorista_nome: "", status: "agendado" as VStatus, observacoes: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("veiculos").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Veiculo[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from("veiculos").insert({
      placa: parsed.data.placa.toUpperCase(),
      modelo: parsed.data.modelo,
      capacidade: parsed.data.capacidade,
      motorista_nome: parsed.data.motorista_nome || null,
      status: parsed.data.status,
      observacoes: parsed.data.observacoes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Veículo cadastrado");
    setOpen(false);
    setForm({ placa: "", modelo: "", capacidade: "46", motorista_nome: "", status: "agendado", observacoes: "" });
    load();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Frota</p>
          <h1 className="font-display text-3xl font-bold">Gestão de carros</h1>
          <p className="text-muted-foreground mt-1">Controle todos os veículos: operando, agendados e finalizados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border"><Filter className="h-4 w-4 mr-2" />Filtros</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo veículo</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-display">Cadastrar veículo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Placa</Label><Input value={form.placa} onChange={e => setForm(f => ({...f, placa: e.target.value}))} placeholder="ABC-1D23" /></div>
                  <div><Label>Capacidade</Label><Input type="number" value={form.capacidade} onChange={e => setForm(f => ({...f, capacidade: e.target.value}))} /></div>
                </div>
                <div><Label>Modelo</Label><Input value={form.modelo} onChange={e => setForm(f => ({...f, modelo: e.target.value}))} placeholder="Mercedes-Benz O-500" /></div>
                <div><Label>Motorista responsável</Label><Input value={form.motorista_nome} onChange={e => setForm(f => ({...f, motorista_nome: e.target.value}))} placeholder="Carlos Mendes" /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v: VStatus) => setForm(f => ({...f, status: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(statusLabel) as VStatus[]).map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} rows={2} /></div>
                <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
                </Button>
              </div>
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

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Bus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum veículo cadastrado ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Comece adicionando o primeiro carro da sua frota.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((v) => (
            <Card key={v.id} className="glass-card p-5 hover:border-primary/40 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Bus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-base">{v.placa}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{v.modelo}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusStyle[v.status]}>{statusLabel[v.status]}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><User className="h-3.5 w-3.5" /><span className="text-foreground">{v.motorista_nome || "—"}</span></div>
                <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span className="text-foreground">{v.capacidade} lugares</span></div>
                {v.observacoes && <p className="text-xs text-muted-foreground line-clamp-2 pt-2 border-t border-border/40">{v.observacoes}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
