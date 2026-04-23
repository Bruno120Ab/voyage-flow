import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary mb-1">Em breve</p>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <Card className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="h-16 w-16 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow mb-4">
          <Construction className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="font-display font-semibold text-xl mb-2">Módulo em construção</h2>
        <p className="text-muted-foreground max-w-md">Esta seção será desenvolvida na próxima iteração — me diga se quer começar por aqui agora.</p>
      </Card>
    </div>
  );
}
