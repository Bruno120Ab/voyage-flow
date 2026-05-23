// import { useEffect, useMemo, useState } from "react";
// import { supabase } from "@/integrations/supabase/client";

// import { Card, CardContent } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";

// import {
//   Bus,
//   Clock,
//   Search,
//   CheckCircle2,
//   AlertCircle,
//   Loader2,
//   ArrowRight,
//   MapPin,
//   CalendarX2,
//   Layers,
//   Phone,
//   Instagram,
//   Filter
// } from "lucide-react";

// type Embarque = {
//   id: string;
//   servico: string | null;
//   rota: string | null;
//   cidade_origem: string | null;
//   cidade_destino: string | null;
//   hora_saida_prevista: string | null;
//   hora_real: string | null;
//   carro: string | null;
//   passou: boolean;
//   status: string | null;
//   previsao_chegada: string | null;
// };

// type FiltroRota = "todos" | "conquista" | "itapetinga";
// type FiltroDestinoRapido = "todos" | "litoral_norte" | "extremo_sul" | "conquista_capital";

// export default function PublicoEmbarques() {
//   const [loading, setLoading] = useState(true);
//   const [busca, setBusca] = useState("");
//   const [embarques, setEmbarques] = useState<Embarque[]>([]);
  
//   // Filtros operacionais ativos
//   const [filtroRota, setFiltroRota] = useState<FiltroRota>("todos");
//   const [filtroDestino, setFiltroDestino] = useState<FiltroDestinoRapido>("todos");

//   const carregar = async () => {
//     setLoading(true);
//     const { data } = await supabase
//       .from("embarques_dia")
//       .select(`
//         id,
//         servico,
//         rota,
//         cidade_origem,
//         cidade_destino,
//         hora_saida_prevista,
//         hora_real,
//         carro,
//         passou,
//         status,
//         previsao_chegada
//       `)
//       .order("hora_saida_prevista", { ascending: true });

//     setEmbarques((data || []) as Embarque[]);
//     setLoading(false);
//   };

//   useEffect(() => {
//     carregar();

//     const channel = supabase
//       .channel("embarques-publicos")
//       .on(
//         "postgres_changes",
//         { event: "*", schema: "public", table: "embarques_dia" },
//         () => carregar()
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, []);

//   const parseMin = (hora?: string | null) => {
//     if (!hora) return 0;
//     const [h, m] = hora.slice(0, 5).split(":").map(Number);
//     return h * 60 + m;
//   };

//   const obterStatus = (item: Embarque) => {
//     if (item.passou) return { texto: "REALIZADO", corHeader: "bg-[#0A2342] text-white", icone: CheckCircle2 };
    
//     const agora = new Date();
//     const atual = agora.getHours() * 60 + agora.getMinutes();
//     const previsto = parseMin(item.hora_saida_prevista);
//     const diff = previsto - atual;

//     if (diff < 0) return { texto: `ATRASADO (${Math.abs(diff)} MIN)`, corHeader: "bg-rose-600 text-white", icone: AlertCircle };
//     if (diff <= 20) return { texto: diff === 0 ? "EMBARCANDO" : `SAINDO EM ${diff} MIN`, corHeader: "bg-[#FFCC00] text-[#0A2342]", icone: Clock };
    
//     return { texto: "PROGRAMADO", corHeader: "bg-[#004B87] text-white", icone: Clock };
//   };

//   // Identifica se o veículo pertence a qualquer uma das rotas que passam por Itambé/Itapetinga rumo ao litoral ou extremo sul
//   const ehRotaItapetinga = (item: Embarque) => {
//     const destino = item.cidade_destino?.toLowerCase() || "";
//     const rota = item.rota?.toLowerCase() || "";
    
//     return (
//       destino.includes("ilheus") || 
//       destino.includes("ilh") || 
//       destino.includes("itabuna") || 
//       destino.includes("itororo") || 
//       destino.includes("floresta azul") || 
//       destino.includes("ibicarai") || 
//       destino.includes("firmino alves") || 
//       destino.includes("canavieras") || 
//       destino.includes("canavieiras") || 
//       destino.includes("porto") || 
//       destino.includes("eunapolis") || 
//       destino.includes("prado") ||
//       destino.includes("potiragua") ||
//       destino.includes("itagimirim") ||
//       destino.includes("itapetinga") ||
//       destino.includes("itambe") ||
//       rota.includes("itambe") ||
//       rota.includes("itapetinga") ||
//       rota.includes("potiragua") ||
//       rota.includes("itororo") ||
//       rota.includes("itabuna")
//     );
//   };

//   // Classifica especificamente qual é o braço do itinerário (Cacau vs Extremo Sul)
//   const obterTipoItinerarioExplicito = (item: Embarque) => {
//     const destino = item.cidade_destino?.toLowerCase() || "";

//     if (
//       destino.includes("ilheus") || 
//       destino.includes("ilh") || 
//       destino.includes("canavieiras") || 
//       destino.includes("canavieras") ||
//       destino.includes("itabuna") ||
//       destino.includes("itororo") ||
//       destino.includes("floresta azul")
//     ) {
//       return "litoral_cacau";
//     }

//     if (
//       destino.includes("porto") || 
//       destino.includes("eunapolis") || 
//       destino.includes("prado") ||
//       destino.includes("potiragua") ||
//       destino.includes("itagimirim")
//     ) {
//       return "extremo_sul";
//     }

//     return null;
//   };

//   const classificarMicroRegiao = (item: Embarque) => {
//     const tipo = obterTipoItinerarioExplicito(item);
//     if (tipo === "litoral_cacau") return "litoral_norte";
//     if (tipo === "extremo_sul") return "extremo_sul";
    
//     const destino = item.cidade_destino?.toLowerCase() || "";
//     if (destino.includes("conquista") || destino.includes("salvador") || destino.includes("vitoria")) return "conquista_capital";
//     return "outros";
//   };

//   // Processamento da listagem filtrada limpa e sem palavras intrusas
//   const listaFiltrada = useMemo(() => {
//     return embarques.filter((item) => {
//       const termo = busca.toLowerCase();
//       const bateBusca = 
//         item.servico?.toLowerCase().includes(termo) ||
//         item.rota?.toLowerCase().includes(termo) ||
//         item.cidade_origem?.toLowerCase().includes(termo) ||
//         item.cidade_destino?.toLowerCase().includes(termo);

//       if (!bateBusca) return false;

//       const deFatoItapetinga = ehRotaItapetinga(item);
//       if (filtroRota === "itapetinga" && !deFatoItapetinga) return false;
//       if (filtroRota === "conquista" && deFatoItapetinga) return false;

