import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, MessageCircle, Phone } from "lucide-react";

const cidades = [
  {
    nome: "Porto Seguro",
    antes: "Eunápolis",
    depois: "Arraial d'Ajuda",
    proprietario: "Carlos Silva",
    contato: "5577999991111",
  },
  {
    nome: "Eunápolis",
    antes: "Itapebi",
    depois: "Porto Seguro",
    proprietario: "Mariana Souza",
    contato: "5577999992222",
  },
  {
    nome: "Itabuna",
    antes: "Itapetinga",
    depois: "Ilhéus",
    proprietario: "João Lima",
    contato: "5577999993333",
  },
  {
    nome: "Ilhéus",
    antes: "Itabuna",
    depois: "Olivença",
    proprietario: "Fernanda Rocha",
    contato: "5577999994444",
  },
  {
    nome: "Itapetinga",
    antes: "Caatiba",
    depois: "Itabuna",
    proprietario: "Paulo Santos",
    contato: "5577999995555",
  },
  {
    nome: "Itambé",
    antes: "Caatiba",
    depois: "Vitória da Conquista",
    proprietario: "Ana Costa",
    contato: "5577999996666",
  },
];

export default function NHIntelligencePage() {
  const [listaCidades, setListaCidades] = useState(cidades);
  
  const [novaCidade, setNovaCidade] = useState({
    nome: "",
    antes: "",
    depois: "",
    proprietario: "",
    contato: "",
  });

  useEffect(() => {
    const salvo = localStorage.getItem("nh_cidades");
    if (salvo) {
      setListaCidades(JSON.parse(salvo));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("nh_cidades", JSON.stringify(listaCidades));
  }, [listaCidades]);

  const cadastrarCidade = () => {
    if (!novaCidade.nome) return;

    setListaCidades((prev) => [...prev, novaCidade]);
    setNovaCidade({
      nome: "",
      antes: "",
      depois: "",
      proprietario: "",
      contato: "",
    });
  };
  const [cidadeSelecionada, setCidadeSelecionada] = useState<any>(null);

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <section className="rounded-3xl border p-8 shadow-sm bg-card">
        <div className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-widest text-primary font-medium">
            NH Intelligence
          </p>

          <h1 className="text-4xl lg:text-5xl font-bold">
            Mapa de Cidades Atendidas
          </h1>

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
            <div className="grid md:grid-cols-3 gap-4">
              {listaCidades.map((cidade) => (
                <button
                  key={cidade.nome}
                  onClick={() => setCidadeSelecionada(cidade)}
                  className="rounded-2xl border p-5 text-left hover:shadow-md transition-all hover:border-primary"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="font-semibold">{cidade.nome}</span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {cidade.antes} → {cidade.nome} → {cidade.depois}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Cadastrar Nova Cidade</h2>

        <Card className="rounded-3xl border shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input
                className="border rounded-xl p-3"
                placeholder="Nome da cidade"
                value={novaCidade.nome}
                onChange={(e) => setNovaCidade({ ...novaCidade, nome: e.target.value })}
              />

              <input
                className="border rounded-xl p-3"
                placeholder="Cidade anterior"
                value={novaCidade.antes}
                onChange={(e) => setNovaCidade({ ...novaCidade, antes: e.target.value })}
              />

              <input
                className="border rounded-xl p-3"
                placeholder="Próxima cidade"
                value={novaCidade.depois}
                onChange={(e) => setNovaCidade({ ...novaCidade, depois: e.target.value })}
              />

              <input
                className="border rounded-xl p-3"
                placeholder="Nome do proprietário"
                value={novaCidade.proprietario}
                onChange={(e) => setNovaCidade({ ...novaCidade, proprietario: e.target.value })}
              />

              <input
                className="border rounded-xl p-3 md:col-span-2"
                placeholder="Contato / WhatsApp"
                value={novaCidade.contato}
                onChange={(e) => setNovaCidade({ ...novaCidade, contato: e.target.value })}
              />
            </div>

            <Button onClick={cadastrarCidade} className="rounded-2xl">
              Cadastrar Cidade
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Lista de Cidades Atendidas</h2>

        <Card className="rounded-3xl border shadow-sm">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-3">
              {listaCidades.map((cidade) => (
                <button
                  key={cidade.nome + "-lista"}
                  onClick={() => setCidadeSelecionada(cidade)}
                  className="rounded-xl border p-3 text-left hover:border-primary transition-all"
                >
                  {cidade.nome}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog
        open={!!cidadeSelecionada}
        onOpenChange={() => setCidadeSelecionada(null)}
      >
        <DialogContent className="rounded-3xl">
          {cidadeSelecionada && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {cidadeSelecionada.nome}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Cidade anterior</p>
                  <p className="font-medium">{cidadeSelecionada.antes}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Próxima cidade</p>
                  <p className="font-medium">{cidadeSelecionada.depois}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Proprietário</p>
                  <p className="font-medium">{cidadeSelecionada.proprietario}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Contato</p>
                  <p className="font-medium">{cidadeSelecionada.contato}</p>
                </div>

                <a
                  href={`https://wa.me/${cidadeSelecionada.contato}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full rounded-2xl gap-2 mt-2">
                    <Phone className="w-4 h-4" />
                    Entrar em contato
                  </Button>
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Resumo Estratégico</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl border shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total de Cidades</p><p className="text-3xl font-bold">{listaCidades.length}</p></CardContent></Card>
          <Card className="rounded-3xl border shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Rotas Ativas</p><p className="text-3xl font-bold">18</p></CardContent></Card>
          <Card className="rounded-3xl border shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Parceiros</p><p className="text-3xl font-bold">27</p></CardContent></Card>
          <Card className="rounded-3xl border shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Expansão</p><p className="text-3xl font-bold">+5</p></CardContent></Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Oportunidades Comerciais</h2>
        <Card className="rounded-3xl border shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="rounded-2xl border p-4"><p className="font-semibold">Porto Seguro → Alta demanda de retorno</p><p className="text-sm text-muted-foreground mt-1">Ideal para campanha de volta e pacotes família.</p></div>
            <div className="rounded-2xl border p-4"><p className="font-semibold">Eunápolis → Forte potencial de revenda</p><p className="text-sm text-muted-foreground mt-1">Excelente ponto para novos parceiros regionais.</p></div>
            <div className="rounded-2xl border p-4"><p className="font-semibold">Itabuna → Expansão comercial</p><p className="text-sm text-muted-foreground mt-1">Bom potencial para campanhas e atendimento corporativo.</p></div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button className="rounded-2xl h-14">Nova Campanha</Button>
          <Button variant="outline" className="rounded-2xl h-14">Cadastrar Parceiro</Button>
          <Button variant="outline" className="rounded-2xl h-14">Exportar Cidades</Button>
          <Button variant="outline" className="rounded-2xl h-14">Relatório Comercial</Button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Observações Internas</h2>
        <Card className="rounded-3xl border shadow-sm">
          <CardContent className="p-6">
            <textarea className="w-full min-h-[160px] rounded-2xl border p-4" placeholder="Anotações sobre cidades, oportunidades e contatos importantes..." />
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
