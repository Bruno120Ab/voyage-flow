import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, TrendingUp, Target, DollarSign, CalendarPlus, Loader2, Edit2, AlertCircle, ArrowUp, ArrowDown, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";

interface VendaDiaria {
  id: string;
  data: string; // ISO date string or YYYY-MM-DD
  valor: number;
}

export default function Financeiro() {
  const [loading, setLoading] = useState(true);
  
  // States - LocalStorage
  const [metaMes, setMetaMes] = useState<number>(50000);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [vendas, setVendas] = useState<VendaDiaria[]>([]);
  
  // States - Supabase (Pipeline)
  const [potencial, setPotencial] = useState<number>(0);
  
  // Form Fechamento de Caixa
  const [valorCaixa, setValorCaixa] = useState("");
  const [dataCaixa, setDataCaixa] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    // 1. Load from LocalStorage
    const storedMeta = localStorage.getItem("voyage_meta_mes");
    if (storedMeta) setMetaMes(Number(storedMeta));

    const storedVendas = localStorage.getItem("voyage_vendas_diarias");
    if (storedVendas) {
      try {
        setVendas(JSON.parse(storedVendas));
      } catch (e) {
        console.error("Erro ao fazer parse das vendas diárias", e);
      }
    }

    // 2. Load Pipeline from Supabase
    const loadPotencial = async () => {
      const { data } = await supabase.from("passageiros").select("ticket_medio, tag").in("tag", ["retorno", "quente"]);
      if (data) {
        const total = data.reduce((acc, p) => acc + Number(p.ticket_medio || 0), 0);
        setPotencial(total);
      }
      setLoading(false);
    };

    loadPotencial();
  }, []);

  // Sync to localstorage when changes happen
  useEffect(() => {
    localStorage.setItem("voyage_meta_mes", metaMes.toString());
  }, [metaMes]);

  useEffect(() => {
    localStorage.setItem("voyage_vendas_diarias", JSON.stringify(vendas));
  }, [vendas]);

  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingMeta(false);
  };

  const handleFecharCaixa = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = Number(valorCaixa.replace(/[^\d.-]/g, ''));
    if (!valorNum || valorNum <= 0) return;

    const novaVenda: VendaDiaria = {
      id: Math.random().toString(36).substring(7),
      data: dataCaixa,
      valor: valorNum,
    };

    setVendas(prev => [novaVenda, ...prev]);
    setValorCaixa("");
  };

  const removerVenda = (id: string) => {
    setVendas(prev => prev.filter(v => v.id !== id));
  };

  // Calculations
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  
  const mesStr = String(mesAtual + 1).padStart(2, '0');
  const prefixoMes = `${anoAtual}-${mesStr}`;
  
  const vendasMesAtual = vendas.filter(v => v.data.startsWith(prefixoMes) || (new Date(v.data).getMonth() === mesAtual && new Date(v.data).getFullYear() === anoAtual));

  const totalVendidoMes = vendasMesAtual.reduce((acc, v) => acc + v.valor, 0);
  const progresso = Math.min((totalVendidoMes / (metaMes || 1)) * 100, 100);

  // KPIs por Dia
  const vendasPorDia = vendasMesAtual.reduce((acc, v) => {
    const dia = v.data.length > 10 ? v.data.slice(0, 10) : v.data;
    acc[dia] = (acc[dia] || 0) + v.valor;
    return acc;
  }, {} as Record<string, number>);

  const diasComVenda = Object.keys(vendasPorDia);
  const melhorDia = diasComVenda.length > 0 ? diasComVenda.reduce((a, b) => vendasPorDia[a] > vendasPorDia[b] ? a : b) : null;
  const piorDia = diasComVenda.length > 0 ? diasComVenda.reduce((a, b) => vendasPorDia[a] < vendasPorDia[b] ? a : b) : null;
  const mediaDiaria = diasComVenda.length > 0 ? totalVendidoMes / diasComVenda.length : 0;

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Caixa & Metas</p>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Wallet className="h-8 w-8 text-primary" /> Financeiro Diário</h1>
          <p className="text-muted-foreground mt-1">Feche o caixa, lance retroativos e acompanhe os KPIs do mês.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: METAS E KPIs */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card overflow-hidden border-t-4 border-t-primary">
            <CardHeader className="bg-primary/5 border-b border-border/50 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="font-display flex items-center gap-2 text-lg"><Target className="h-5 w-5 text-primary" /> Meta do Mês</CardTitle>
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
                    <Input 
                      type="number" 
                      value={metaMes} 
                      onChange={(e) => setMetaMes(Number(e.target.value))}
                      className="text-2xl font-bold w-40 text-center bg-background/50"
                      autoFocus
                    />
                  </div>
                ) : (
                  <p className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-1">Objetivo Mensal: <span className="text-foreground">R$ {metaMes.toLocaleString("pt-BR")}</span></p>
                )}
                
                <h2 className="font-display text-5xl font-bold text-gradient-gold mt-2">R$ {totalVendidoMes.toLocaleString("pt-BR")}</h2>
                <p className="text-xs text-muted-foreground mt-2">Faturado no mês atual</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-primary">{progresso.toFixed(1)}% Concluído</span>
                  <span className="text-muted-foreground">Faltam R$ {Math.max(metaMes - totalVendidoMes, 0).toLocaleString("pt-BR")}</span>
                </div>
                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden border border-border/50 shadow-inner">
                  <div 
                    className="h-full bg-gradient-gold transition-all duration-1000 ease-out relative"
                    style={{ width: `${progresso}%` }}
                  >
                    {progresso >= 100 && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card border-t-2 border-t-info p-4 flex flex-col items-center text-center justify-center gap-2 hover:border-info/40 transition-colors">
              <div className="bg-primary/10 p-2 rounded-full"><CalendarPlus className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Média Diária</p>
                <p className="font-display text-lg font-bold">R$ {mediaDiaria.toLocaleString("pt-BR", {maximumFractionDigits: 0})}</p>
              </div>
            </Card>
            
            <Card className="glass-card border-t-2 border-t-success p-4 flex flex-col items-center text-center justify-center gap-2 hover:border-success/40 transition-colors">
              <div className="bg-success/10 p-2 rounded-full"><ArrowUp className="h-4 w-4 text-success" /></div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Melhor Dia</p>
                <p className="font-display text-lg font-bold text-success">{melhorDia ? `R$ ${vendasPorDia[melhorDia].toLocaleString("pt-BR", {maximumFractionDigits: 0})}` : "—"}</p>
                {melhorDia && <p className="text-[9px] text-muted-foreground">{melhorDia.split('-').reverse().join('/')}</p>}
              </div>
            </Card>

            <Card className="glass-card border-t-2 border-t-destructive p-4 flex flex-col items-center text-center justify-center gap-2 hover:border-destructive/40 transition-colors">
              <div className="bg-destructive/10 p-2 rounded-full"><ArrowDown className="h-4 w-4 text-destructive" /></div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">Pior Dia</p>
                <p className="font-display text-lg font-bold text-destructive">{piorDia ? `R$ ${vendasPorDia[piorDia].toLocaleString("pt-BR", {maximumFractionDigits: 0})}` : "—"}</p>
                {piorDia && <p className="text-[9px] text-muted-foreground">{piorDia.split('-').reverse().join('/')}</p>}
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

          {/* CALENDÁRIO VISUAL */}
          <Card className="glass-card">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="font-display text-base flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /> Calendário de Faturamento</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex justify-center">
              <Calendar
                mode="single"
                selected={hoje}
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

        {/* COLUNA 2: FECHAMENTO DE CAIXA */}
        <div className="space-y-6">
          <Card className="glass-card border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-display text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Lançar Fechamento</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleFecharCaixa} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Data do Fechamento</label>
                  <Input 
                    type="date" 
                    value={dataCaixa}
                    onChange={(e) => setDataCaixa(e.target.value)}
                    className="h-10 bg-background/50 border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Valor Fechado (R$)</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 1500.00" 
                    value={valorCaixa}
                    onChange={(e) => setValorCaixa(e.target.value)}
                    className="h-12 text-lg bg-background/50 border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/50 font-bold text-primary"
                  />
                </div>
                <Button type="submit" disabled={!valorCaixa || !dataCaixa} className="w-full h-11 bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
                  Adicionar ao Caixa
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-card flex flex-col h-[600px]">
            <CardHeader className="pb-3 border-b border-border/50 shrink-0">
              <CardTitle className="font-display text-sm flex items-center justify-between">
                <span>Histórico de Lançamentos</span>
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
                        {venda.data.length > 10 && (
                          <p className="text-[10px] text-muted-foreground">{new Date(venda.data).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-gradient-gold">R$ {venda.valor.toLocaleString("pt-BR")}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => removerVenda(venda.id)}
                        >
                          &times;
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