//       const microRegiao = classificarMicroRegiao(item);
//       if (filtroDestino !== "todos" && microRegiao !== filtroDestino) return false;

//       return true;
//     });
//   }, [embarques, busca, filtroRota, filtroDestino]);

//   const contadores = useMemo(() => {
//     let t = 0; let c = 0; let i = 0;
//     embarques.forEach(item => {
//       t++;
//       if (ehRotaItapetinga(item)) i++; else c++;
//     });
//     return { todos: t, conquista: c, itapetinga: i };
//   }, [embarques]);

//   return (
//     <div className="min-h-screen bg-slate-100 text-slate-900 antialiased font-sans pb-12">
      
//       {/* TOPBAR COMERCIAL - AGÊNCIA ITAMBÉ */}
//       <div className="bg-[#FFCC00] text-[#0A2342] text-xs font-black uppercase tracking-wider py-2.5 px-4 shadow-sm border-b border-[#0A2342]/10">
//         <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
//           <div className="flex items-center gap-2">
//             <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse" />
//             📍 Agência Oficial Rodoviária de Itambé - BA
//           </div>
//           <div className="flex items-center flex-wrap justify-center sm:justify-end gap-x-6 gap-y-2 font-black">
//             <a 
//               href="https://wa.me/5577999999999" // Coloque o número do WhatsApp da agência de Itambé aqui
//               target="_blank" 
//               rel="noreferrer" 
//               className="flex items-center gap-1.5 bg-[#0A2342] text-white px-3 py-1 rounded-md hover:bg-[#004B87] transition-all shadow-sm"
//             >
//               <Phone className="w-3.5 h-3.5 fill-white text-transparent" /> 
//               WhatsApp da Agência
//             </a>
//             <a 
//               href="https://instagram.com/novo_horizonte" // Coloque o link do Instagram da agência aqui
//               target="_blank" 
//               rel="noreferrer" 
//               className="flex items-center gap-1.5 text-[#0A2342] hover:text-[#004B87] transition-colors"
//             >
//               <Instagram className="w-4 h-4" /> 
//               Nosso Instagram
//             </a>
//           </div>
//         </div>
//       </div>

//       {/* HEADER */}
//       <header className="bg-[#0A2342] text-white shadow-xl border-b-4 border-[#004B87]">
//         <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//           <div className="flex items-center gap-4">
//             <div className="w-12 h-12 rounded-xl bg-[#FFCC00] text-[#0A2342] flex items-center justify-center shadow-lg shrink-0">
//               <Bus className="w-6 h-6" />
//             </div>
//             <div>
//               <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Novo Horizonte</h1>
//               <p className="text-xs text-slate-300 font-medium tracking-wider uppercase">Painel de Embarques • Filial Itambé</p>
//             </div>
//           </div>
//           <div className="inline-flex items-center gap-2 bg-white/10 text-white font-bold text-xs tracking-wider uppercase px-3 py-1.5 rounded-lg border border-white/20 self-start sm:self-center">
//             <span className="w-2 h-2 rounded-full bg-[#FFCC00] animate-ping" /> Sincronizado via satélite
//           </div>
//         </div>
//       </header>

//       <div className="max-w-5xl mx-auto px-4 mt-8 sm:px-6">
        
//         {/* BUSCA */}
//         <div className="relative mb-6 group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#004B87] transition-colors" />
//           <Input
//             placeholder="Buscar destino final, conexões (Ex: Potiraguá, Itabuna, Conquista) ou serviço..."
//             value={busca}
//             onChange={(e) => setBusca(e.target.value)}
//             className="pl-12 h-14 rounded-xl text-base shadow-sm border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-[#004B87]/20 focus-visible:border-[#004B87] transition-all font-medium"
//           />
//         </div>

//         {/* FILTRO 1: LOGÍSTICA REGIONAL */}
//         <div className="mb-4">
//           <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">1. Filtrar por Fluxo de Itinerário</span>
//           <div className="flex flex-col sm:flex-row gap-2 bg-slate-200/80 p-1.5 rounded-2xl">
//             <button onClick={() => setFiltroRota("todos")} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase transition-all flex-1 ${filtroRota === "todos" ? "bg-slate-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-300/50"}`}>
//               <Layers className="w-3.5 h-3.5" />
//               <span>Todos os Carros ({contadores.todos})</span>
//             </button>
//             <button onClick={() => setFiltroRota("conquista")} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase transition-all flex-1 ${filtroRota === "conquista" ? "bg-[#004B87] text-white shadow-sm" : "text-slate-600 hover:bg-slate-300/50"}`}>
//               <MapPin className="w-3.5 h-3.5" />
//               <span>Subindo Vitória da Conquista ({contadores.conquista})</span>
//             </button>
//             <button onClick={() => setFiltroRota("itapetinga")} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase transition-all flex-1 ${filtroRota === "itapetinga" ? "bg-[#0A2342] text-white shadow-sm border-b-2 border-[#FFCC00]" : "text-slate-600 hover:bg-slate-300/50"}`}>
//               <ArrowRight className="w-3.5 h-3.5" />
//               <span>Descendo Itapetinga / Litoral ({contadores.itapetinga})</span>
//             </button>
//           </div>
//         </div>

//         {/* FILTRO 2: DESTINOS RECOMENDADOS EXPLICITADOS */}
//         <div className="mb-6">
//           <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">2. Itinerários Expressos e Linhas Principais</span>
//           <div className="grid grid-cols-2 sm:grid-cols-4 bg-white border border-slate-200 rounded-xl p-1 gap-1">
//             {[
//               { id: "todos", label: "Geral / Todos" },
//               { id: "litoral_norte", label: "Eixo Itabuna / Ilhéus" },
//               { id: "extremo_sul", label: "Eixo Eunápolis / Porto" },
//               { id: "conquista_capital", label: "VDC / Salvador" }
//             ].map((dest) => (
//               <button
//                 key={dest.id}
//                 onClick={() => setFiltroDestino(dest.id as FiltroDestinoRapido)}
//                 className={`py-2.5 px-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg transition-all text-center ${
//                   filtroDestino === dest.id ? "bg-[#004B87] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
//                 }`}
//               >
//                 {dest.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* RESET DE FILTROS */}
//         {(filtroRota !== "todos" || filtroDestino !== "todos" || busca) && (
//           <div className="mb-4 flex justify-between items-center bg-slate-200/50 border border-slate-300/60 rounded-xl p-2.5 px-4 text-xs">
//             <div className="text-slate-600 font-medium flex items-center gap-1.5">
//               <Filter className="w-3.5 h-3.5 text-slate-500" />
//               Filtros ativos. Mostrando <strong className="text-[#0A2342]">{listaFiltrada.length}</strong> de {embarques.length} carros.
//             </div>
//             <button onClick={() => { setFiltroRota("todos"); setFiltroDestino("todos"); setBusca(""); }} className="text-xs font-black text-red-600 uppercase hover:underline">
//               Limpar Filtros ×
//             </button>
//           </div>
//         )}

