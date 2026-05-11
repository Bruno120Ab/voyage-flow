import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CHAVE = "embarque_alerts";

export interface EmbarqueAlertsConfig {
  enabled: boolean;
  minutos_antes: number;
  contatos: string[];
}

export const defaultAlertsConfig: EmbarqueAlertsConfig = {
  enabled: true,
  minutos_antes: 10,
  contatos: ["5577991157974"],
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export default function EmbarqueAlertsSettings() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<EmbarqueAlertsConfig>(defaultAlertsConfig);
  const [novo, setNovo] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from("app_config").select("valor").eq("chave", CHAVE).maybeSingle().then(({ data }) => {
      if (data?.valor) setCfg({ ...defaultAlertsConfig, ...(data.valor as any) });
      setLoading(false);
    });
  }, [open]);

  const addContato = () => {
    const n = onlyDigits(novo);
    if (n.length < 10) { toast.error("Telefone inválido"); return; }
    if (cfg.contatos.includes(n)) { toast.error("Já adicionado"); return; }
    setCfg({ ...cfg, contatos: [...cfg.contatos, n] });
    setNovo("");
  };

  const remove = (n: string) => setCfg({ ...cfg, contatos: cfg.contatos.filter(x => x !== n) });

  const salvar = async () => {
    setSaving(true);
    const payload = { chave: CHAVE, valor: cfg as any, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("app_config").upsert(payload, { onConflict: "chave" });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Configuração salva");
    setOpen(false);
  };

  const fmt = (n: string) => {
    if (n.length === 13) return `+${n.slice(0,2)} (${n.slice(2,4)}) ${n.slice(4,9)}-${n.slice(9)}`;
    if (n.length === 12) return `+${n.slice(0,2)} (${n.slice(2,4)}) ${n.slice(4,8)}-${n.slice(8)}`;
    return n;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="h-4 w-4" /> Alertas de Embarque
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alertas de Embarque (WhatsApp)</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="font-medium text-sm">Ativar alertas</p>
                <p className="text-xs text-muted-foreground">Envia WhatsApp antes de cada embarque do dia.</p>
              </div>
              <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="min">Minutos antes do embarque</Label>
              <Input
                id="min"
                type="number"
                min={1}
                max={240}
                value={cfg.minutos_antes}
                onChange={(e) => setCfg({ ...cfg, minutos_antes: Math.max(1, Math.min(240, Number(e.target.value) || 10)) })}
              />
              <p className="text-[11px] text-muted-foreground">Sugestões: 10, 15, 30, 60</p>
            </div>

            <div className="space-y-2">
              <Label>Contatos que recebem o alerta</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 5577991157974"
                  value={novo}
                  onChange={(e) => setNovo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addContato())}
                />
                <Button type="button" size="icon" onClick={addContato}><Plus className="h-4 w-4" /></Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Formato internacional, só números (DDI + DDD + número).</p>
              <div className="space-y-1.5 mt-2 max-h-48 overflow-y-auto">
                {cfg.contatos.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhum contato cadastrado.</p>
                )}
                {cfg.contatos.map((n) => (
                  <div key={n} className="flex items-center justify-between rounded-md bg-card-elevated/60 border border-border/40 px-3 py-2">
                    <Badge variant="outline" className="font-mono">{fmt(n)}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(n)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
