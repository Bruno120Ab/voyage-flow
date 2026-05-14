import axios, { AxiosResponse } from 'axios';

export interface WhatsAppMessage {
  number: string;
  text: string;
}

const headers = {
  'Content-Type': 'application/json',
  'SecretKey': '9ef1ce45-8fc8-410d-b600-fff2aea3cca7L',
  'PublicToken': '01957166-18ca-486b-aacc-df1d95690f50',
  'DeviceToken': '975e48aa-74db-464d-97a3-0ef7a523764d',
  'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZ2F0ZXdheS5hcGlicmFzaWwuaW8vYXBpL3YyL2F1dGgvcmVnaXN0ZXIiLCJpYXQiOjE3NjE0OTQ2MzksImV4cCI6MTc5MzAzMDYzOSwibmJmIjoxNzYxNDk0NjM5LCJqdGkiOiJuWWJtTVhHSGNVQzFqZkFNIiwic3ViIjoiMTc5MzQiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.47hESUk1HdzjHaoFn8mO3AhsYKiQywM6RimO0ArAuqA'
};

export const sendText = async (message: WhatsAppMessage): Promise<any> => {
  const url = '/api-brasil/api/v2/whatsapp/sendText';
  try {
    // API Brasil V2 utiliza textMessage.text e options por padrão, ou pode aceitar text direto.
    // Vamos enviar o payload formatado corretamente para a V2:
    const payload = {
      number: message.number,
      text: message.text,
      textMessage: {
        text: message.text
      },
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: false
      }
    };
    const response: AxiosResponse = await axios.post(url, payload, { headers });
    return response.data;
  } catch (error: any) {
    console.error("sendText Error:", error.response?.data || error.message);
    throw error;
  }
};

export const getMessagesChat = async (phone: string, count?: number | string): Promise<any> => {
  const url = "/api-brasil/api/v2/whatsapp/getMessagesChat";
  try {
    const payload = {
      number: phone,
      direction: "before",
      count: 5,
      homolog: false
    };
    const response: AxiosResponse = await axios.post(url, payload, { headers });
    return response.data;
  } catch (error: any) {
    console.error("getMessagesChat Error:", error.response?.data || error.message);
    throw error;
  }
};

export const getAllNewMessages = async (): Promise<any> => {
  const url = "/api-brasil/api/v2/whatsapp/getAllChats";
  try {
    const response: AxiosResponse = await axios.post(url, {}, { headers });
    const data = response.data;
    
    if (data && data.response && Array.isArray(data.response.contacts)) {
      // Filter chats with unread messages
      const unreadChats = data.response.contacts.filter((c: any) => c.unreadCount > 0);
      
      // Map to the expected format for CRM
      const mapped = unreadChats.map((c: any) => {
        let phone = c.id?._serialized || c.id?.user || c.id;
        if (typeof phone === 'object' && phone._serialized) phone = phone._serialized;
        else if (typeof phone === 'object' && phone.user) phone = phone.user;
        
        return {
          ...c,
          phone: phone,
          pushname: c.contact?.name || c.contact?.pushname || c.name || phone || "Desconhecido",
          body: `Você tem ${c.unreadCount} nova(s) mensagem(ns).`,
          t: c.t,
          unreadCount: c.unreadCount
        };
      });
      return mapped;
    }
    return response.data;
  } catch (error: any) {
    console.error("getAllNewMessages (via getAllChats) Error:", error.response?.data || error.message);
    throw error;
  }
};


export const getUnreadMessages = async () => {
  const url =
    "/api-brasil/api/v2/whatsapp/getUnreadMessages";

//   const headers = {
//     "Content-Type": "application/json",
//     SecretKey: "SEU_SECRET",
//     PublicToken: "SEU_PUBLIC",
//     DeviceToken: "SEU_DEVICE",
//     Authorization: "Bearer SEU_TOKEN",
//   };

  try {
    const response = await axios.post(
      url,
      {},
      { headers }
    );

    console.log(response.data);

    return response.data;
  } catch (error: any) {
    console.error(
      "ERRO API BRASIL:",
      error.response?.data || error.message
    );

    throw error;
  }
};
export const getAllContacts = async () => {
  const url =
    "/api-brasil/api/v2/whatsapp/getAllContacts";

  // const headers = {
  //   "Content-Type": "application/json",
  //   SecretKey: "SEU_SECRET",
  //   PublicToken: "SEU_PUBLIC",
  //   DeviceToken: "SEU_DEVICE",
  //   Authorization: "Bearer SEU_TOKEN",
  // };

  try {
    const response = await axios.post(
      url,
      {},
      { headers }
    );

    console.log("CONTATOS:", response.data);

    return response.data;
  } catch (error: any) {
    console.error(
      "ERRO API BRASIL:",
      error.response?.data || error.message
    );

    throw error;
  }
};

export const getAllLabels = async () => {
  const url =
    "/api-brasil/api/v2/whatsapp/getAllLabels";

  // const headers = {
  //   "Content-Type": "application/json",
  //   SecretKey: "SEU_SECRET",
  //   PublicToken: "SEU_PUBLIC",
  //   DeviceToken: "SEU_DEVICE",
  //   Authorization: "Bearer SEU_TOKEN",
  // };

  try {
    const response = await axios.post(
      url,
      {},
      { headers }
    );

    console.log("ETIQUETAS:", response.data);

    return response.data;
  } catch (error: any) {
    console.error(
      "ERRO AO BUSCAR ETIQUETAS:",
      error.response?.data || error.message
    );

    throw error;
  }
};

export const getChat = async (number: string) => {
  const url =
    "/api-brasil/api/v2/whatsapp/getChat";

  // const headers = {
  //   "Content-Type": "application/json",
  //   SecretKey: "SEU_SECRET",
  //   PublicToken: "SEU_PUBLIC",
  //   DeviceToken: "SEU_DEVICE",
  //   Authorization: "Bearer SEU_TOKEN",
  // };

  const body = {
    number, // Ex: "5543999999999"
  };

  try {
    const response = await axios.post(
      url,
      body,
      { headers }
    );

    console.log("CHAT:", response.data);

    return response.data;
  } catch (error: any) {
    console.error(
      "ERRO AO BUSCAR CHAT:",
      error.response?.data || error.message
    );

    throw error;
  }
};