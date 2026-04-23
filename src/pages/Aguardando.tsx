import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, LogOut, RefreshCw, Plane } from "lucide-react";

export default function Aguardando() {
  const { profile, signOut, refresh } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glow opacity-60" />
      <div className="relative w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow mb-4">
            <Plane className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-2xl">ViaCRM</h1>
        </div>

        <Card className="glass-card p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-warning/15 flex items-center justify-center mx-auto mb-5">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <h2 className="font-display font-semibold text-xl mb-2">Aguardando aprovação</h2>
          <p className="text-muted-foreground text-sm">
            Olá {profile?.nome}! Sua conta foi criada com sucesso, mas ainda precisa ser ativada por um administrador da agência.
          </p>
          <div className="bg-card-elevated/50 rounded-lg p-4 mt-6 text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status atual</p>
            <p className="font-medium capitalize">{profile?.status}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-3 mb-1">Email</p>
            <p className="font-medium text-sm">{profile?.email}</p>
          </div>
          <div className="flex gap-2 mt-6">
            <Button onClick={refresh} variant="outline" className="flex-1 border-border"><RefreshCw className="h-4 w-4 mr-2" />Verificar</Button>
            <Button onClick={signOut} variant="outline" className="flex-1 border-border"><LogOut className="h-4 w-4 mr-2" />Sair</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
