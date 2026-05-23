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
// }

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  Share2
} from "lucide-react";

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

// ==========================================
// FUNÇÕES UTILITÁRIAS (FORA DO COMPONENTE)
// ==========================================
const parseMin = (hora?: string | null): number => {
  if (!hora || !hora.includes(":")) return 0;
  const partes = hora.slice(0, 5).split(":");
  if (partes.length < 2) return 0;
  const [h, m] = partes.map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

const obterStatus = (item: Embarque) => {
  if (item.passou) return { texto: "CONCLUÍDO", corHeader: "bg-slate-400 text-white", icone: CheckCircle2 };
  
  const agora = new Date();
  const atual = agora.getHours() * 60 + agora.getMinutes();
  const previsto = parseMin(item.hora_saida_prevista);
  const diff = previsto - atual;

  if (diff < 0) return { texto: `ATRASADO (${Math.abs(diff)} MIN)`, corHeader: "bg-rose-600 text-white", icone: AlertCircle };
  if (diff <= 20) return { texto: diff === 0 ? "EMBARCANDO" : `SAINDO EM ${diff} MIN`, corHeader: "bg-[#FFCC00] text-[#0A2342]", icone: Clock };
  
  return { texto: "PROGRAMADO", corHeader: "bg-[#004B87] text-white", icone: Clock };
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
  
  if (envolveCanavieiras && envolveConquista) {
    return "conexao_sp";
  }

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

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function PublicoEmbarques() {
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [filtroFluxo, setFiltroFluxo] = useState<FiltroFluxo>("todos");
  const [filtroDestino, setFiltroDestino] = useState<FiltroDestinoRapido>("todos");
  const [mostrarPassados, setMostrarPassados] = useState(false);
  
  // Estado para gerenciar id do item copiado temporariamente
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "embarques_dia" },
        () => {
          carregar();
        }
      )
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

  const checarFiltrosGlobais = useCallback((item: Embarque, termo: string) => {
    const tipoItinerario = obterTipoItinerarioExplicito(item);
    
    const passaPeloTrechoInterior = (
      (termo === "brumado" || termo === "macaubas" || termo === "macaúbas") && 
      tipoItinerario === "sertao_oeste"
    );

    const bateBusca = 
      (item.servico?.toLowerCase().includes(termo) ?? false) ||
      (item.linha?.toLowerCase().includes(termo) ?? false) ||
      (item.cidade_origem?.toLowerCase().includes(termo) ?? false) ||
      (item.cidade_destino?.toLowerCase().includes(termo) ?? false) ||
      (tipoItinerario === "conexao_sp" && (termo === "são paulo" || termo === "sao paulo" || termo === "sp")) ||
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
    const termo = busca.toLowerCase().trim();
    return embarques.filter((item) => !item.passou && checarFiltrosGlobais(item, termo));
  }, [embarques, busca, checarFiltrosGlobais]);

  const listaPassados = useMemo(() => {
    if (!mostrarPassados) return [];
    const termo = busca.toLowerCase().trim();
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

  // FUNÇÃO REFORMULADA DE COMPARTILHAMENTO
  const lidarComCompartilhar = async (item: Embarque) => {
    const textoMensagem = `*Novo Horizonte - Filial Itambé* 🚌\n\n🔹 *Ônibus para:* ${item.cidade_destino || "Destino"}\n⏱️ *Previsão de Saída:* ${item.hora_saida_prevista || "--:--"}\n📍 *Origem:* ${item.cidade_origem || "Itambé"}\n\n_Acompanhe horários e frotas ao vivo em nosso painel digital!_`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Horário de Ônibus - Novo Horizonte",
          text: textoMensagem,
        });
      } catch (err) {
        console.log("Compartilhamento cancelado ou não concluído.");
      }
    } else {
      // Fallback: Copiar para área de transferência
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
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased font-sans pb-12 relative">
      
      {/* TOPBAR */}
      <div className="bg-[#FFCC00] text-[#0A2342] text-xs font-black uppercase tracking-wider py-2.5 px-4 shadow-sm border-b border-[#0A2342]/10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            📍 Agência Oficial Rodoviária de Itambé - BA
          </div>
        
        </div>
      </div>

      {/* HEADER */}
      <header className="bg-[#0A2342] text-white shadow-xl border-b-4 border-[#004B87]">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFCC00] text-[#0A2342] flex items-center justify-center shadow-lg shrink-0">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Novo Horizonte</h1>
              <p className="text-xs text-slate-300 font-medium tracking-wider uppercase">Painel de Embarques • Filial Itambé</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 text-white font-bold text-xs tracking-wider uppercase px-3 py-1.5 rounded-lg border border-white/20 self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-[#FFCC00] animate-ping" /> Ao Vivo
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-8 sm:px-6">

        {/* BUSCA */}
        <div className="relative mb-6 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#004B87] transition-colors" />
          <Input
            placeholder="Buscar destino final, conexões ou linhas (Ex: São Paulo, Macaúbas, Brumado)..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-12 h-14 rounded-xl text-base shadow-sm border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-[#004B87]/20 focus-visible:border-[#004B87] transition-all font-medium"
          />
        </div>

        {/* FILTRO 1 */}
        <div className="mb-4">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">1. Filtrar por Fluxo de Itinerário</span>
          <div className="flex flex-col sm:flex-row gap-2 bg-slate-200/80 p-1.5 rounded-2xl">
            <button onClick={() => alternarFiltroFluxo("todos")} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase transition-all flex-1 ${filtroFluxo === "todos" ? "bg-slate-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-300/50"}`}>
              <Layers className="w-3.5 h-3.5" />
              <span>Próximas Saídas ({contadores.todos})</span>
            </button>
            <button onClick={() => alternarFiltroFluxo("conquista")} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase transition-all flex-1 ${filtroFluxo === "conquista" ? "bg-[#004B87] text-white shadow-sm" : "text-slate-600 hover:bg-slate-300/50"}`}>
              <MapPin className="w-3.5 h-3.5" />
              <span>Subindo Vitória da Conquista ({contadores.conquista})</span>
            </button>
            <button onClick={() => alternarFiltroFluxo("itapetinga")} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase transition-all flex-1 ${filtroFluxo === "itapetinga" ? "bg-[#0A2342] text-white shadow-sm border-b-2 border-[#FFCC00]" : "text-slate-600 hover:bg-slate-300/50"}`}>
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Descendo Itapetinga / Litoral ({contadores.itapetinga})</span>
            </button>
          </div>
        </div>

        {/* FILTRO 2 */}
        <div className="mb-4">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">2. Itinerários Expressos e Linhas Principais</span>
          <div className={`grid bg-white border border-slate-200 rounded-xl p-1 gap-1 ${
            opcoesDestinoDinamicas.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-5"
          }`}>
            {opcoesDestinoDinamicas.map((dest) => (
              <button
                key={dest.id}
                onClick={() => setFiltroDestino(dest.id as FiltroDestinoRapido)}
                className={`py-2.5 px-1 text-[10px] font-black uppercase rounded-lg transition-all text-center ${
                  filtroDestino === dest.id ? "bg-[#004B87] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {dest.label}
              </button>
            ))}
          </div>
        </div>

        {/* BANNER: GRATUIDADES (IDOSO, ID JOVEM, PASSE LIVRE) */}
        <div className="mb-4 bg-gradient-to-r from-blue-700 to-[#0A2342] text-white rounded-xl p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md border-l-4 border-[#FFCC00]">
          <div className="flex items-center gap-3 text-center sm:text-left flex-col sm:flex-row">
            <div className="p-2 bg-white/10 rounded-lg text-[#FFCC00] shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black uppercase tracking-wide text-amber-400">Precisa de vaga para Idosos, Id Jovem ou Passe Livre?</p>
              <p className="text-[11px] text-slate-200 font-medium">Consulte nossos agentes para verificar a disponibilidade de assentos reservados por lei e emitir seu benefício.</p>
            </div>
          </div>
          <a href={WHATSAPP_GRATUIDADES_LINK} target="_blank" rel="noreferrer" className="w-full sm:w-auto text-center text-[10px] bg-white text-[#0A2342] px-3 py-2 rounded-lg uppercase font-black tracking-wide shrink-0 hover:bg-[#FFCC00] transition-all">
            Consultar Vagas
          </a>
        </div>

        {/* ANÚNCIO: RESERVA ANTECIPADA */}
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 text-[#0A2342] rounded-xl p-3 px-4 flex items-center justify-between gap-3 text-xs font-bold">
          <div className="flex items-center gap-2.5">
            <Ticket className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Evite imprevistos! Fale conosco no WhatsApp para consultar vagas e <strong className="text-[#004B87]">garantir sua passagem antecipada</strong>.</span>
          </div>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="text-[11px] bg-[#0A2342] text-white px-3 py-1 rounded-md uppercase font-black tracking-wide shrink-0 hover:bg-[#004B87] transition-all hidden md:block">
            Reservar Agora
          </a>
        </div>

        {/* RESET FILTROS */}
        {(filtroFluxo !== "todos" || filtroDestino !== "todos" || busca) && (
          <div className="mb-4 flex justify-between items-center bg-slate-200/50 border border-slate-300/60 rounded-xl p-2.5 px-4 text-xs">
            <div className="text-slate-600 font-medium flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              Filtros ativos. Mostrando <strong className="text-[#0A2342]">{listaAtivos.length}</strong> carros programados.
            </div>
            <button 
              onClick={() => { setFiltroFluxo("todos"); setFiltroDestino("todos"); setBusca(""); }} 
              className="text-xs font-black text-red-600 uppercase hover:underline"
            >
              Limpar Filtros ×
            </button>
          </div>
        )}

        {/* LISTAGEM PRINCIPAL: CARROS ATIVOS */}
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#004B87]" />
            <p className="text-sm text-slate-500 font-medium tracking-wide">Buscando banco de dados Novo Horizonte...</p>
          </div>
        ) : listaAtivos.length === 0 ? (
          <Card className="border-dashed border-2 py-16 text-center rounded-2xl bg-white border-slate-300 shadow-inner">
            <CardContent className="flex flex-col items-center justify-center gap-4">
              <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                <CalendarX2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0A2342] uppercase tracking-wider">Nenhum ônibus programado</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Não há veículos ativos para os critérios selecionados.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {listaAtivos.map((item, index) => {
              const statusInfo = obterStatus(item);
              const Icon = statusInfo.icone;
              const deFatoItapetinga = ehFluxoItapetinga(item);
              const tipoItinerario = obterTipoItinerarioExplicito(item);

              return (
                <div key={item.id} className="space-y-4">
                  {/* BANNER COMERCIAL INTERCALADO */}
                  {index === 2 && (
                    <div className="bg-white border-2 border-dashed border-[#004B87]/30 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm bg-gradient-to-br from-white to-slate-50">
                      <div className="flex items-center gap-3.5 text-center md:text-left flex-col md:flex-row">
                        <div className="p-3 bg-[#FFCC00]/10 text-[#0A2342] rounded-full shrink-0">
                          <Truck className="w-6 h-6 text-[#004B87]" />
                        </div>
                        <div>
                          <h5 className="text-sm font-black uppercase text-[#0A2342]">Viajando ou enviando encomendas?</h5>
                          <p className="text-xs text-slate-500 font-medium max-w-md mt-0.5">
                            Pensando em viajar de outros lugares? Nos chame e vamos fazer seu orçamento! Também despachamos caixas comerciais e fardos.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto justify-stretch">
                        <a href={WHATSAPP_OUTROS_TRECHOS_LINK} target="_blank" rel="noreferrer" className="flex-1 md:flex-none text-center bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition-colors">
                          Pedir Orçamento
                        </a>
                        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="flex-1 md:flex-none text-center bg-[#0A2342] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#004B87] transition-colors">
                          Passagens Itambé
                        </a>
                        <a href={WHATSAPP_ENCOMENDAS_LINK} target="_blank" rel="noreferrer" className="flex-1 md:flex-none text-center bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors">
                          Encomendas
                        </a>
                      </div>
                    </div>
                  )}

                  <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white">
                    <CardContent className="p-0">
                      
                      {/* CABEÇALHO */}
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 gap-3 ${statusInfo.corHeader}`}>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 text-sm font-black tracking-wider uppercase">
                            <Icon className="w-4 h-4" />
                            {statusInfo.texto}
                          </span>
                          {item.carro && item.carro !== "--" && (
                            <span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded text-white border border-white/10">
                              Prefixo: {item.carro}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded tracking-wide uppercase shadow-sm ${
                            deFatoItapetinga ? "bg-[#FFCC00] text-[#0A2342] border border-[#0A2342]/10" : "bg-white/20 text-white"
                          }`}>
                            {deFatoItapetinga ? "Via Itapetinga" : "Via Conquista"}
                          </span>
                          <span className="font-mono bg-white text-[#0A2342] px-2 py-0.5 rounded text-xs font-black border">
                            #{item.servico}
                          </span>
                        </div>
                      </div>

                      {/* CORPO */}
                      <div className="p-5 sm:p-6">
                        
                        {/* ORIGEM E DESTINO */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                          <div className="flex flex-wrap items-center gap-y-2 gap-x-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[#004B87] shrink-0" />
                              <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                {item.cidade_origem || "Origem"}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="flex items-center gap-2">
                              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#0A2342] uppercase">
                                {item.cidade_destino || "Destino"}
                              </span>
                            </div>
                          </div>

                          {/* NOVO BOTÃO: COMPARTILHAR HORÁRIO */}
                          <button
                            onClick={() => lidarComCompartilhar(item)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all self-start md:self-center w-full md:w-auto shadow-sm ${
                              copiadoId === item.id 
                                ? "bg-emerald-600 text-white border-emerald-600" 
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {copiadoId === item.id ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-white" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-4 h-4 text-slate-500 group-hover:text-slate-700" />
                                <span>Compartilhar Horário</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* REGRA DINÂMICA: BADGE DO CARRO CONEXÃO SÃO PAULO */}
                        {tipoItinerario === "conexao_sp" && (
                          <div className="mb-4 bg-amber-500 border-2 border-amber-600 text-slate-950 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wide flex items-center gap-2 shadow-sm animate-pulse">
                            <Shuffle className="w-4 h-4 text-slate-950" />
                            <span>⚠️ ATENÇÃO: Linha de Tráfego com Conexão Interestadual Direta para São Paulo (SP)</span>
                          </div>
                        )}

                        {/* BANNER DE DIRECIONAMENTO INTELIGENTE PADRÃO */}
                        {tipoItinerario === "sertao_oeste" && (
                          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-[#0A2342] rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
                            📍 <span className="text-emerald-700">Eixo Sertão / Oeste:</span> Linha com destino ao interior. Passa em <strong className="text-[#004B87]">Brumado</strong> • Caetité • Guanambi • <strong className="underline decoration-2 text-[#0A2342]">Macaúbas</strong> • Barreiras
                          </div>
                        )}

                        {tipoItinerario === "litoral_cacau" && (
                          <div className="mb-4 bg-amber-500/10 border border-amber-500/20 text-[#0A2342] rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
                            📍 <span className="text-[#004B87]">Itinerário Litoral Norte:</span> Itambé • Itapetinga • Itororó • Floresta Azul • Itabuna • Ilhéus
                          </div>
                        )}

                        {tipoItinerario === "extremo_sul" && (
                          <div className="mb-4 bg-blue-500/10 border border-blue-500/20 text-[#004B87] rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
                            📍 <span className="text-[#0A2342]">Itinerário Extremo Sul:</span> Itambé • Itapetinga • Potiraguá • Itagimirim • Eunápolis • Porto Seguro
                          </div>
                        )}

                        {/* GRID DE HORÁRIOS */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="rounded-xl bg-[#004B87]/5 border border-[#004B87]/10 p-3.5">
                            <span className="text-[9px] font-black text-[#004B87] uppercase tracking-wider block opacity-80">Previsão Saída</span>
                            <span className="text-xl sm:text-2xl font-black mt-0.5 block font-mono text-[#004B87]">{item.hora_saida_prevista || "--:--"}</span>
                          </div>
                          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3.5">
                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block opacity-80">Partida Real</span>
                            <span className="text-xl sm:text-2xl font-black mt-0.5 block font-mono text-emerald-600">{item.hora_real || "--:--"}</span>
                          </div>
                          <div className="col-span-2 md:col-span-1 rounded-xl bg-slate-50 border border-slate-100 p-3.5 flex flex-col justify-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Itinerário Operacional</span>
                            <span className="text-xs font-bold mt-1 block text-slate-700 truncate uppercase">{item.linha || "Não informado"}</span>
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

        {/* CONTROLE INTEGRADO DE HISTÓRICO */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col items-center gap-4">
          <button
            onClick={() => setMostrarPassados(!mostrarPassados)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all shadow-sm ${
              mostrarPassados 
                ? "bg-slate-800 text-white border-slate-800" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <History className="w-4 h-4" />
            <span>{mostrarPassados ? "Ocultar carros que já saíram hoje" : "Ver carros que já saíram hoje"}</span>
          </button>

          <p className="text-[10px] text-slate-400 max-w-md text-center">
            Clique acima para auditar o histórico de frotas e ônibus que completaram o fluxo de tráfego na filial nas últimas horas.
          </p>
        </div>

        {/* LISTAGEM SECUNDÁRIA: HISTÓRICO REFORMULADO */}
        {mostrarPassados && (
          <div className="mt-8 space-y-4 border-l-4 border-slate-300 pl-4 sm:pl-6 bg-slate-50/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
              <History className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">Histórico de Viagens Concluídas (Hoje)</h3>
            </div>
            
            {listaPassados.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium italic">Nenhum ônibus registrado no histórico para esta busca.</p>
            ) : (
              listaPassados.map((item) => (
                <div key={item.id} className="opacity-40 grayscale hover:opacity-70 transition-opacity">
                  <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between px-5 py-2 bg-slate-400 text-white text-[11px] font-bold uppercase tracking-wide">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Viagem Finalizada
                        </span>
                        <span className="font-mono text-[10px] bg-black/10 px-2 py-0.5 rounded">
                          Prefixo: {item.carro || "--"}
                        </span>
                      </div>
                      
                      <div className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <span className="uppercase">{item.cidade_origem}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-sm font-black uppercase text-slate-700">{item.cidade_destino}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Saída Programada</span>
                            <span className="text-sm font-black font-mono text-slate-500">{item.hora_saida_prevista || "--:--"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Partida Real</span>
                            <span className="text-sm font-black font-mono text-slate-600">{item.hora_real || "--:--"}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-12 text-center border-t border-slate-200 pt-6">
          <p className="text-[11px] text-slate-400 font-black tracking-wider uppercase">Plataforma Digital de Autoatendimento • Agência Itambé - BA</p>
        </footer>

      </div>

      {/* BOTÃO FLUTUANTE */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 drop-shadow-xl">
        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#20ba5a] hover:scale-105 active:scale-95 transition-all flex items-center justify-center group" aria-label="Contato via WhatsApp">
          <MessageCircle className="w-7 h-7 fill-white text-transparent" />
        </a>
      </div>

    </div>
  );
}