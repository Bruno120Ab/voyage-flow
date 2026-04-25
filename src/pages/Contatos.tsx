import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Phone, Building2, Users, Search, MessageCircle, Clock, Landmark, Loader2, Pencil, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Contato = Database["public"]["Tables"]["contatos"]["Row"];
type Tipo = Database["public"]["Enums"]["contato_tipo"];
type Prioridade = Database["public"]["Enums"]["contato_prioridade"];

interface FormState {
  nome: string;
  responsavel: string;
  setor: string;
  cidade: string;
  telefone: string;
  whatsapp: string;
  horario: string;
  prioridade: Prioridade;
  tipo: Tipo;
  observacoes: string;
}

const emptyForm: FormState = {
  nome: "", responsavel: "", setor: "", cidade: "", telefone: "", whatsapp: "",
  horario: "", prioridade: "Normal", tipo: "setor", observacoes: "",
};

export default function PaginaContatos() {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("contatos").select("*").order("nome");
      if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      else setContatos((data ?? []) as Contato[]);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("contatos-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "contatos" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const abrirNovo = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const abrirEdicao = (c: Contato) => {
    setEditId(c.id);
    setForm({
      nome: c.nome,
      responsavel: c.responsavel ?? "",
      setor: c.setor ?? "",
      cidade: c.cidade ?? "",
      telefone: c.telefone ?? "",
      whatsapp: c.whatsapp ?? "",
      horario: c.horario ?? "",
      prioridade: c.prioridade,
      tipo: c.tipo,
      observacoes: c.observacoes ?? "",
    });
    setModalOpen(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const payload = {
      nome: form.nome.trim(),
      responsavel: form.responsavel || null,
      setor: form.setor || null,
      cidade: form.cidade || null,
      telefone: form.telefone || null,
      whatsapp: form.whatsapp || null,
      horario: form.horario || null,
      prioridade: form.prioridade,
      tipo: form.tipo,
      observacoes: form.observacoes || null,
    };

    if (editId) {
      const { error } = await supabase.from("contatos").update(payload).eq("id", editId);
      if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      else { toast({ title: "Contato atualizado" }); setModalOpen(false); }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("contatos").insert({ ...payload, created_by: user?.id ?? null });
      if (error) toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      else { toast({ title: "Contato criado" }); setModalOpen(false); }
    }
    setSalvando(false);
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este contato?")) return;
    const { error } = await supabase.from("contatos").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Contato excluído" });
  };

  const ligar = (tel: string | null) => {
    if (!tel) { toast({ title: "Sem telefone", variant: "destructive" }); return; }
    window.open(`tel:${tel.replace(/\D/g, "")}`);
  };

  const whats = (tel: string | null) => {
    if (!tel) { toast({ title: "Sem WhatsApp", variant: "destructive" }); return; }
    const num = tel.replace(/\D/g, "");
    window.open(`https://wa.me/55${num}`, "_blank");
  };

  const filtrados = contatos.filter((item) => {
    const t = busca.toLowerCase();
    return (
      item.nome.toLowerCase().includes(t) ||
      (item.setor ?? "").toLowerCase().includes(t) ||
      (item.cidade ?? "").toLowerCase().includes(t)
    );
  });

  const setores = filtrados.filter((i) => i.tipo === "setor");
  const agencias = filtrados.filter((i) => i.tipo === "agencia");

  const badgeStyle = (p: Prioridade): "destructive" | "default" | "secondary" => {
    if (p === "Urgente") return "destructive";
    if (p === "Alta") return "default";
    return "secondary";
  };

  const CardContato = ({ item }: { item: Contato }) => (
    <Card className="rounded-2xl border shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate">{item.nome}</h3>
            {item.responsavel && (
              <p className="text-sm text-muted-foreground mt-1">{item.responsavel}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={badgeStyle(item.prioridade)}>{item.prioridade}</Badge>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {item.setor && <div className="flex items-center gap-2"><Building2 className="w-4 h-4" /><span>{item.setor}</span></div>}
          {item.cidade && <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span>{item.cidade}</span></div>}
          {item.horario && <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{item.horario}</span></div>}
          {item.telefone && <div className="flex items-center gap-2 font-medium"><Phone className="w-4 h-4" /><span>{item.telefone}</span></div>}
        </div>

        <div className="flex gap-2 pt-2">
          <Button className="flex-1 rounded-xl" size="sm" onClick={() => ligar(item.telefone)}>
            <Phone className="w-4 h-4 mr-2" /> Ligar
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => whats(item.whatsapp || item.telefone)}>
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => abrirEdicao(item)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl text-destructive" onClick={() => excluir(item.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Central de Contatos</h1>
            <p className="text-muted-foreground">
              Setores estratégicos, agências e horários de funcionamento
            </p>
          </div>
          <Button className="rounded-2xl h-11 px-6" onClick={abrirNovo}>+ Novo contato</Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total de contatos</p>
              <h2 className="text-2xl font-bold mt-1">{contatos.length}</h2>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Setores principais</p>
              <h2 className="text-2xl font-bold mt-1">{contatos.filter(c => c.tipo === "setor").length}</h2>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Agências ativas</p>
              <h2 className="text-2xl font-bold mt-1">{contatos.filter(c => c.tipo === "agencia").length}</h2>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
              <Input
                className="pl-10 h-11 rounded-xl"
                placeholder="Buscar por agência, setor ou cidade..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : contatos.length === 0 ? (
          <Card className="rounded-2xl"><CardContent className="p-10 text-center text-muted-foreground">
            Nenhum contato cadastrado. Clique em "Novo contato" para começar.
          </CardContent></Card>
        ) : (
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Landmark className="w-5 h-5" />
                <h2 className="text-xl font-bold">Setores Estratégicos</h2>
              </div>
              {setores.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum setor encontrado.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                  {setores.map((item) => <CardContato key={item.id} item={item} />)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5" />
                <h2 className="text-xl font-bold">Contatos de Agências</h2>
              </div>
              {agencias.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma agência encontrada.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {agencias.map((item) => <CardContato key={item.id} item={item} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar contato" : "Novo contato"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Agência Porto Seguro" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: Tipo) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="setor">Setor</SelectItem>
                  <SelectItem value="agencia">Agência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v: Prioridade) => setForm({ ...form, prioridade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} placeholder="Ex: Financeiro" />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} placeholder="Ex: 08:00 às 18:00" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(77) 99999-0000" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(77) 99999-0000" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Salvar alterações" : "Criar contato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
