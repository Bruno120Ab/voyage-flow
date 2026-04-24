import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  Truck,
  CheckCircle2,
  Clock3,
  MapPin,
  User,
} from "lucide-react";

const encomendas = [
  {
    id: 1,
    codigo: "ENC-1021",
    cliente: "Maria Santos",
    origem: "Porto Seguro",
    destino: "Vitória da Conquista",
    status: "Chegando",
    previsao: "14:30",
    responsavel: "Agência Porto",
  },
  {
    id: 2,
    codigo: "ENC-1022",
    cliente: "João Lima",
    origem: "Itapetinga",
    destino: "Vitória da Conquista",
    status: "Recebida",
    previsao: "Já na agência",
    responsavel: "Recepção",
  },
  {
    id: 3,
    codigo: "ENC-1023",
    cliente: "Fernanda Alves",
    origem: "Itambé",
    destino: "Vitória da Conquista",
    status: "Entregue",
    previsao: "Finalizada",
    responsavel: "Entrega Local",
  },
  {
    id: 4,
    codigo: "ENC-1024",
    cliente: "Carlos Rocha",
    origem: "Eunápolis",
    destino: "Vitória da Conquista",
    status: "Chegando",
    previsao: "18:00",
    responsavel: "Agência Eunápolis",
  },
];

export default function PaginaEncomendas() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const filtradas = useMemo(() => {
    return encomendas.filter((item) => {
      const termo = busca.toLowerCase();

      const matchBusca =
        item.codigo.toLowerCase().includes(termo) ||
        item.cliente.toLowerCase().includes(termo) ||
        item.origem.toLowerCase().includes(termo) ||
        item.destino.toLowerCase().includes(termo);

      const matchStatus =
        filtroStatus === "todos" || item.status === filtroStatus;

      return matchBusca && matchStatus;
    });
  }, [busca, filtroStatus]);

  const total = encomendas.length;
  const chegando = encomendas.filter((i) => i.status === "Chegando").length;
  const recebidas = encomendas.filter((i) => i.status === "Recebida").length;
  const entregues = encomendas.filter((i) => i.status === "Entregue").length;

  const badgeVariant = (status) => {
    if (status === "Entregue") return "default";
    if (status === "Chegando") return "secondary";
    return "outline";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Central de Encomendas</h1>
            <p className="text-muted-foreground">
              Controle de entrada, chegada e entrega de encomendas da agência
            </p>
          </div>

          <Button className="rounded-2xl h-11 px-6">
            + Nova encomenda
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total</p>
              <h2 className="text-2xl font-bold mt-1">{total}</h2>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Chegando</p>
              <h2 className="text-2xl font-bold mt-1">{chegando}</h2>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Recebidas</p>
              <h2 className="text-2xl font-bold mt-1">{recebidas}</h2>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Entregues</p>
              <h2 className="text-2xl font-bold mt-1">{entregues}</h2>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
                <Input
                  className="pl-10 h-11 rounded-xl"
                  placeholder="Buscar por código, cliente ou cidade..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <select
                className="h-11 rounded-xl border bg-background px-3"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="todos">Todos os status</option>
                <option value="Chegando">Chegando</option>
                <option value="Recebida">Recebidas</option>
                <option value="Entregue">Entregues</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((item) => (
            <Card
              key={item.id}
              className="rounded-2xl border shadow-sm hover:shadow-md transition-all"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{item.codigo}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.cliente}
                    </p>
                  </div>

                  <Badge variant={badgeVariant(item.status)}>
                    {item.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{item.origem} → {item.destino}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock3 className="w-4 h-4" />
                    <span>{item.previsao}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{item.responsavel}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 rounded-xl" size="sm">
                    Ver detalhes
                  </Button>

                  <Button variant="outline" size="sm" className="rounded-xl">
                    Atualizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
