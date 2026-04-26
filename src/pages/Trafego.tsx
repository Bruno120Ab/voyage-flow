import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Phone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Cidade {
  id?: string;
  nome: string;
  antes: string;
  depois: string;
  proprietario: string;
  contato: string;
}

const formInicial: Cidade = {
  nome: "",
  antes: "",
  depois: "",
  proprietario: "",
  contato: "",
};

export default function NHIntelligencePage() {
  const [listaCidades, setListaCidades] = useState<Cidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaCidade, setNovaCidade] = useState<Cidade>(formInicial);
  const [cidadeSelecionada, setCidadeSelecionada] = useState<Cidade | null>(null);

  const carregar = async () => {
    const { data } = await supabase
      .from("cidades_rota")
      .select("id, nome, antes, depois, proprietario, contato")
      .order("nome", { ascending: true });
    setListaCidades(
      (data || []).map((c: any) => ({
        id: c.id,
        nome: c.nome,
        antes: c.antes ?? "",
        depois: c.depois ?? "",
        proprietario: c.proprietario ?? "",
        contato: c.contato ?? "",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    const ch = supabase
      .channel("cidades-rota-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cidades_rota" }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const cadastrarCidade = async () => {
    if (!novaCidade.nome) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("cidades_rota").insert({
      nome: novaCidade.nome,
      antes: novaCidade.antes || null,
      depois: novaCidade.depois || null,
      proprietario: novaCidade.proprietario || null,
      contato: novaCidade.contato || null,
      created_by: user?.id,
    });
    setNovaCidade(formInicial);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <section className="rounded-3xl border p-8 shadow-sm bg-card">
        <div className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-widest text-primary font-medium">
            NH Intelligence
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold">Mapa de Cidades Atendidas</h1>
          <p className="text-muted-foreground max-w-2xl">
            Clique em uma cidade para visualizar conexões da rota, contato e
            informações do responsável local.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Conexão entre Cidades</h2>
        <Card className="rounded-3xl border shadow-sm">
          <CardContent className="p-8">
            {listaCidades.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma cidade cadastrada ainda.</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {listaCidades.map((cidade) => (
                  <button
                    key={cidade.id}
                    onClick={() => setCidadeSelecionada(cidade)}
                    className="rounded-2xl border p-5 text-left hover:shadow-md transition-all hover:border-primary"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span className="font-semibold">{cidade.nome}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {cidade.antes || "—"} → {cidade.nome} → {cidade.depois || "—"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Cadastrar Nova Cidade</h2>
        <Card className="rounded-3xl border shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input className="border rounded-xl p-3 bg-background" placeholder="Nome da cidade" value={novaCidade.nome} onChange={(e) => setNovaCidade({ ...novaCidade, nome: e.target.value })} />
              <input className="border rounded-xl p-3 bg-background" placeholder="Cidade anterior" value={novaCidade.antes} onChange={(e) => setNovaCidade({ ...novaCidade, antes: e.target.value })} />
              <input className="border rounded-xl p-3 bg-background" placeholder="Próxima cidade" value={novaCidade.depois} onChange={(e) => setNovaCidade({ ...novaCidade, depois: e.target.value })} />
              <input className="border rounded-xl p-3 bg-background" placeholder="Nome do proprietário" value={novaCidade.proprietario} onChange={(e) => setNovaCidade({ ...novaCidade, proprietario: e.target.value })} />
              <input className="border rounded-xl p-3 bg-background md:col-span-2" placeholder="Contato / WhatsApp" value={novaCidade.contato} onChange={(e) => setNovaCidade({ ...novaCidade, contato: e.target.value })} />
            </div>
            <Button onClick={cadastrarCidade} className="rounded-2xl">Cadastrar Cidade</Button>
          </CardContent>
        </Card>
      </section>

      <Dialog open={!!cidadeSelecionada} onOpenChange={() => setCidadeSelecionada(null)}>
        <DialogContent className="rounded-3xl">
          {cidadeSelecionada && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{cidadeSelecionada.nome}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div><p className="text-sm text-muted-foreground">Cidade anterior</p><p className="font-medium">{cidadeSelecionada.antes || "—"}</p></div>
                <div><p className="text-sm text-muted-foreground">Próxima cidade</p><p className="font-medium">{cidadeSelecionada.depois || "—"}</p></div>
                <div><p className="text-sm text-muted-foreground">Proprietário</p><p className="font-medium">{cidadeSelecionada.proprietario || "—"}</p></div>
                <div><p className="text-sm text-muted-foreground">Contato</p><p className="font-medium">{cidadeSelecionada.contato || "—"}</p></div>
                {cidadeSelecionada.contato && (
                  <a href={`https://wa.me/${cidadeSelecionada.contato.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full rounded-2xl gap-2 mt-2">
                      <Phone className="w-4 h-4" /> Entrar em contato
                    </Button>
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Resumo Estratégico</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl border shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total de Cidades</p><p className="text-3xl font-bold">{listaCidades.length}</p></CardContent></Card>
          <Card className="rounded-3xl border shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Com Proprietário</p><p className="text-3xl font-bold">{listaCidades.filter(c => c.proprietario).length}</p></CardContent></Card>
          <Card className="rounded-3xl border shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Com Contato</p><p className="text-3xl font-bold">{listaCidades.filter(c => c.contato).length}</p></CardContent></Card>
          <Card className="rounded-3xl border shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Conexões Mapeadas</p><p className="text-3xl font-bold">{listaCidades.filter(c => c.antes && c.depois).length}</p></CardContent></Card>
        </div>
      </section>
    </div>
  );
}
