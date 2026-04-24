import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Building2,
  Users,
  Search,
  MessageCircle,
  Clock,
  Landmark,
} from "lucide-react";

const contatos = [
  {
    id: 1,
    nome: "CCO Operacional",
    setor: "CCO",
    responsavel: "Controle Operacional",
    telefone: "(77) 99999-4444",
    cidade: "Central",
    prioridade: "Urgente",
    horario: "24h",
    tipo: "setor",
  },
  {
    id: 2,
    nome: "Financeiro",
    setor: "Financeiro",
    responsavel: "Setor Financeiro",
    telefone: "(77) 99999-5555",
    cidade: "Matriz",
    prioridade: "Alta",
    horario: "08:00 às 18:00",
    tipo: "setor",
  },
  {
    id: 3,
    nome: "Supervisor Regional",
    setor: "Supervisão",
    responsavel: "Carlos Mendes",
    telefone: "(77) 99999-3333",
    cidade: "Regional",
    prioridade: "Alta",
    horario: "07:00 às 22:00",
    tipo: "setor",
  },
  {
    id: 4,
    nome: "Suporte Administrativo",
    setor: "Administrativo",
    responsavel: "Backoffice",
    telefone: "(77) 99999-6666",
    cidade: "Matriz",
    prioridade: "Normal",
    horario: "08:00 às 17:30",
    tipo: "setor",
  },
  {
    id: 5,
    nome: "Agência Porto Seguro",
    setor: "Agência",
    responsavel: "Atendimento Geral",
    telefone: "(73) 99999-1111",
    cidade: "Porto Seguro",
    prioridade: "Alta",
    horario: "06:00 às 22:00",
    tipo: "agencia",
  },
  {
    id: 6,
    nome: "Agência Itapetinga",
    setor: "Agência",
    responsavel: "Recepção",
    telefone: "(77) 99999-2222",
    cidade: "Itapetinga",
    prioridade: "Normal",
    horario: "06:00 às 21:00",
    tipo: "agencia",
  },
  {
    id: 7,
    nome: "Agência Itambé",
    setor: "Agência",
    responsavel: "Atendimento Local",
    telefone: "(77) 99999-7777",
    cidade: "Itambé",
    prioridade: "Normal",
    horario: "06:00 às 20:00",
    tipo: "agencia",
  },
];

export default function PaginaContatos() {
  const [busca, setBusca] = useState("");

  const contatosFiltrados = contatos.filter((item) => {
    const termo = busca.toLowerCase();
    return (
      item.nome.toLowerCase().includes(termo) ||
      item.setor.toLowerCase().includes(termo) ||
      item.cidade.toLowerCase().includes(termo)
    );
  });

  const setoresImportantes = contatosFiltrados.filter(
    (item) => item.tipo === "setor"
  );

  const agencias = contatosFiltrados.filter(
    (item) => item.tipo === "agencia"
  );

  const total = contatos.length;

  const badgeStyle = (prioridade) => {
    if (prioridade === "Urgente") return "destructive";
    if (prioridade === "Alta") return "default";
    return "secondary";
  };

  const CardContato = ({ item }) => (
    <Card className="rounded-2xl border shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base">{item.nome}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {item.responsavel}
            </p>
          </div>

          <Badge variant={badgeStyle(item.prioridade)}>
            {item.prioridade}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>{item.setor}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{item.cidade}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{item.horario}</span>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <Phone className="w-4 h-4" />
            <span>{item.telefone}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button className="flex-1 rounded-xl" size="sm">
            <Phone className="w-4 h-4 mr-2" />
            Ligar
          </Button>

          <Button variant="outline" size="sm" className="rounded-xl">
            <MessageCircle className="w-4 h-4" />
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

          <Button className="rounded-2xl h-11 px-6">
            + Novo contato
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total de contatos</p>
              <h2 className="text-2xl font-bold mt-1">{total}</h2>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Setores principais</p>
              <h2 className="text-2xl font-bold mt-1">{setoresImportantes.length}</h2>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Agências ativas</p>
              <h2 className="text-2xl font-bold mt-1">{agencias.length}</h2>
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

        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="w-5 h-5" />
              <h2 className="text-xl font-bold">Setores Estratégicos</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {setoresImportantes.map((item) => (
                <CardContato key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5" />
              <h2 className="text-xl font-bold">Contatos de Agências</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {agencias.map((item) => (
                <CardContato key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
