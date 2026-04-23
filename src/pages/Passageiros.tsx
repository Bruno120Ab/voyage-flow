import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageCircle, Search, Plus, Star, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

type Tag = "novo" | "recorrente" | "vip" | "retorno" | "inativo" | "quente";
interface Passageiro {
  id: string; nome: string; telefone: string | null; whatsapp: string | null;
  cidade: string | null; tag: Tag; total_viagens: number; ticket_medio: number;
  ultima_viagem: string | null; observacoes: string | null;
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

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  cidade: z.string().trim().max(80).optional(),
  tag: z.enum(["novo", "recorrente", "vip", "retorno", "inativo", "quente"]),
  observacoes: z.string().max(500).optional(),
});

export default function Passageiros() {
  const [items, setItems] = useState<Passageiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Tag | "todos">("todos");
  const [form, setForm] = useState({ nome: "", telefone: "", whatsapp: "", cidade: "", tag: "novo" as Tag, observacoes: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("passageiros").select("*").order("nome");
    if (error) toast.error(error.message);
    setItems((data as Passageiro[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from("passageiros").insert({
      nome: parsed.data.nome,
      telefone: parsed.data.telefone || null,
      whatsapp: parsed.data.whatsapp || parsed.data.telefone || null,
      cidade: parsed.data.cidade || null,
      tag: parsed.data.tag,
      observacoes: parsed.data.observacoes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Passageiro cadastrado");
    setOpen(false);
    setForm({ nome: "", telefone: "", whatsapp: "", cidade: "", tag: "novo", observacoes: "" });
    load();
  };

  const filtered = items.filter(p => {
    if (filter !== "todos" && p.tag !== filter) return false;
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !(p.telefone ?? "").includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Passageiros</p>
          <h1 className="font-display text-3xl font-bold">Base de clientes</h1>
          <p className="text-muted-foreground mt-1">Histórico, frequência, ticket médio e classificação automática.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo passageiro</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-display">Cadastrar passageiro</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome completo</Label><Input value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(f => ({...f, telefone: e.target.value}))} placeholder="(11) 98765-4321" /></div>
                <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm(f => ({...f, whatsapp: e.target.value}))} placeholder="(11) 98765-4321" /></div>
              </div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm(f => ({...f, cidade: e.target.value}))} /></div>
              <div>
                <Label>Classificação</Label>
                <Select value={form.tag} onValueChange={(v: Tag) => setForm(f => ({...f, tag: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(tagLabel) as Tag[]).map(t => <SelectItem key={t} value={t}>{tagLabel[t]}</SelectItem>)}
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

      <Card className="glass-card p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou telefone..." className="pl-9 bg-background border-border/60" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["todos", ...Object.keys(tagLabel)] as (Tag | "todos")[]).map((f) => (
            <Badge
              key={f}
              variant="outline"
              onClick={() => setFilter(f)}
              className={`cursor-pointer capitalize ${filter === f ? "bg-primary/15 text-primary border-primary/30" : "border-border hover:border-primary/40"}`}
            >{f === "todos" ? "Todos" : tagLabel[f as Tag]}</Badge>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum passageiro encontrado</p>
        </Card>
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card-elevated/40">
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Passageiro</th>
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Cidade</th>
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Viagens</th>
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Ticket</th>
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Status</th>
                  <th className="text-right font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/40 hover:bg-card-elevated/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-xs font-bold">{p.nome.split(" ").map(w => w[0]).slice(0,2).join("")}</div>
                        <div>
                          <p className="font-medium flex items-center gap-1.5">{p.nome}{p.tag === "vip" && <Star className="h-3 w-3 text-primary fill-primary" />}</p>
                          <p className="text-xs text-muted-foreground">{p.telefone || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{p.cidade || "—"}</td>
                    <td className="p-4 font-semibold">{p.total_viagens}</td>
                    <td className="p-4">R$ {Number(p.ticket_medio).toLocaleString("pt-BR")}</td>
                    <td className="p-4"><Badge variant="outline" className={tagStyle[p.tag]}>{tagLabel[p.tag]}</Badge></td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        {p.whatsapp && <a href={`https://wa.me/55${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success"><MessageCircle className="h-4 w-4" /></Button></a>}
                        {p.telefone && <a href={`tel:${p.telefone}`}><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Phone className="h-4 w-4" /></Button></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