//         {/* LISTAGEM DOS CARDS */}
//         {loading ? (
//           <div className="py-32 flex flex-col items-center justify-center gap-3">
//             <Loader2 className="h-8 w-8 animate-spin text-[#004B87]" />
//             <p className="text-sm text-slate-500 font-medium tracking-wide">Buscando banco de dados Novo Horizonte...</p>
//           </div>
//         ) : listaFiltrada.length === 0 ? (
//           <Card className="border-dashed border-2 py-16 text-center rounded-2xl bg-white border-slate-300 shadow-inner">
//             <CardContent className="flex flex-col items-center justify-center gap-4">
//               <div className="p-4 bg-slate-100 rounded-full text-slate-400">
//                 <CalendarX2 className="w-8 h-8" />
//               </div>
//               <div>
//                 <h3 className="text-base font-black text-[#0A2342] uppercase tracking-wider">Nenhum ônibus localizado</h3>
//                 <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Não há veículos correspondentes na agência de Itambé.</p>
//               </div>
//             </CardContent>
//           </Card>
//         ) : (
//           <div className="space-y-4">
//             {listaFiltrada.map((item) => {
//               const statusInfo = obterStatus(item);
//               const Icon = statusInfo.icone;
//               const ehDoLitoral = ehRotaItapetinga(item);
//               const tipoItinerario = obterTipoItinerarioExplicito(item);

//               return (
//                 <Card key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white">
//                   <CardContent className="p-0">
                    
//                     {/* CABEÇALHO DO CARD */}
//                     <div className={`flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 gap-3 ${statusInfo.corHeader}`}>
//                       <div className="flex items-center gap-3">
//                         <span className="inline-flex items-center gap-1.5 text-sm font-black tracking-wider uppercase">
//                           <Icon className="w-4 h-4" />
//                           {statusInfo.texto}
//                         </span>
//                         {item.carro && item.carro !== "--" && (
//                           <span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded text-white border border-white/10">
//                             Prefixo: {item.carro}
//                           </span>
//                         )}
//                       </div>
                      
//                       <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
//                         <span className={`text-[10px] font-black px-2 py-0.5 rounded tracking-wide uppercase shadow-sm ${
//                           ehDoLitoral ? "bg-[#FFCC00] text-[#0A2342] border border-[#0A2342]/10" : "bg-white/20 text-white"
//                         }`}>
//                           {ehDoLitoral ? "Via Itapetinga" : "Via Conquista"}
//                         </span>
//                         <span className="font-mono bg-white text-[#0A2342] px-2 py-0.5 rounded text-xs font-black border">
//                           #{item.servico}
//                         </span>
//                       </div>
//                     </div>

//                     {/* CORPO DO CARD */}
//                     <div className="p-5 sm:p-6">
                      
//                       {/* DESTINO */}
//                       <div className="flex flex-wrap items-center gap-y-2 gap-x-3 mb-4">
//                         <div className="flex items-center gap-2">
//                           <MapPin className="w-4 h-4 text-[#004B87] shrink-0" />
//                           <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
//                             {item.cidade_origem || "Origem"}
//                           </span>
//                         </div>
//                         <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
//                         <div className="flex items-center gap-2">
//                           <span className="text-xl sm:text-2xl font-black tracking-tight text-[#0A2342] uppercase">
//                             {item.cidade_destino || "Destino"}
//                           </span>
//                         </div>
//                       </div>

//                       {/* BANNER DINÂMICO EXPLICITANDO O ITINERÁRIO COMPLETO */}
//                       {tipoItinerario === "litoral_cacau" && (
//                         <div className="mb-4 bg-amber-500/10 border border-amber-500/20 text-[#0A2342] rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
//                           📍 <span className="text-[#004B87]">Itinerário Litoral Norte:</span> Itambé • Itapetinga • Itororó • Floresta Azul • Itabuna • Ilhéus / Canavieiras
//                         </div>
//                       )}

//                       {tipoItinerario === "extremo_sul" && (
//                         <div className="mb-4 bg-blue-500/10 border border-blue-500/20 text-[#004B87] rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
//                           📍 <span className="text-[#0A2342]">Itinerário Extremo Sul:</span> Itambé • Itapetinga • Potiraguá • Itagimirim • Eunápolis • Porto Seguro
//                         </div>
//                       )}

//                       {/* GRID DE HORÁRIOS */}
//                       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
//                         <div className="rounded-xl bg-[#004B87]/5 border border-[#004B87]/10 p-3.5">
//                           <span className="text-[9px] font-black text-[#004B87] uppercase tracking-wider block opacity-80">Previsão Saída</span>
//                           <span className="text-xl sm:text-2xl font-black mt-0.5 block font-mono text-[#004B87]">{item.hora_saida_prevista || "--:--"}</span>
//                         </div>
//                         <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3.5">
//                           <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block opacity-80">Partida Real</span>
//                           <span className="text-xl sm:text-2xl font-black mt-0.5 block font-mono text-emerald-600">{item.hora_real || "--:--"}</span>
//                         </div>
//                         <div className="col-span-2 md:col-span-1 rounded-xl bg-slate-50 border border-slate-100 p-3.5 flex flex-col justify-center">
//                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Itinerário Operacional</span>
//                           <span className="text-xs font-bold mt-1 block text-slate-700 truncate uppercase">{item.rota || "Não informado"}</span>
//                         </div>
//                       </div>

//                     </div>

//                   </CardContent>
//                 </Card>
//               );
//             })}
//           </div>
//         )}

//         {/* FOOTER */}
//         <footer className="mt-12 text-center border-t border-slate-200 pt-6">
//           <p className="text-[11px] text-slate-400 font-black tracking-wider uppercase">Plataforma Digital de Autoatendimento • Agência Itambé - BA</p>
//           <p className="text-[10px] text-slate-400 mt-1">Horários atualizados automaticamente em conformidade com o sistema de tráfego centralizado da Novo Horizonte.</p>
//         </footer>

//       </div>
//     </div>
//   );
// }import { useEffect, useMemo, useState, useCallback } from "react";import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

