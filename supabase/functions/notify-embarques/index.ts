// Notifica via WhatsApp 10 min antes da saída de embarques_dia
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOTIFY_NUMBER = "5577991157974";

const apiHeaders = {
  "Content-Type": "application/json",
  SecretKey: Deno.env.get("APIBRASIL_SECRET_KEY") ?? "",
  PublicToken: Deno.env.get("APIBRASIL_PUBLIC_TOKEN") ?? "",
  DeviceToken: Deno.env.get("APIBRASIL_DEVICE_TOKEN") ?? "",
  Authorization: `Bearer ${Deno.env.get("APIBRASIL_BEARER") ?? ""}`,
};

function parseHora(dataOp: string, hhmm: string): Date | null {
  if (!hhmm) return null;
  const m = String(hhmm).match(/(\d{1,2})[:h.]?(\d{2})/);
  if (!m) return null;
  const [_, h, mi] = m;
  // Brasil = UTC-3. Construímos a data no fuso de São Paulo convertendo p/ UTC.
  const d = new Date(`${dataOp}T${h.padStart(2, "0")}:${mi}:00-03:00`);
  return isNaN(d.getTime()) ? null : d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: rows, error } = await sa
    .from("embarques_dia")
    .select("*")
    .eq("data_operacao", hoje)
    .eq("notificado_10min", false)
    .eq("passou", false);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  const sent: string[] = [];

  for (const r of rows ?? []) {
    const saida = parseHora(r.data_operacao, r.hora_saida_prevista);
    if (!saida) continue;
    const diffMin = (saida.getTime() - now) / 60000;
    // Janela: entre 8 e 12 minutos antes
    if (diffMin > 12 || diffMin < 8) continue;

    const horaFmt = r.hora_saida_prevista || saida.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const texto =
`⏰ *Alerta de Embarque - 10 min*

🚌 Carro: ${r.carro || "--"}
📍 Linha: ${r.rota || "--"}
🛎 Serviço: ${r.servico || "--"}
🕒 Saída prevista: ${horaFmt}
🚏 Origem: ${r.cidade_origem || "--"}
🎯 Destino: ${r.cidade_destino || "--"}
👨‍✈️ Motorista: ${r.motorista || "Não informado"}
${r.cliente_nome ? `👤 Cliente: ${r.cliente_nome}\n` : ""}${r.observacao ? `📝 Obs: ${r.observacao}` : ""}`.trim();

    try {
      const resp = await fetch("https://gateway.apibrasil.io/api/v2/whatsapp/sendText", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ number: NOTIFY_NUMBER, text: texto }),
      });
      if (resp.ok) {
        await sa.from("embarques_dia").update({ notificado_10min: true }).eq("id", r.id);
        sent.push(r.id);
      } else {
        console.error("sendText falhou", r.id, resp.status, await resp.text());
      }
    } catch (e) {
      console.error("erro envio", r.id, e);
    }
  }

  return new Response(JSON.stringify({ checked: rows?.length ?? 0, sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
