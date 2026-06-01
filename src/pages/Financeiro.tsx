import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, TrendingUp, Target, DollarSign, CalendarPlus, Loader2, Edit2, AlertCircle, ArrowUp, ArrowDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight, MinusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";

interface VendaDiaria {
  id: string;
  data: string;
  valor: number;
  retirada: number;
}

export default function Financeiro() {
  const [loading, setLoading] = useState(true);

  const [metaMes, setMetaMes] = useState<number>(50000);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [vendas, setVendas] = useState<VendaDiaria[]>([]);
  const [potencial, setPotencial] = useState<number>(0);

  // Navegação de mês
  const hoje = new Date();
  const [mesView, setMesView] = useState<Date>(new Date(hoje.getFullYear(), hoje.getMonth(), 1));

  // Form Fechamento
  const [valorCaixa, setValorCaixa] = useState("");
  const [retiradaCaixa, setRetiradaCaixa] = useState("");
  const [dataCaixa, setDataCaixa] = useState(new Date().toISOString().slice(0, 10));

  const carregar = async () => {
    const [{ data: cfg }, { data: vendasDb }, { data: passDb }] = await Promise.all([
      supabase.from("app_config").select("valor").eq("chave", "meta_mes").maybeSingle(),
      supabase.from("vendas_diarias").select("id, data, valor, retirada").order("data", { ascending: false }),
      supabase.from("passageiros").select("ticket_medio, tag").in("tag", ["retorno", "quente"]),
    ]);

    if (cfg?.valor && typeof (cfg.valor as any).meta === "number") {
      setMetaMes((cfg.valor as any).meta);
    }
    if (vendasDb) setVendas(vendasDb.map((v: any) => ({ id: v.id, data: v.data, valor: Number(v.valor), retirada: Number(v.retirada || 0) })));
    if (passDb) {
      const total = passDb.reduce((acc, p: any) => acc + Number(p.ticket_medio || 0), 0);
      setPotencial(total);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    const ch = supabase
      .channel("vendas-diarias-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendas_diarias" }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("app_config").upsert({ chave: "meta_mes", valor: { meta: metaMes } as any });
    setIsEditingMeta(false);
  };

  const handleFecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = Number(valorCaixa.replace(/[^\d.-]/g, ''));
    if (!valorNum || valorNum <= 0) return;
    const retiradaNum = Number((retiradaCaixa || "0").replace(/[^\d.-]/g, '')) || 0;

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("vendas_diarias")
      .insert({ data: dataCaixa, valor: valorNum, retirada: retiradaNum, created_by: user?.id } as any)
      .select("id, data, valor, retirada")
      .single();

    if (!error && data) {
      setVendas(prev => [{ id: data.id, data: data.data, valor: Number(data.valor), retirada: Number((data as any).retirada || 0) }, ...prev]);
    }
    setValorCaixa("");
    setRetiradaCaixa("");
  };

  const removerVenda = async (id: string) => {
    await supabase.from("vendas_diarias").delete().eq("id", id);
    setVendas(prev => prev.filter(v => v.id !== id));
  };

  // Cálculos do mês visualizado
  const mesAtual = mesView.getMonth();
  const anoAtual = mesView.getFullYear();
  const isMesAtualReal = mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear();

  const mesStr = String(mesAtual + 1).padStart(2, '0');
  const prefixoMes = `${anoAtual}-${mesStr}`;

  const vendasMesAtual = vendas.filter(v => v.data.startsWith(prefixoMes) || (new Date(v.data).getMonth() === mesAtual && new Date(v.data).getFullYear() === anoAtual));

  const totalVendidoMes = vendasMesAtual.reduce((acc, v) => acc + v.valor, 0);
  const totalRetiradasMes = vendasMesAtual.reduce((acc, v) => acc + (v.retirada || 0), 0);
  const liquidoMes = totalVendidoMes - totalRetiradasMes;
  const progresso = Math.min((totalVendidoMes / (metaMes || 1)) * 100, 100);

  const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const diaAtual = isMesAtualReal ? hoje.getDate() : ultimoDiaMes;
  const diasRestantes = isMesAtualReal ? Math.max(ultimoDiaMes - diaAtual + 1, 1) : 0;
  const faltaMeta = Math.max(metaMes - totalVendidoMes, 0);
  const metaPorDiaNecessaria = diasRestantes > 0 && faltaMeta > 0 ? faltaMeta / diasRestantes : 0;
  const comissaoDiariaNecessaria = metaPorDiaNecessaria * 0.08;

  const vendasPorDia = vendasMesAtual.reduce((acc, v) => {
    const dia = v.data.length > 10 ? v.data.slice(0, 10) : v.data;
    acc[dia] = (acc[dia] || 0) + v.valor;
    return acc;
  }, {} as Record<string, number>);

  const diasComVenda = Object.keys(vendasPorDia);
  const melhorDia = diasComVenda.length > 0 ? diasComVenda.reduce((a, b) => vendasPorDia[a] > vendasPorDia[b] ? a : b) : null;
  const piorDia = diasComVenda.length > 0 ? diasComVenda.reduce((a, b) => vendasPorDia[a] < vendasPorDia[b] ? a : b) : null;
  const mediaDiaria = diasComVenda.length > 0 ? totalVendidoMes / diasComVenda.length : 0;

  const irMes = (delta: number) => {
    setMesView(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const nomeMes = mesView.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Caixa & Metas</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2"><Wallet className="h-8 w-8 text-primary" /> Financeiro Diário</h1>
          <p className="text-muted-foreground mt-1">Feche o caixa, lance retroativos e acompanhe os KPIs do mês.</p>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center gap-2 bg-card-elevated/40 border border-border/50 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => irMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-3 py-1 min-w-[160px] text-center">
            <p className="font-display text-sm font-bold capitalize leading-tight">{nomeMes}</p>
            {!isMesAtualReal && (
              <button onClick={() => setMesView(new Date(hoje.getFullYear(), hoje.getMonth(), 1))} className="text-[9px] uppercase text-primary hover:underline">Voltar ao atual</button>
            )}
            {isMesAtualReal && <p className="text-[9px] uppercase text-muted-foreground">Mês atual</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => irMes(1)} disabled={isMesAtualReal}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLUNA 1 */}
        <div className="lg:col-span-2 space-y-6">

          <Card className="glass-card overflow-hidden border-t-4 border-t-primary">
            <CardHeader className="bg-primary/5 border-b border-border/50 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="font-display flex items-center gap-2 text-lg"><Target className="h-5 w-5 text-primary" /> Meta do Mês <span className="text-xs font-normal text-muted-foreground capitalize">• {nomeMes}</span></CardTitle>
                {!isEditingMeta ? (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingMeta(true)} className="h-8 text-xs"><Edit2 className="h-3 w-3 mr-1" /> Editar Meta</Button>
                ) : (
                  <Button variant="default" size="sm" onClick={handleSaveMeta} className="h-8 text-xs bg-primary text-primary-foreground">Salvar</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center mb-8">
                {isEditingMeta ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-display text-2xl font-bold text-muted-foreground">R$</span>
                    <Input type="number" value={metaMes} onChange={(e) => setMetaMes(Number(e.target.value))} className="text-2xl font-bold w-40 text-center bg-background/50" autoFocus />
                  </div>
                ) : (
                  <p className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-1">Objetivo Mensal: <span className="text-foreground">R$ {metaMes.toLocaleString("pt-BR")}</span></p>
                )}

                <h2 className="font-display text-5xl font-bold text-gradient-gold mt-2">R$ {totalVendidoMes.toLocaleString("pt-BR")}</h2>
                <p className="text-xs text-muted-foreground mt-2">Faturado bruto no mês</p>

                <div className="flex flex-wrap gap-3 justify-center mt-3">
                  <div className="px-4 py-2 rounded-lg bg-success/10 border border-success/30">
                    <p className="text-[10px] uppercase font-semibold text-success/80 tracking-wider">Sua Comissão (8%)</p>
                    <p className="font-display text-xl font-bold text-success">R$ {(totalVendidoMes * 0.08).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  {totalRetiradasMes > 0 && (
                    <div className="px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/30">
                      <p className="text-[10px] uppercase font-semibold text-destructive/80 tracking-wider flex items-center gap-1"><MinusCircle className="h-3 w-3" /> Retiradas</p>
                      <p className="font-display text-xl font-bold text-destructive">R$ {totalRetiradasMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30">
                    <p className="text-[10px] uppercase font-semibold text-primary/80 tracking-wider">Líquido</p>
                    <p className="font-display text-xl font-bold text-primary">R$ {liquidoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-primary">{progresso.toFixed(1)}% Concluído</span>
                  <span className="text-muted-foreground">Faltam R$ {Math.max(metaMes - totalVendidoMes, 0).toLocaleString("pt-BR")}</span>
                </div>
                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden border border-border/50 shadow-inner">
                  <div className="h-full bg-gradient-gold transition-all duration-1000 ease-out relative" style={{ width: `${progresso}%` }}>
                    {progresso >= 100 && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isMesAtualReal && (
            <Card className="glass-card border-t-2 border-t-primary p-4 flex flex-col items-center text-center justify-center gap-2 hover:border-primary/40 transition-colors">
              <div className="bg-primary/10 p-2 rounded-full"><Target className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Meta por Dia</p>
                <p className="font-display text-lg font-bold text-primary">R$ {metaPorDiaNecessaria.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
                <p className="text-[9px] text-muted-foreground">Faltam {diasRestantes} dias</p>
                <p className="text-[9px] text-success font-semibold">Comissão/dia: R$ {comissaoDiariaNecessaria.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card border-t-2 border-t-info p-4 flex flex-col items-center text-center justify-center gap-2 hover:border-info/40 transition-colors">
              <div className="bg-primary/10 p-2 rounded-full"><CalendarPlus className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Média Diária</p>
                <p className="font-display text-lg font-bold">R$ {mediaDiaria.toLocaleString("pt-BR", {maximumFractionDigits: 0})}</p>
                <p className="text-[9px] text-success font-semibold">Com.: R$ {(mediaDiaria * 0.08).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p>
              </div>
            </Card>

            <Card className="glass-card border-t-2 border-t-success p-4 flex flex-col items-center text-center justify-center gap-2 hover:border-success/40 transition-colors">
              <div className="bg-success/10 p-2 rounded-full"><ArrowUp className="h-4 w-4 text-success" /></div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Melhor Dia</p>
                <p className="font-display text-lg font-bold text-success">{melhorDia ? `R$ ${vendasPorDia[melhorDia].toLocaleString("pt-BR", {maximumFractionDigits: 0})}` : "—"}</p>
                {melhorDia && <p className="text-[9px] text-muted-foreground">{melhorDia.split('-').reverse().join('/')} • Com. R$ {(vendasPorDia[melhorDia] * 0.08).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p>}
              </div>
            </Card>

            <Card className="glass-card border-t-2 border-t-destructive p-4 flex flex-col items-center text-center justify-center gap-2 hover:border-destructive/40 transition-colors">
              <div className="bg-destructive/10 p-2 rounded-full"><ArrowDown className="h-4 w-4 text-destructive" /></div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Pior Dia</p>
                <p className="font-display text-lg font-bold text-destructive">{piorDia ? `R$ ${vendasPorDia[piorDia].toLocaleString("pt-BR", {maximumFractionDigits: 0})}` : "—"}</p>
                {piorDia && <p className="text-[9px] text-muted-foreground">{piorDia.split('-').reverse().join('/')} • Com. R$ {(vendasPorDia[piorDia] * 0.08).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p>}
              </div>
            </Card>

            <Card className="glass-card border-t-2 border-t-warning p-4 flex flex-col items-center text-center justify-center gap-2 hover:border-warning/40 transition-colors">
              <div className="bg-warning/10 p-2 rounded-full"><TrendingUp className="h-4 w-4 text-warning" /></div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Potencial Extra</p>
                <p className="font-display text-lg font-bold text-warning">R$ {potencial.toLocaleString("pt-BR")}</p>
                <p className="text-[9px] text-muted-foreground leading-tight px-1">Preso no Pipeline</p>
              </div>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="font-display text-base flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /> Calendário de Faturamento <span className="text-xs font-normal text-muted-foreground capitalize">• {nomeMes}</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex justify-center">
              <Calendar
                mode="single"
                selected={isMesAtualReal ? hoje : undefined}
                month={mesView}
                onMonthChange={setMesView}
                className="rounded-xl border border-border/50 bg-card-elevated/20 p-3 shadow-inner w-full max-w-sm"
                components={{
                  DayContent: (props: any) => {
                    const date = props.date;
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    const localDateStr = `${y}-${m}-${d}`;
                    const total = vendasPorDia[localDateStr];

                    return (
                      <div className={`flex flex-col items-center justify-center w-full h-full min-h-[44px] rounded-md transition-colors ${total > 0 ? 'bg-primary/5 hover:bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}`}>
                        <span className={`font-medium ${total > 0 ? 'text-primary' : ''}`}>{date.getDate()}</span>
                        {total > 0 && (
                          <span className="text-[9px] text-gradient-gold font-bold mt-0.5">
                            {total > 999 ? (total/1000).toFixed(1).replace('.0','')+'k' : total}
                          </span>
                        )}
                      </div>
                    );
                  }
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* COLUNA 2 */}
        <div className="space-y-6">
          <Card className="glass-card border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-display text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Lançar Fechamento</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleFecharCaixa} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Data do Fechamento</label>
                  <Input type="date" value={dataCaixa} onChange={(e) => setDataCaixa(e.target.value)} className="h-10 bg-background/50 border-border" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Valor Fechado (R$)</label>
                  <Input type="number" step="0.01" placeholder="Ex: 1500.00" value={valorCaixa} onChange={(e) => setValorCaixa(e.target.value)} className="h-12 text-lg bg-background/50 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/50 font-bold text-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1"><MinusCircle className="h-3 w-3 text-destructive" /> Retirada do dia (R$)</label>
                  <Input type="number" step="0.01" placeholder="0,00 (opcional)" value={retiradaCaixa} onChange={(e) => setRetiradaCaixa(e.target.value)} className="h-10 bg-background/50 border-destructive/30 focus:border-destructive focus:ring-1 focus:ring-destructive/40 text-destructive font-semibold" />
                  <p className="text-[10px] text-muted-foreground mt-1">Informe se houve retirada de caixa neste dia.</p>
                </div>
                {valorCaixa && Number(valorCaixa) > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-3 py-2 rounded-md bg-success/10 border border-success/30 text-xs">
                      <span className="text-success/80 font-semibold uppercase tracking-wider">Comissão (8%)</span>
                      <span className="font-display font-bold text-success">R$ {(Number(valorCaixa) * 0.08).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {Number(retiradaCaixa) > 0 && (
                      <div className="flex justify-between items-center px-3 py-2 rounded-md bg-primary/10 border border-primary/30 text-xs">
                        <span className="text-primary/80 font-semibold uppercase tracking-wider">Líquido do dia</span>
                        <span className="font-display font-bold text-primary">R$ {(Number(valorCaixa) - Number(retiradaCaixa || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                )}
                <Button type="submit" disabled={!valorCaixa || !dataCaixa} className="w-full h-11 bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
                  Adicionar ao Caixa
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-card flex flex-col h-[600px]">
            <CardHeader className="pb-3 border-b border-border/50 shrink-0">
              <CardTitle className="font-display text-sm flex items-center justify-between">
                <span className="capitalize">Histórico • {nomeMes}</span>
                <Badge variant="secondary" className="text-[10px]">{vendasMesAtual.length} registros</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1 overflow-y-auto scrollbar-thin pr-2">
              {vendasMesAtual.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60">
                  <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Nenhum caixa fechado</p>
                  <p className="text-xs">Lançamentos aparecerão aqui</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vendasMesAtual
                    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                    .map((venda) => (
                    <div key={venda.id} className="flex items-center justify-between p-3 rounded-lg bg-card-elevated/40 border border-border/50 hover:border-primary/30 transition-colors group">
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {venda.data.length > 10 ? new Date(venda.data).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' }) : venda.data.split('-').reverse().join('/')}
                        </p>
                        {venda.retirada > 0 && (
                          <p className="text-[10px] text-destructive font-semibold flex items-center gap-0.5 mt-0.5"><MinusCircle className="h-2.5 w-2.5" /> Retirada R$ {venda.retirada.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-sm text-gradient-gold leading-tight">R$ {venda.valor.toLocaleString("pt-BR")}</p>
                          <p className="text-[10px] text-success font-semibold leading-tight">+R$ {(venda.valor * 0.08).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} com.</p>
                          {venda.retirada > 0 && (
                            <p className="text-[10px] text-primary font-semibold leading-tight">Líq.: R$ {(venda.valor - venda.retirada).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => removerVenda(venda.id)}>
                          &times;
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {vendasMesAtual.length > 0 && (
              <div className="border-t border-border/50 px-4 py-3 shrink-0 bg-card-elevated/30 rounded-b-xl space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground uppercase font-semibold tracking-wider">Total Bruto</span>
                  <span className="font-display font-bold text-gradient-gold">R$ {totalVendidoMes.toLocaleString("pt-BR")}</span>
                </div>
                {totalRetiradasMes > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-destructive/80 uppercase font-semibold tracking-wider">Retiradas</span>
                    <span className="font-display font-bold text-destructive">- R$ {totalRetiradasMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-primary/80 uppercase font-semibold tracking-wider">Líquido</span>
                  <span className="font-display font-bold text-primary">R$ {liquidoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-success/80 uppercase font-semibold tracking-wider">Sua Comissão (8%)</span>
                  <span className="font-display font-bold text-success">R$ {(totalVendidoMes * 0.08).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