import {
  Bus,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  MapPin,
  CalendarX2,
  Layers,
  Phone,
  Filter,
  MessageCircle,
  Package,
  Ticket,
  Truck,
  History,
  HeartHandshake,
  Compass,
  Shuffle,
  Share2,
  Navigation,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  QrCode,
  Coins
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// ==========================================
// TIPOS E CONFIGURAÇÕES
// ==========================================


type Embarque = {
  id: string;
  servico: string | null;
  linha: string | null;
  cidade_origem: string | null;
  cidade_destino: string | null;
  hora_saida_prevista: string | null;
  hora_real: string | null;
  carro: string | null;
  passou: boolean;
  status: string | null;
  previsao_chegada: string | null;
};

type FiltroFluxo = "todos" | "conquista" | "itapetinga";
type FiltroDestinoRapido = "todos" | "litoral_norte" | "extremo_sul" | "conquista_capital" | "sertao_oeste";

const WHATSAPP_LINK = "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria de%20informa%C3%A7%C3%B5es%20sobre%20passagens%20e%20hor%C3%A1rios.";
const WHATSAPP_ENCOMENDAS_LINK = "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20enviar%20uma%20encomenda.";
const WHATSAPP_OUTROS_TRECHOS_LINK = "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20estou%20em%20outra%20cidade%20e%20gostaria%20de%20fazer%20um%20or%C3%A7amento%20de%20viagem.";
const WHATSAPP_GRATUIDADES_LINK = "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20como%20funciona%20a%20reserva%20de%20vagas%20para%20Idoso%2C%20Id%20Jovem%20ou%20Passe%20Livre.";

const ROTAS_DESTAQUE = [
  { origem: "Itambé", destino: "Brasília", uf: "DF", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20consultar%20hor%C3%A1rios%20e%20comprar%20passagem%20de%20Itamb%C3%A9%20para%20Bras%C3%ADlia%20-%20DF." },
  { origem: "Itambé", destino: "São Paulo", uf: "SP", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20consultar%20hor%C3%A1rios%20e%20comprar%20passagem%20de%20Itamb%C3%A9%20para%20S%C3%A3o%20Paulo%20-%20SP." },
  { origem: "Itambé", destino: "Rio de Janeiro", uf: "RJ", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20consultar%20hor%C3%A1rios%20e%20comprar%20passagem%20de%20Itamb%C3%A9%20para%20Rio%20de%20Janeiro%20-%20RJ." },
  { origem: "Itambé", destino: "Barreiras", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20consultar%20hor%C3%A1rios%20e%20comprar%20passagem%20de%20Itamb%C3%A9%20para%20Barreiras%20-%20BA." },
  { origem: "Itambé", destino: "Tocantins", uf: "TO", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20consultar%20hor%C3%A1rios%20e%20comprar%20passagem%20de%20Itamb%C3%A9%20para%20o%20Tocantins." },
  { origem: "Itambé", destino: "Montes Claros", uf: "MG", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20consultar%20hor%C3%A1rios%20e%20comprar%20passagem%20de%20Itamb%C3%A9%20para%20Montes%20Claros%20-%20MG." },
];

const ROTAS_NOVOS_DESTINOS = [
  { origem: "Itambé", destino: "Correntina", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20valores%20e%20hor%C3%A1rios%20de%20passagens%20de%20Itamb%C3%A9%20para%20Correntina%20-%20BA." },
  { origem: "Itambé", destino: "Pradoso", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20valores%20e%20hor%C3%A1rios%20de%20passagens%20de%20Itamb%C3%A9%20para%20Pradoso%20-%20BA." },
  { origem: "Itambé", destino: "Igaporã", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20valores%20e%20hor%C3%A1rios%20de%20passagens%20de%20Itamb%C3%A9%20para%20Igapor%C3%A3%20-%20BA." },
  { origem: "Itambé", destino: "Abaíra", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20valores%20e%20hor%C3%A1rios%20de%20passagens%20de%20Itamb%C3%A9%20para%20Aba%C3%ADra%20-%20BA." },
  { origem: "Itambé", destino: "Poções", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20valores%20e%20hor%C3%A1rios%20de%20passagens%20de%20Itamb%C3%A9%20para%20Po%C3%A7%C3%B5es%20-%20BA." },
  { origem: "Itambé", destino: "Guanambi", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20valores%20e%20hor%C3%A1rios%20de%20passagens%20de%20Itamb%C3%A9%20para%20Guanambi%20-%20BA." },
  { origem: "Itambé", destino: "Brumado", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20valores%20e%20hor%C3%A1rios%20de%20passagens%20de%20Itamb%C3%A9%20para%20Brumado%20-%20BA." },
  { origem: "Itambé", destino: "Macaúbas", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20valores%20e%20hor%C3%A1rios%20de%20passagens%20de%20Itamb%C3%A9%20para%20Maca%C3%BAbas%20-%20BA." },
  { origem: "Itambé", destino: "Cândido Sales", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20valores%20e%20hor%C3%A1rios%20de%20passagens%20de%20Itamb%C3%A9%20para%20C%C3%A2ndido%20Sales%20-%20BA." },
  { origem: "Itambé", destino: "Vanc. Conquista", uf: "BA", linkZap: "https://wa.me/5577999999999?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20valores%20e%20hor%C3%A1rios%20de%20passagens%20de%20Itamb%C3%A9%20para%20Vit%C3%B3ria%20da%20Conquista%20-%20BA." },
];

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================
const parseMin = (hora?: string | null): number => {
  if (!hora || !hora.includes(":")) return 0;
  const partes = hora.slice(0, 5).split(":");
  if (partes.length < 2) return 0;
  const [h, m] = partes.map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

const maxMin = (min: number, val: number) => (val < min ? min : val);

const obterStatus = (item: Embarque) => {
  if (item.passou) return { texto: "Embarque Encerrado", corHeader: "bg-slate-400 text-white", icone: CheckCircle2 };
  
  const agora = new Date();
  const atual = agora.getHours() * 60 + agora.getMinutes();
  const previsto = parseMin(item.hora_saida_prevista);

  const atraso = atual - previsto;
  if (atraso > 0) return { texto: `🔴 Atrasado (${atraso} MIN)`, corHeader: "bg-rose-600 text-white", icone: AlertCircle };
  
  const minutosParaSaida = previsto - atual;
  if (minutosParaSaida <= 20) return { texto: minutosParaSaida === 0 ? "EMBARCANDO" : `SAINDO EM ${minutosParaSaida} MIN`, corHeader: "bg-[#FFCC00] text-[#0A2342]", icone: Clock };
  
  return { texto: "Próximo Carro", corHeader: "bg-[#0A2342] text-white", icone: Clock };
};

const ehFluxoItapetinga = (item: Embarque): boolean => {
  const destino = item.cidade_destino?.toLowerCase() || "";
  const linha = item.linha?.toLowerCase() || "";
  
  return (
    destino.includes("ilheus") || 
    destino.includes("ilh") || 
    destino.includes("itabuna") || 
    destino.includes("itororo") || 
    destino.includes("floresta azul") || 
    destino.includes("ibicarai") || 
    destino.includes("canavieras") || 
    destino.includes("canavieiras") || 
    destino.includes("porto") || 
    destino.includes("eunapolis") || 
    destino.includes("prado") ||
    destino.includes("potiragua") ||
    destino.includes("itagimirim") ||
    destino.includes("itapetinga") ||
    destino.includes("itambe") ||
    linha.includes("itambe") ||
    linha.includes("itapetinga")
  );
};

const obterTipoItinerarioExplicito = (item: Embarque): "sertao_oeste" | "litoral_cacau" | "extremo_sul" | "conexao_sp" | null => {
  const origem = item.cidade_origem?.toLowerCase() || "";
  const destino = item.cidade_destino?.toLowerCase() || "";
  const linha = item.linha?.toLowerCase() || "";

  const envolveCanavieiras = origem.includes("canavieiras") || origem.includes("canavieras") || destino.includes("canavieiras") || destino.includes("canavieras");
  const envolveConquista = origem.includes("conquista") || origem.includes("vitoria da conquista") || destino.includes("conquista") || destino.includes("vitoria da conquista");
  
  if (envolveCanavieiras && envolveConquista) return "conexao_sp";

  const vaiParaSertaoOeste = 
    destino.includes("barreiras") || 
    destino.includes("guanambi") || 
    destino.includes("brumado") ||
    destino.includes("macaubas") ||
    linha.includes("barreiras") ||
    linha.includes("guanambi") ||
    linha.includes("macaubas");

  const jaVemDoSertaoOeste = origem.includes("guanambi") || origem.includes("barreiras");

  if (vaiParaSertaoOeste && !jaVemDoSertaoOeste) return "sertao_oeste"; 
  if (destino.includes("ilheus") || destino.includes("ilh") || destino.includes("canavieiras") || destino.includes("itabuna") || destino.includes("itororo")) return "litoral_cacau";
  if (destino.includes("porto") || destino.includes("eunapolis") || destino.includes("prado") || destino.includes("potiragua")) return "extremo_sul";

  return null;
};

const classificarMicroRegiao = (item: Embarque): string => {
  const tipo = obterTipoItinerarioExplicito(item);
  if (tipo === "conexao_sp") return "conquista_capital"; 
  if (tipo === "sertao_oeste") return "sertao_oeste";
  if (tipo === "litoral_cacau") return "litoral_norte";
  if (tipo === "extremo_sul") return "extremo_sul";
  
  const destino = item.cidade_destino?.toLowerCase() || "";
  if (destino.includes("conquista") || destino.includes("salvador") || destino.includes("vitoria")) return "conquista_capital";
  return "outros";
};

// Remove acentos e caracteres especiais para melhorar a precisão da busca do usuário
const normalizarTexto = (texto: string): string => {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export default function PublicoEmbarques() {
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [filtroFluxo, setFiltroFluxo] = useState<FiltroFluxo>("todos");
  const [filtroDestino, setFiltroDestino] = useState<FiltroDestinoRapido>("todos");
  const [mostrarPassados, setMostrarPassados] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const alternarFiltroFluxo = (novoFiltro: FiltroFluxo) => {
    setFiltroFluxo(novoFiltro);
    setFiltroDestino("todos"); 
  };

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("embarques_dia")
        .select(`
          id, servico, linha:rota, cidade_origem, cidade_destino,
          hora_saida_prevista, hora_real, carro, passou, status, previsao_chegada
        `)
        .order("hora_saida_prevista", { ascending: true });

      if (error) throw error;
      setEmbarques((data || []) as Embarque[]);
    } catch (err) {
      console.error("Erro ao carregar embarques:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const channel = supabase
      .channel("embarques-publicos")
      .on("postgres_changes", { event: "*", schema: "public", table: "embarques_dia" }, () => carregar())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregar]);

  const opcoesDestinoDinamicas = useMemo(() => {
    const geral = { id: "todos", label: "Geral / Todos" };
    const litoralNorte = { id: "litoral_norte", label: "Eixo Itabuna / Ilhéus" };
    const extremoSul = { id: "extremo_sul", label: "Eixo Eunápolis / Porto" };
    const sertaoOeste = { id: "sertao_oeste", label: "Brumado / Macaubas / Barreiras" };
    const conquistaCapital = { id: "conquista_capital", label: "VDC / Salvador" };

    if (filtroFluxo === "itapetinga") return [geral, litoralNorte, extremoSul];
    if (filtroFluxo === "conquista") return [geral, sertaoOeste, conquistaCapital];
    return [geral, litoralNorte, extremoSul, sertaoOeste, conquistaCapital];
  }, [filtroFluxo]);

  const checarFiltrosGlobais = useCallback((item: Embarque, termoNormalizado: string) => {
    const tipoItinerario = obterTipoItinerarioExplicito(item);
    
    const passaPeloTrechoInterior = (
      (termoNormalizado === "brumado" || termoNormalizado === "macaubas") && 
      tipoItinerario === "sertao_oeste"
    );

    const servico = normalizarTexto(item.servico || "");
    const linha = normalizarTexto(item.linha || "");
    const origem = normalizarTexto(item.cidade_origem || "");
    const destino = normalizarTexto(item.cidade_destino || "");

    const bateBusca = 
      servico.includes(termoNormalizado) ||
      linha.includes(termoNormalizado) ||
      origem.includes(termoNormalizado) ||
      destino.includes(termoNormalizado) ||
      (tipoItinerario === "conexao_sp" && (termoNormalizado === "sao paulo" || termoNormalizado === "sp")) ||
      passaPeloTrechoInterior;

    if (!bateBusca) return false;

    const deFatoItapetinga = ehFluxoItapetinga(item);
    if (filtroFluxo === "itapetinga" && !deFatoItapetinga) return false;
    if (filtroFluxo === "conquista" && deFatoItapetinga) return false;

    const microRegiao = classificarMicroRegiao(item);
    if (filtroDestino !== "todos" && microRegiao !== filtroDestino) return false;

    return true;
  }, [filtroFluxo, filtroDestino]);

  const listaAtivos = useMemo(() => {
    const termo = normalizarTexto(busca);
    return embarques.filter((item) => !item.passou && checarFiltrosGlobais(item, termo));
  }, [embarques, busca, checarFiltrosGlobais]);

  const listaPassados = useMemo(() => {
    if (!mostrarPassados) return [];
    const termo = normalizarTexto(busca);
    return embarques.filter((item) => item.passou && checarFiltrosGlobais(item, termo));
  }, [embarques, busca, mostrarPassados, checarFiltrosGlobais]);

  const contadores = useMemo(() => {
    let todos = 0; let conquista = 0; let itapetinga = 0;
    embarques.forEach(item => {
      if (!item.passou) {
        todos++;
        if (ehFluxoItapetinga(item)) itapetinga++; else conquista++;
      }
    });
    return { todos, conquista, itapetinga };
  }, [embarques]);

  const lidarComCompartilhar = async (item: Embarque) => {
    const textoMensagem = `*Novo Horizonte - Filial Itambé* 🚌\n\n🔹 *Ônibus para:* ${item.cidade_destino || "Destino"} \n⏱️ *Previsão de Saída:* ${item.hora_saida_prevista || "--:--"}\n📍 *Origem:* ${item.cidade_origem || "Itambé"}\n\n_Acompanhe horários e frotas ao vivo em nosso painel digital!_`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Horário de Ônibus - Novo Horizonte", text: textoMensagem });
      } catch (err) {
        console.log("Compartilhamento cancelado.");
      }
    } else {
      try {
        await navigator.clipboard.writeText(textoMensagem);
        setCopiadoId(item.id);
        setTimeout(() => setCopiadoId(null), 2500);
      } catch (err) {
        console.error("Não foi possível copiar o texto", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased font-sans pb-8 relative text-sm">
      
      {/* TOPBAR */}
      <div className="bg-[#FFCC00] text-[#0A2342] text-[11px] font-black uppercase tracking-wider py-1.5 px-4 shadow-sm border-b border-[#0A2342]/10">
        <div className="max-w-7xl mx-auto flex flex-row justify-center items-center gap-2 text-center">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            Agência Oficial de Itambé - BA
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="bg-[#0A2342] text-white shadow-md border-b-2 border-[#004B87]">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FFCC00] text-[#0A2342] flex items-center justify-center shadow shrink-0">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase leading-none">Novo Horizonte</h1>
              <p className="text-[10px] text-slate-300 font-medium tracking-wider uppercase mt-0.5">Painel de Embarques • Agencia Itambé</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-white/10 text-white font-bold text-[10px] tracking-wider uppercase px-2 py-1 rounded-md border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFCC00] animate-ping" /> Ao Vivo
          </div>
        </div>
      </header>

      {/* SEÇÃO: FORMAS DE PAGAMENTO ACEITAS */}
      <section className="bg-white border-b border-slate-200/80 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-500">
            <CreditCard className="w-4 h-4 text-[#004B87]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0A2342]">Formas de Pagamento:</span>
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>PIX Direto</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>Crédito <strong className="text-blue-700 font-black">(Até 6x)</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
              <span>Cartão de Débito</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              <Coins className="w-3.5 h-3.5 text-slate-500" />
              <span>Dinheiro Espécie</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 mt-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          
          {/* BARRA LATERAL */}
          <aside className="space-y-4 lg:sticky lg:top-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Buscar Destinos</span>
              <div className="relative group">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Ex: São Paulo, Macaúbas..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8 h-9 rounded-lg text-xs shadow-sm border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">1. Fluxo de Itinerário</span>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => alternarFiltroFluxo("todos")} className={`flex items-center justify-between py-2 px-3 rounded-lg text-[11px] font-black uppercase transition-all border ${filtroFluxo === "todos" ? "bg-slate-700 text-white border-slate-700" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  <span className="flex items-center gap-1.5"><Layers className="w-3 h-3" /> Próximas Saídas</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded ${filtroFluxo === "todos" ? "bg-white/20" : "bg-slate-200 text-slate-700"}`}>{contadores.todos}</span>
                </button>
                <button onClick={() => alternarFiltroFluxo("conquista")} className={`flex items-center justify-between py-2 px-3 rounded-lg text-[11px] font-black uppercase transition-all border ${filtroFluxo === "conquista" ? "bg-[#004B87] text-white border-[#004B87]" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Subindo Conquista</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded ${filtroFluxo === "conquista" ? "bg-white/20" : "bg-slate-200 text-slate-700"}`}>{contadores.conquista}</span>
                </button>
                <button onClick={() => alternarFiltroFluxo("itapetinga")} className={`flex items-center justify-between py-2 px-3 rounded-lg text-[11px] font-black uppercase transition-all border ${filtroFluxo === "itapetinga" ? "bg-[#0A2342] text-white border-[#0A2342]" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  <span className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3" /> Descendo pra Itapetinga</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded ${filtroFluxo === "itapetinga" ? "bg-white/20" : "bg-slate-200 text-slate-700"}`}>{contadores.itapetinga}</span>
                </button>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">2. Linhas Principais</span>
              <div className="flex flex-col gap-1">
                {opcoesDestinoDinamicas.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => setFiltroDestino(dest.id as FiltroDestinoRapido)}
                    className={`py-1.5 px-2 text-[10px] font-black uppercase rounded-lg transition-all text-left border ${
                      filtroDestino === dest.id ? "bg-[#004B87] text-white border-[#004B87]" : "bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100"
                    }`}
                  >
                    • {dest.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-700 to-[#0A2342] text-white rounded-xl p-3 shadow border-l-4 border-[#FFCC00] space-y-2">
              <div className="flex items-start gap-2">
                <HeartHandshake className="w-4 h-4 text-[#FFCC00] shrink-0 mt-0.5" />
                <div>
                  <p className="font-black uppercase tracking-wide text-amber-400 text-[11px]">Idoso, Id Jovem ou Passe Livre?</p>
                  <p className="text-[10px] text-slate-200 leading-relaxed mt-0.5">Consulte vagas garantidas por lei direto com nossos agentes.</p>
                </div>
              </div>
              <a href={WHATSAPP_GRATUIDADES_LINK} target="_blank" rel="noreferrer" className="block w-full text-center text-[10px] bg-white text-[#0A2342] py-1.5 rounded uppercase font-black tracking-wide hover:bg-[#FFCC00] transition-all">
                Consultar Vagas
              </a>
            </div>
          </aside>

          {/* ÁREA PRINCIPAL */}
          <main className="lg:col-span-3 space-y-3">
            
            {/* ANÚNCIO FLUIDO */}
            <div className="bg-amber-500/10 border border-amber-500/20 text-[#0A2342] rounded-xl py-2 px-3 flex items-center justify-between gap-3 text-[11px] font-bold">
              <div className="flex items-center gap-2">
                <Ticket className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Evite imprevistos! Chame no Zap e <strong className="text-[#004B87]">garanta sua passagem antecipada</strong>.</span>
              </div>
              <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="text-[10px] bg-[#0A2342] text-white px-2 py-0.5 rounded uppercase font-black shrink-0 hover:bg-[#004B87] transition-all hidden md:block">
                Reservar
              </a>
            </div>

            {/* RESET FILTROS */}
            {(filtroFluxo !== "todos" || filtroDestino !== "todos" || busca) && (
              <div className="flex justify-between items-center bg-slate-200/50 border border-slate-300/50 rounded-xl py-1.5 px-3 text-xs">
                <div className="text-slate-600 font-medium flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-500" />
                  Filtrado: <strong className="text-[#0A2342]">{listaAtivos.length}</strong> carros ativos.
                </div>
                <button onClick={() => { setFiltroFluxo("todos"); setFiltroDestino("todos"); setBusca(""); }} className="text-[11px] font-black text-red-600 uppercase hover:underline">
                  Limpar ×
                </button>
              </div>
            )}

            {/* LISTAGEM DE CARROS */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#004B87]" />
                <p className="text-xs text-slate-500 font-medium tracking-wide">Acessando banco Novo Horizonte...</p>
              </div>
            ) : listaAtivos.length === 0 ? (
              <Card className="border-dashed border-2 py-10 text-center rounded-xl bg-white border-slate-200">
                <CardContent className="flex flex-col items-center justify-center gap-2 py-4">
                  <CalendarX2 className="w-6 h-6 text-slate-300" />
                  <div>
                    <h3 className="text-xs font-black text-[#0A2342] uppercase tracking-wider">Nenhum ônibus programado</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Não há veículos para os filtros selecionados.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {listaAtivos.map((item, index) => {
                  const statusInfo = obterStatus(item);
                  const Icon = statusInfo.icone;
                  const deFatoItapetinga = ehFluxoItapetinga(item);
                  const tipoItinerario = obterTipoItinerarioExplicito(item);

                  return (
                    <div key={item.id} className="space-y-3">
                      
                      {/* BANNER COMERCIAL INTERCALADO COMPACTADO */}
                      {index === 2 && (
                        <div className="bg-white border border-dashed border-[#004B87]/30 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm bg-gradient-to-br from-white to-slate-50">
                          <div className="flex items-center gap-2 text-center sm:text-left flex-col sm:flex-row">
                            <div className="p-2 bg-[#FFCC00]/10 rounded-full shrink-0">
                              <Truck className="w-4 h-4 text-[#004B87]" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black uppercase text-[#0A2342]">Encomendas & Orçamentos de Viagem</h5>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                Despachamos caixas e fardos comerciais. Também cotamos passagens saindo de outras cidades!
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 w-full sm:w-auto justify-stretch text-center">
                            <a href={WHATSAPP_OUTROS_TRECHOS_LINK} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none bg-amber-500 text-slate-950 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">
                              Cotar
                            </a>
                            <a href={WHATSAPP_ENCOMENDAS_LINK} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">
                              Cargas
                            </a>
                          </div>
                        </div>
                      )}

                      {/* CARD DO ÔNIBUS COMPACTO */}
                      <Card className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-0">
                          
                          {/* CABEÇALHO DO CARD */}
                          <div className={`flex flex-row items-center justify-between px-4 py-1.5 gap-2 ${statusInfo.corHeader}`}>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-black tracking-wider uppercase">
                                <Icon className="w-3.5 h-3.5" />
                                {statusInfo.texto}
                              </span>
                              {item.carro && item.carro !== "--" && (
                                <span className="font-mono text-[10px] font-bold bg-white/20 px-1.5 py-0.2 rounded text-white">
                                  Carro: {item.carro}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono bg-white text-[#0A2342] px-1.5 py-0.2 rounded text-[10px] font-black border">
                                #{item.servico}
                              </span>
                            </div>
                          </div>

                          {/* CORPO DO CARD */}
                          <div className="p-3">
                            <div className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-[11px] font-bold text-slate-400 uppercase truncate max-w-[80px]">
                                    {item.cidade_origem || "Origem"}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                                  <span className="text-base font-black tracking-tight text-[#0A2342] uppercase truncate">
                                    {item.cidade_destino || "Destino"}
                                  </span>
                                </div>
                                
                                {/* BADGE SUTIL DE DIRECIONAMENTO (FLUXO) */}
                                <div className="mt-1 flex items-center">
                                  {deFatoItapetinga ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold tracking-wider uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200/60">
                                      <ArrowDownRight className="w-2.5 h-2.5" /> Descendo pra Itapetinga
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold tracking-wider uppercase bg-blue-50 text-[#004B87] px-1.5 py-0.5 rounded border border-blue-100">
                                      <ArrowUpRight className="w-2.5 h-2.5" /> Subindo pra Conquista
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => lidarComCompartilhar(item)}
                                className={`flex items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border transition-all shrink-0 shadow-sm ${
                                  copiadoId === item.id ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {copiadoId === item.id ? <CheckCircle2 className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                                <span className="hidden sm:inline">{copiadoId === item.id ? "Copiado!" : "Horário"}</span>
                              </button>
                            </div>

                            {/* ALERTAS DINÂMICOS INTERNOS */}
                            {tipoItinerario === "conexao_sp" && (
                              <div className="mb-2 bg-amber-500 text-slate-950 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm animate-pulse">
                                <Shuffle className="w-3 h-3 text-slate-950" />
                                <span>Atenção: Linha com Conexão Interestadual Direta para São Paulo (SP)</span>
                              </div>
                            )}

                            {tipoItinerario === "sertao_oeste" && (
                              <div className="mb-2 bg-emerald-500/10 border border-emerald-500/20 text-[#0A2342] rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase">
                                📍 <span className="text-emerald-700">Passamos por:</span> <strong>Brumado</strong> • Guanambi • <strong>Macaúbas</strong> • Barreiras
                              </div>
                            )}

                            {tipoItinerario === "litoral_cacau" && (
                              <div className="mb-2 bg-amber-500/10 border border-amber-500/20 text-[#0A2342] rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase">
                                📍 <span className="text-[#004B87]">Embarques para:</span> Itapetinga • Itororó • Itabuna • Ilhéus
                              </div>
                            )}

                            {tipoItinerario === "extremo_sul" && (
                              <div className="mb-2 bg-blue-500/10 border border-blue-500/20 text-[#004B87] rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase">
                                📍 <span className="text-[#0A2342]">Embarques para:</span> Potiraguá • Eunápolis • Porto Seguro
                              </div>
                            )}

                            {/* QUADRO DE HORÁRIOS COMPACTO */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-lg bg-[#004B87]/5 border border-[#004B87]/10 p-1.5 text-center sm:text-left">
                                <span className="text-[10px] font-black text-[#004B87] uppercase tracking-wider block opacity-80">Previsão</span>
                                <span className="text-sm sm:text-base font-black font-mono text-[#004B87]">{item.hora_saida_prevista || "--:--"}</span>
                              </div>
                              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-1.5 text-center sm:text-left">
                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block opacity-80">Partida Real</span>
                                <span className="text-sm sm:text-base font-black font-mono text-emerald-600">{item.hora_real || "--:--"}</span>
                              </div>
                              <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5 flex flex-col justify-center min-w-0">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Itinerário</span>
                                <span className="text-[11px] font-bold text-slate-600 truncate uppercase mt-0.5">{item.linha || "Não informado"}</span>
                              </div>
                            </div>

                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SEÇÃO: COMPRAR PASSAGENS */}
            <div className="mt-10 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase text-[#0A2342] tracking-wider">
                    Passagens Saindo de Itambé
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Reserve seu assento direto no WhatsApp com suporte da nossa filial
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ROTAS_DESTAQUE.map((rota, idx) => (
                  <a
                    key={idx}
                    href={rota.linkZap}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white border border-slate-200 rounded-xl p-3.5 transition-all duration-300 group shadow-sm hover:shadow-md hover:border-emerald-500 hover:ring-4 hover:ring-emerald-500/5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        <span className="truncate">{rota.origem}</span>
                        <span className="text-slate-300 font-normal">➔</span>
                      </div>
                      
                      <div className="text-sm font-black text-[#0A2342] mt-1 flex items-center justify-between gap-2">
                        <span className="truncate uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                          {rota.destino}
                        </span>
                        <span className="text-[10px] font-mono font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.5 rounded uppercase shrink-0">
                          {rota.uf}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50/50 group-hover:bg-emerald-50 mt-4 px-2.5 py-1.5 rounded-lg border border-emerald-500/10 flex items-center gap-2 uppercase tracking-wider transition-colors">
                      <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-transparent shrink-0" />
                      <span>Garantir Vaga</span>
                      <ArrowRight className="w-3 h-3 ml-auto transition-transform group-hover:translate-x-1 text-emerald-600" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* SEÇÃO REFORMULADA: NOVOS DESTINOS */}
            <div className="mt-10 pt-6 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0 shadow-sm border border-emerald-100">
                    <MapPin className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase text-[#0A2342] tracking-wide">
                      Nós Embarcamos Você Onde Estiver!
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                      Selecione sua localização atual e fale com nossa filial para garantir sua viagem.
                    </p>
                  </div>
                </div>
                
                <span className="self-start sm:self-center text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 px-2.5 py-1 rounded-full border border-amber-500/20">
                  📍 Suporte Direto e Regional
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                {ROTAS_NOVOS_DESTINOS.map((rota, idx) => (
                  <a
                    key={idx}
                    href={rota.linkZap}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3.5 transition-all duration-300 group shadow-sm hover:shadow-md hover:bg-white hover:border-emerald-500 hover:ring-4 hover:ring-emerald-500/5 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 w-12 h-12 bg-emerald-500/5 rounded-full group-hover:bg-emerald-500/10 transition-colors" />

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md uppercase">
                          {rota.uf}
                        </span>
                        <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-500 transition-colors">
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Partir daqui</span>
                          <Compass className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      
                      <div className="text-xs font-extrabold text-[#0A2342] uppercase tracking-wide mt-3 line-clamp-2 group-hover:text-emerald-800 transition-colors leading-tight">
                        {rota.destino}
                      </div>
                    </div>
                    
                    <div className="text-[11px] font-bold text-slate-500 mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between uppercase tracking-wider group-hover:border-emerald-100 group-hover:text-emerald-600 transition-colors">
                      <span>Chamar no Zap</span>
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* HISTÓRICO DE EMBARQUES */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col items-center gap-2">
              <button
                onClick={() => setMostrarPassados(!mostrarPassados)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black uppercase border transition-all ${
                  mostrarPassados ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>{mostrarPassados ? "Ocultar carros que já saíram" : "Ver carros que já saíram hoje"}</span>
              </button>
              <p className="text-[9px] text-slate-400 max-w-xs text-center">
                Clique para auditar o histórico de frotas das últimas horas na filial.
              </p>
            </div>

            {mostrarPassados && (
              <div className="mt-4 space-y-2 border-l-2 border-slate-300 pl-3 bg-slate-50/50 p-2 rounded-lg">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <History className="w-3.5 h-3.5" />
                  <h3 className="text-[10px] font-black uppercase tracking-wider">Viagens Concluídas (Hoje)</h3>
                </div>
                
                {listaPassados.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Nenhum registro encontrado.</p>
                ) : (
                  listaPassados.map((item) => (
                    <div key={item.id} className="opacity-50 grayscale">
                      <Card className="rounded-lg border border-slate-200 bg-white">
                        <CardContent className="p-2 flex flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 min-w-0">
                            <span className="uppercase text-[10px] text-slate-400">Finalizada</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                            <span className="font-black uppercase text-[#0A2342] truncate">{item.cidade_destino}</span>
                            {item.carro && <span className="font-mono text-[9px] bg-slate-100 px-1 rounded text-slate-500">#{item.carro}</span>}
                          </div>
                          
                          <div className="flex gap-3 text-right shrink-0">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Prog.</span>
                              <span className="text-xs font-black font-mono text-slate-500">{item.hora_saida_prevista || "--:--"}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Real</span>
                              <span className="text-xs font-black font-mono text-slate-600">{item.hora_real || "--:--"}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
                )}
              </div>
            )}

          </main>
        </div>

        <footer className="mt-8 text-center border-t border-slate-200 pt-4">
          <p className="text-[10px] text-slate-400 font-black tracking-wider uppercase">Plataforma Digital de Autoatendimento • Agência Itambé - BA</p>
        </footer>
      </div>

      {/* BOTÃO FLUTUANTE */}
      <div className="fixed bottom-4 right-4 z-50 drop-shadow-md">
        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white p-3 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center" aria-label="WhatsApp">
          <MessageCircle className="w-6 h-6 fill-white text-transparent" />
        </a>
      </div>

    </div>
  );
}