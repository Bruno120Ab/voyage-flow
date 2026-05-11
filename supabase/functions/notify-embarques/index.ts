// Notifica via WhatsApp N min antes da saída de embarques_dia (configurável em app_config)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const apiHeaders = {
  "Content-Type": "application/json",
  SecretKey: Deno.env.get("APIBRASIL_SECRET_KEY") ?? "",
  PublicToken: Deno.env.get("APIBRASIL_PUBLIC_TOKEN") ?? "",
  DeviceToken: Deno.env.get("APIBRASIL_DEVICE_TOKEN") ?? "",
  Authorization: `Bearer ${Deno.env.get("APIBRASIL_BEARER") ?? ""}`,
};

interface AlertsCfg {
  enabled: boolean;
  minutos_antes: number;
  contatos: string[];
}
const DEFAULT_CFG: AlertsCfg = {
  enabled: true,
  minutos_antes: 10,
  contatos: ["5577991157974"],
};

function parseHora(dataOp: string, hhmm: string): Date | null {
  if (!hhmm) return null;
  const m = String(hhmm).match(/(\d{1,2})[:h.]?(\d{2})/);
  if (!m) return null;
  const [_, h, mi] = m;
  const d = new Date(`${dataOp}T${h.padStart(2, "0")}:${mi}:00-03:00`);
  return isNaN(d.getTime()) ? null : d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Carrega config
  const { data: cfgRow } = await sa.from("app_config").select("valor").eq("chave", "embarque_alerts").maybeSingle();
  const cfg: AlertsCfg = { ...DEFAULT_CFG, ...((cfgRow?.valor as any) ?? {}) };

  if (!cfg.enabled || !cfg.contatos?.length) {
    return new Response(JSON.stringify({ skipped: true, reason: "disabled or no contacts" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const minutos = Math.max(1, Number(cfg.minutos_antes) || 10);

  const now = Date.now();
  const hoje = new Date().toISOString().slice(0, 10);
  const sent: { source: string; id: string }[] = [];
  const sendWhats = async (texto: string) => {
    let okAny = false;
    for (const number of cfg.contatos) {
      try {
        const resp = await fetch("https://gateway.apibrasil.io/api/v2/whatsapp/sendText", {
          method: "POST", headers: apiHeaders,
          body: JSON.stringify({ number, text: texto }),
        });
        if (resp.ok) okAny = true;
        else console.error("sendText falhou", number, resp.status, await resp.text());
      } catch (e) { console.error("erro envio", number, e); }
    }
    return okAny;
  };
  const inWindow = (saida: Date) => {
    const diffMin = (saida.getTime() - now) / 60000;
    return diffMin <= minutos + 2 && diffMin >= minutos - 2;
  };

  // ===== embarques_dia =====
  const { data: rowsDia } = await sa
    .from("embarques_dia").select("*")
    .eq("data_operacao", hoje).eq("notificado_10min", false).eq("passou", false);

  for (const r of rowsDia ?? []) {
    const saida = parseHora(r.data_operacao, r.hora_saida_prevista);
    if (!saida || !inWindow(saida)) continue;
    const horaFmt = r.hora_saida_prevista || saida.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const texto =
`⏰ *Alerta de Embarque - ${minutos} min*

🚌 Carro: ${r.carro || "--"}
📍 Linha: ${r.rota || "--"}
🛎 Serviço: ${r.servico || "--"}
🕒 Saída prevista: ${horaFmt}
🚏 Origem: ${r.cidade_origem || "--"}
🎯 Destino: ${r.cidade_destino || "--"}
👨‍✈️ Motorista: ${r.motorista || "Não informado"}
${r.cliente_nome ? `👤 Cliente: ${r.cliente_nome}\n` : ""}${r.observacao ? `📝 Obs: ${r.observacao}` : ""}`.trim();
    if (await sendWhats(texto)) {
      await sa.from("embarques_dia").update({ notificado_10min: true }).eq("id", r.id);
      sent.push({ source: "embarques_dia", id: r.id });
    }
  }

  // ===== embarques (aba Embarques) =====
  const inicio = new Date(now - 60 * 60_000).toISOString();
  const fim = new Date(now + (minutos + 5) * 60_000).toISOString();
  const { data: rowsEmb } = await sa
    .from("embarques")
    .select("id,origem,destino,local_embarque,data_saida,status,observacoes,veiculos(placa,modelo)")
    .eq("notificado_alerta", false)
    .neq("status", "cancelado")
    .neq("status", "finalizado")
    .gte("data_saida", inicio)
    .lte("data_saida", fim);

  for (const e of rowsEmb ?? []) {
    const saida = new Date(e.data_saida);
    if (isNaN(saida.getTime()) || !inWindow(saida)) continue;
    const horaFmt = saida.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" });
    const dataFmt = saida.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" });
    const v: any = (e as any).veiculos;
    const texto =
`⏰ *Alerta de Embarque - ${minutos} min*

🚏 Origem: ${e.origem || "--"}
🎯 Destino: ${e.destino || "--"}
🕒 Saída: ${dataFmt} às ${horaFmt}
${e.local_embarque ? `📍 Local: ${e.local_embarque}\n` : ""}${v?.placa ? `🚌 Veículo: ${v.placa}${v.modelo ? " - " + v.modelo : ""}\n` : ""}📌 Status: ${e.status || "--"}`.trim();
    if (await sendWhats(texto)) {
      await sa.from("embarques").update({ notificado_alerta: true }).eq("id", e.id);
      sent.push({ source: "embarques", id: e.id });
    }
  }

  return new Response(JSON.stringify({
    checkedDia: rowsDia?.length ?? 0,
    checkedEmb: rowsEmb?.length ?? 0,
    sent, minutos, contatos: cfg.contatos.length,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
