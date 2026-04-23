import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

type ProfileStatus = "pending" | "ativo" | "inativo";
type AppRole = "admin" | "vendedor" | "financeiro" | "operacional" | "motorista";

interface Member {
  id: string; nome: string; email: string | null; status: ProfileStatus;
  user_roles: { role: AppRole }[];
}

const statusStyle: Record<ProfileStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  ativo: "bg-success/15 text-success border-success/30",
  inativo: "bg-muted text-muted-foreground border-border",
};

export default function Equipe() {
  const { roles, loading: authLoading } = useAuth();
  const isAdmin = roles.includes("admin");
  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, email, status, user_roles(role)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const updateStatus = async (id: string, status: ProfileStatus) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "ativo" ? "Usuário aprovado" : "Status atualizado");
    load();
  };

  const updateRole = async (userId: string, currentRoles: AppRole[], newRole: AppRole) => {
    // Substitui a role principal: remove todas e insere a nova
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) { toast.error(error.message); return; }
    toast.success("Papel atualizado");
    load();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary mb-1">Configurações</p>
        <h1 className="font-display text-3xl font-bold">Equipe & permissões</h1>
        <p className="text-muted-foreground mt-1">Aprove novos cadastros e defina o papel de cada membro.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["pending", "ativo", "inativo"] as ProfileStatus[]).map(s => (
          <Card key={s} className="glass-card p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wide capitalize">{s === "pending" ? "Pendentes" : s}</p>
            <p className="font-display text-3xl font-bold mt-1">{items.filter(i => i.status === s).length}</p>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Nenhum membro ainda</p>
        </Card>
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card-elevated/40">
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Membro</th>
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Papel</th>
                  <th className="text-left font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Status</th>
                  <th className="text-right font-medium text-xs uppercase tracking-wider text-muted-foreground p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map(m => {
                  const memberRoles = m.user_roles?.map(r => r.role) ?? [];
                  const principal = memberRoles[0] ?? "vendedor";
                  return (
                    <tr key={m.id} className="border-b border-border/40 hover:bg-card-elevated/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-xs font-bold">{(m.nome || m.email || "?")[0].toUpperCase()}</div>
                          <div>
                            <p className="font-medium">{m.nome || "—"}</p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Select value={principal} onValueChange={(v: AppRole) => updateRole(m.id, memberRoles, v)}>
                          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="vendedor">Vendedor</SelectItem>
                            <SelectItem value="financeiro">Financeiro</SelectItem>
                            <SelectItem value="operacional">Operacional</SelectItem>
                            <SelectItem value="motorista">Motorista</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4"><Badge variant="outline" className={statusStyle[m.status]}>{m.status}</Badge></td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {m.status !== "ativo" && (
                            <Button size="sm" onClick={() => updateStatus(m.id, "ativo")} className="bg-gradient-gold text-primary-foreground hover:opacity-90"><Shield className="h-3.5 w-3.5 mr-1" />Aprovar</Button>
                          )}
                          {m.status === "ativo" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(m.id, "inativo")} className="border-border">Desativar</Button>
                          )}
                          {m.status === "inativo" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(m.id, "ativo")} className="border-border">Reativar</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
