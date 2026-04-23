import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plane, Loader2 } from "lucide-react";

const signInSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
});
const signUpSchema = signInSchema.extend({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
});

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", password: "" });

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nome: parsed.data.nome },
          },
        });
        if (error) { toast.error(error.message); return; }
        toast.success("Conta criada! Redirecionando...");
        navigate("/");
      } else {
        const parsed = signInSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message);
          return;
        }
        navigate("/");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glow opacity-70" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow mb-4">
            <Plane className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-3xl">ViaCRM</h1>
          <p className="text-muted-foreground text-sm mt-1">Travel Suite para agências</p>
        </div>

        <Card className="glass-card p-8 animate-fade-in">
          <div className="flex gap-1 mb-6 bg-secondary/40 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >Entrar</button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >Criar conta</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Rafael Souza" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="voce@agencia.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Senha</Label>
              <Input id="pwd" type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow font-medium h-11">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "signup" ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          {mode === "signup" && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Novas contas entram como <span className="text-primary font-medium">pendentes</span> e precisam ser aprovadas pelo administrador.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
