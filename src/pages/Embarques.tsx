import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Calendar, Clock, MapPin } from "lucide-react";
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
  veiculos?: { placa: string; modelo: string } | null;
}
interface Veiculo { id: string; placa: string; modelo: string; }

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
  observacoes: z.string().max(500).optional(),
});

export default function Embarques() {
  const [items, setItems] = useState<Embarque[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    origem: "", destino: "", local_embarque: "",
    data_saida: "", data_retorno: "",
    valor_operacao: "0", custo_operacao: "0",
    veiculo_id: "", status: "rascunho" as EStatus, observacoes: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: emb, error }, { data: vs }] = await Promise.all([
      supabase.from("embarques").select("*, veiculos(placa, modelo)").order("data_saida", { ascending: true }),
      supabase.from("veiculos").select("id, placa, modelo").order("placa"),
    ]);
    if (error) toast.error(error.message);
    setItems((emb as any) ?? []);
    setVeiculos((vs as Veiculo[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from("embarques").insert({
      origem: parsed.data.origem,
      destino: parsed.data.destino,
      local_embarque: parsed.data.local_embarque || null,
      data_saida: new Date(parsed.data.data_saida).toISOString(),
      data_retorno: parsed.data.data_retorno ? new Date(parsed.data.data_retorno).toISOString() : null,
      valor_operacao: parsed.data.valor_operacao,
      custo_operacao: parsed.data.custo_operacao,
      veiculo_id: parsed.data.veiculo_id || null,
      status: parsed.data.status,
      observacoes: parsed.data.observacoes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Embarque criado");
    setOpen(false);
    setForm({ origem: "", destino: "", local_embarque: "", data_saida: "", data_retorno: "", valor_operacao: "0", custo_operacao: "0", veiculo_id: "", status: "rascunho", observacoes: "" });
    load();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Operação</p>
          <h1 className="font-display text-3xl font-bold">Embarques</h1>
          <p className="text-muted-foreground mt-1">Próximas saídas, status e financeiro de cada operação.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo embarque</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Novo embarque</DialogTitle></DialogHeader>
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
              <div>
                <Label>Veículo</Label>
                <Select value={form.veiculo_id} onValueChange={(v) => setForm(f => ({...f, veiculo_id: v}))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar veículo" /></SelectTrigger>
                  <SelectContent>
                    {veiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</SelectItem>)}
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
              <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar embarque
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum embarque agendado</p>
          <p className="text-sm text-muted-foreground mt-1">Crie o primeiro embarque para começar a operar.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((e) => {
            const lucro = Number(e.valor_operacao) - Number(e.custo_operacao);
            const dt = new Date(e.data_saida);
            return (
              <Card key={e.id} className="glass-card p-5 hover:border-primary/40 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center justify-center h-16 w-16 rounded-xl bg-gradient-gold text-primary-foreground shrink-0">
                    <span className="text-[10px] uppercase font-semibold opacity-80">{dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
                    <span className="font-display font-bold text-xl leading-none">{dt.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-semibold">{e.origem} → {e.destino}</h3>
                      <Badge variant="outline" className={statusStyle[e.status]}>{statusLabel[e.status]}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>
                      {e.local_embarque && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{e.local_embarque}</div>}
                      {e.veiculos && <div className="text-foreground">🚌 {e.veiculos.placa} • {e.veiculos.modelo}</div>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50 text-center">
                      <div><p className="text-[10px] uppercase text-muted-foreground">Valor</p><p className="text-sm font-semibold">R$ {Number(e.valor_operacao).toLocaleString("pt-BR")}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">Custo</p><p className="text-sm font-semibold">R$ {Number(e.custo_operacao).toLocaleString("pt-BR")}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-foreground">Lucro</p><p className={`text-sm font-bold ${lucro > 0 ? "text-gradient-gold" : "text-muted-foreground"}`}>R$ {lucro.toLocaleString("pt-BR")}</p></div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
