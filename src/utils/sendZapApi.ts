import axios, { AxiosResponse } from 'axios';

export interface WhatsAppMessage {
  number: string;
  text: any;
}

const headers = {
  'Content-Type': 'application/json',
  'SecretKey': '9ef1ce45-8fc8-410d-b600-fff2aea3cca7L',
  'PublicToken': '01957166-18ca-486b-aacc-df1d95690f50',
  'DeviceToken': '975e48aa-74db-464d-97a3-0ef7a523764d',
  'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZ2F0ZXdheS5hcGlicmFzaWwuaW8vYXBpL3YyL2F1dGgvcmVnaXN0ZXIiLCJpYXQiOjE3NjE0OTQ2MzksImV4cCI6MTc5MzAzMDYzOSwibmJmIjoxNzYxNDk0NjM5LCJqdGkiOiJuWWJtTVhHSGNVQzFqZkFNIiwic3ViIjoiMTc5MzQiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.47hESUk1HdzjHaoFn8mO3AhsYKiQywM6RimO0ArAuqA'
};

export const sendText = async (message: WhatsAppMessage): Promise<any> => {
  const url = 'https://gateway.apibrasil.io/api/v2/whatsapp/sendText';
  try {
    const response: AxiosResponse = await axios.post(url, message, { headers });
    return response.data;
  } catch (error: any) {
    console.error("sendText Error:", error.response?.data || error.message);
    throw error;
  }
};

export const getMessagesChat = async (phone: string): Promise<any> => {
  const url = "https://gateway.apibrasil.io/api/v2/whatsapp/getMessagesChat";
  try {
    const response: AxiosResponse = await axios.post(url, { phone }, { headers });
    return response.data;
  } catch (error: any) {
    console.error("getMessagesChat Error:", error.response?.data || error.message);
    throw error;
  }
};

export const getAllNewMessages = async (): Promise<any> => {
  const url = "https://gateway.apibrasil.io/api/v2/whatsapp/getAllNewMessages";
  try {
    const response: AxiosResponse = await axios.get(url, { headers });
    return response.data;
  } catch (error: any) {
    console.error("getAllNewMessages Error:", error.response?.data || error.message);
    throw error;
  }
};

export const getUnreadMessages = async (): Promise<any> => {
  const url =
    "https://gateway.apibrasil.io/api/v2/whatsapp/getUnreadMessages";

  try {
    const response: AxiosResponse = await axios.get(url, {
      headers,
    });

    console.log(
      "Mensagens não lidas:",
      response.data
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "Erro ao buscar mensagens não lidas:",
      error.response?.data || error.message
    );

    throw error;
  }
};