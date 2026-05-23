import { toast } from "sonner";
import { sendText } from "./sendZapApi";

interface EmbarqueItem {
  id?: string;
  servico?: string;
  rota?: string;
  cidade_origem?: string;
  cidade_destino?: string;
  hora_saida_prevista?: string;
  hora_saida_real?: string;
  previsao_chegada?: string;
  carro?: string;
  motorista?: string;
  encomenda?: string;
  observacao?: string;
  passou?: boolean;
  sentido?: string;
}

export const solicitarLocalizacao = async (
  item: any
): Promise<void> => {
  try {
    const numeroCCO = "557798681420";

    const numeroCarro = window.prompt(
      "Informe o número do carro:",
      item?.carro || ""
    );

    if (!numeroCarro) return;

    const mensagem = `

Olá, tudo bom?

Aqui é da Agência Novo Horizonte de Itambé.
Agentes: Bruno e Yasmin.

Solicitamos a localização atual do veículo abaixo:

🚌 Carro: ${numeroCarro}
📍 Linha: ${item?.rota || "Não informada"}
📍 Serviço: ${item?.servico || "Não informada"}
🕒 Saída prevista daqui: ${
      item?.hora_saida_prevista || "--"
    }
🚏 Origem: ${
      item?.cidade_origem || "--"
    }
🎯 Destino: ${
      item?.cidade_destino || "--"
    }
👨‍✈️ Motorista: ${
      item?.motorista ||
      "Não informado"
    }



Grato 🙏`;

    await sendText({
      number: numeroCCO,
      text: mensagem,
    });

    toast.success(
      `Solicitação enviada — carro ${numeroCarro}`
    );
  } catch (err) {
    console.error(err);

    toast.error(
      "Erro ao solicitar localização"
    );
  }
};