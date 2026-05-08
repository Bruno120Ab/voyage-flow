import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppMessage {
  number: string;
  text: string;
}

async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("whatsapp-api", {
    body: { action, ...payload },
  });
  if (error) throw error;
  return data;
}

export const sendText = (m: WhatsAppMessage) =>
  call("sendText", { number: m.number, text: m.text });

export const getMessagesChat = (phone: string) =>
  call("getMessagesChat", { phone });

export const getAllNewMessages = () => call("getAllNewMessages");

export const getUnreadMessages = () => call("getUnreadMessages");

/** Placeholder unificado (spec original) */
export const enviarMensagem = (telefone: string, texto: string) =>
  sendText({ number: "55" + telefone.replace(/\D/g, ""), text: texto });
