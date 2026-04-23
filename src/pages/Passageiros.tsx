import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { passageiros } from "@/lib/mock-data";
import { Phone, MessageCircle, Search, Plus, Star } from "lucide-react";

const tagStyle: Record<string, string> = {
  VIP: "bg-gradient-gold text-primary-foreground border-0",
  Recorrente: "bg-accent/15 text-accent border-accent/30",
  Retorno: "bg-warning/15 text-warning border-warning/30",
  Inativo: "bg-muted text-muted-foreground border-border",
  Quente: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Passageiros() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Passageiros</p>
          <h1 className="font-display text-3xl font-bold">Base de clientes</h1>
          <p className="text-muted-foreground mt-1">Histórico, frequência, ticket médio e classificação automática.</p>
        </div>
        <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow"><Plus className="h-4 w-4 mr-2" />Novo passageiro</Button>
      </div>

      <Card className="glass-card p-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nome, telefone ou cidade..." className="pl-9 bg-background border-border/60" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["Todos", "VIP", "Recorrente", "Retorno", "Inativo", "Quente"].map((f, i) => (
            <Badge key={f} variant="outline" className={`cursor-pointer ${i === 0 ? "bg-primary/15 text-primary border-primary/30" : "border-border hover:border-primary/40"}`}>{f}</Badge>
          ))}
        </div>
      </Card>

      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card-elevated/40">
                <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Passageiro</th>
                <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Cidade</th>
                <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Viagens</th>
                <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Ticket médio</th>
                <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Última</th>
                <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Status</th>
                <th className="text-right font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {passageiros.map((p) => (
                <tr key={p.id} className="border-b border-border/40 hover:bg-card-elevated/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-xs font-bold">{p.nome.split(" ").map(w => w[0]).slice(0,2).join("")}</div>
                      <div>
                        <p className="font-medium flex items-center gap-1.5">{p.nome}{p.tag === "VIP" && <Star className="h-3 w-3 text-primary fill-primary" />}</p>
                        <p className="text-xs text-muted-foreground">{p.telefone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{p.cidade}</td>
                  <td className="p-4 font-semibold">{p.viagens}</td>
                  <td className="p-4">R$ {p.ticket}</td>
                  <td className="p-4 text-muted-foreground">{new Date(p.ultimaViagem).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4"><Badge variant="outline" className={tagStyle[p.tag]}>{p.tag}</Badge></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success"><MessageCircle className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Phone className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
