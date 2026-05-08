// Edge Function: proxy seguro para APIBrasil WhatsApp Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const apiHeaders = {
  "Content-Type": "application/json",
  SecretKey: Deno.env.get("APIBRASIL_SECRET_KEY") ?? "",
  PublicToken: Deno.env.get("APIBRASIL_PUBLIC_TOKEN") ?? "",
  DeviceToken: Deno.env.get("APIBRASIL_DEVICE_TOKEN") ?? "",
  Authorization: `Bearer ${Deno.env.get("APIBRASIL_BEARER") ?? ""}`,
};

const BASE = "https://gateway.apibrasil.io/api/v2/whatsapp";

type Action =
  | "sendText"
  | "getMessagesChat"
  | "getAllNewMessages"
  | "getUnreadMessages";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: exige usuário logado
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claims } = await supa.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => ({}));
    const action = body.action as Action;
    if (!action) {
      return new Response(JSON.stringify({ error: "action requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let upstream: Response;
    if (action === "sendText") {
      const { number, text } = body;
      if (!number || !text) {
        return new Response(JSON.stringify({ error: "number e text requeridos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      upstream = await fetch(`${BASE}/sendText`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ number, text }),
      });
      // Persiste mensagem enviada
      const data = await upstream.clone().json().catch(() => null);
      const sa = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const tel = String(number).replace(/\D/g, "");
      // Tenta achar lead pelo telefone
      const { data: lead } = await sa
        .from("leads")
        .select("id")
        .or(`whatsapp.ilike.%${tel.slice(-8)}%,telefone.ilike.%${tel.slice(-8)}%`)
        .limit(1)
        .maybeSingle();
      await sa.from("mensagens_whatsapp").insert({
        telefone: tel,
        direcao: "saida",
        texto: String(text),
        lead_id: lead?.id ?? null,
        created_by: userId,
      });
      if (lead?.id) {
        await sa.from("leads").update({
          ultima_interacao: new Date().toISOString(),
          ultima_mensagem: String(text).slice(0, 200),
        }).eq("id", lead.id);
      }
      return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (action === "getMessagesChat") {
      upstream = await fetch(`${BASE}/getMessagesChat`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ phone: body.phone }),
      });
    } else if (action === "getAllNewMessages") {
      upstream = await fetch(`${BASE}/getAllNewMessages`, {
        method: "GET",
        headers: apiHeaders,
      });
    } else if (action === "getUnreadMessages") {
      upstream = await fetch(`${BASE}/getUnreadMessages`, {
        method: "GET",
        headers: apiHeaders,
      });
    } else {
      return new Response(JSON.stringify({ error: "action inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
