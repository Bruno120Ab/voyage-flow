// Mock data para a primeira versão do ViaCRM
export type FleetStatus = "operando" | "agendado" | "finalizado" | "manutencao";

export const fleet = [
  { id: "1", placa: "ABC-1D23", modelo: "Mercedes-Benz O-500 RSD", motorista: "Carlos Mendes", capacidade: 46, origem: "São Paulo", destino: "Rio de Janeiro", status: "operando" as FleetStatus, saida: "2025-04-23 06:00", retorno: "2025-04-25 22:00", valor: 18500, custo: 9200 },
  { id: "2", placa: "XYZ-4F67", modelo: "Volvo 9800", motorista: "Roberto Lima", capacidade: 50, origem: "São Paulo", destino: "Foz do Iguaçu", status: "agendado" as FleetStatus, saida: "2025-04-26 19:00", retorno: "2025-04-30 08:00", valor: 32000, custo: 16400 },
  { id: "3", placa: "JKL-9P01", modelo: "Marcopolo Paradiso", motorista: "Anderson Souza", capacidade: 44, origem: "Campinas", destino: "Porto Seguro", status: "agendado" as FleetStatus, saida: "2025-05-02 16:00", retorno: "2025-05-09 10:00", valor: 41200, custo: 22500 },
  { id: "4", placa: "MNO-3R45", modelo: "Scania K-360", motorista: "José Pereira", capacidade: 48, origem: "São Paulo", destino: "Caldas Novas", status: "finalizado" as FleetStatus, saida: "2025-04-12 18:00", retorno: "2025-04-18 21:00", valor: 28900, custo: 15100 },
  { id: "5", placa: "QWE-7T89", modelo: "Mercedes-Benz O-500", motorista: "Paulo Henrique", capacidade: 46, origem: "Santos", destino: "Gramado", status: "manutencao" as FleetStatus, saida: "—", retorno: "—", valor: 0, custo: 3200 },
  { id: "6", placa: "RST-2U34", modelo: "Volvo 9700", motorista: "Marcos Silva", capacidade: 50, origem: "São Paulo", destino: "Maragogi", status: "operando" as FleetStatus, saida: "2025-04-22 14:00", retorno: "2025-04-29 09:00", valor: 47800, custo: 24300 },
];

export const embarques = [
  { id: "e1", data: "2025-04-26", hora: "19:00", local: "Terminal Tietê - Plataforma 12", destino: "Foz do Iguaçu", passageiros: 42, capacidade: 50, status: "confirmado", pagamento: "pago" },
  { id: "e2", data: "2025-04-27", hora: "06:30", local: "Rodoviária Barra Funda", destino: "Rio de Janeiro", passageiros: 38, capacidade: 46, status: "confirmado", pagamento: "parcial" },
  { id: "e3", data: "2025-04-28", hora: "22:00", local: "Praça da Sé - Ponto 3", destino: "Belo Horizonte", passageiros: 22, capacidade: 44, status: "pendente", pagamento: "pendente" },
  { id: "e4", data: "2025-05-02", hora: "16:00", local: "Terminal Campinas", destino: "Porto Seguro", passageiros: 44, capacidade: 44, status: "confirmado", pagamento: "pago" },
  { id: "e5", data: "2025-05-05", hora: "20:00", local: "Terminal Tietê - Plataforma 8", destino: "Florianópolis", passageiros: 31, capacidade: 46, status: "confirmado", pagamento: "parcial" },
];

export const passageiros = [
  { id: "p1", nome: "Maria Aparecida Silva", telefone: "(11) 98765-4321", cidade: "São Paulo", viagens: 12, ticket: 850, ultimaViagem: "2025-03-15", tag: "VIP" as const },
  { id: "p2", nome: "João Batista Souza", telefone: "(11) 99123-4567", cidade: "Guarulhos", viagens: 8, ticket: 620, ultimaViagem: "2025-02-08", tag: "Recorrente" as const },
  { id: "p3", nome: "Ana Lúcia Ferreira", telefone: "(13) 98888-1122", cidade: "Santos", viagens: 3, ticket: 1100, ultimaViagem: "2024-11-20", tag: "Retorno" as const },
  { id: "p4", nome: "Carlos Eduardo Lima", telefone: "(11) 97777-3344", cidade: "São Bernardo", viagens: 15, ticket: 920, ultimaViagem: "2025-04-10", tag: "VIP" as const },
  { id: "p5", nome: "Fernanda Oliveira", telefone: "(11) 96666-5566", cidade: "Osasco", viagens: 2, ticket: 540, ultimaViagem: "2024-08-12", tag: "Inativo" as const },
  { id: "p6", nome: "Ricardo Almeida", telefone: "(19) 95555-7788", cidade: "Campinas", viagens: 6, ticket: 780, ultimaViagem: "2025-01-22", tag: "Quente" as const },
  { id: "p7", nome: "Juliana Castro", telefone: "(11) 94444-9900", cidade: "São Paulo", viagens: 9, ticket: 1050, ultimaViagem: "2025-03-30", tag: "VIP" as const },
];

export const leads = {
  novo: [
    { id: "l1", nome: "Patrícia Gomes", destino: "Porto de Galinhas", valor: 2400, tel: "(11) 98765-1100" },
    { id: "l2", nome: "Empresa Solare RH", destino: "Aparecida", valor: 8800, tel: "(11) 91234-5678" },
  ],
  contato: [
    { id: "l3", nome: "Roberto Nunes", destino: "Gramado", valor: 3200, tel: "(51) 99888-7766" },
    { id: "l4", nome: "Grupo Igreja Esperança", destino: "Aparecida", valor: 6400, tel: "(11) 97777-2233" },
  ],
  negociacao: [
    { id: "l5", nome: "Cláudia Rezende", destino: "Foz do Iguaçu", valor: 4100, tel: "(41) 96666-1144" },
  ],
  aguardando: [
    { id: "l6", nome: "Fábio Marinho", destino: "Maragogi", valor: 5200, tel: "(11) 95555-8899" },
  ],
  fechado: [
    { id: "l7", nome: "Família Tavares (8 pax)", destino: "Caldas Novas", valor: 7600, tel: "(11) 94444-2200" },
    { id: "l8", nome: "Lúcia Pereira", destino: "Rio de Janeiro", valor: 1800, tel: "(11) 93333-4455" },
  ],
  posVenda: [
    { id: "l9", nome: "André Cardoso", destino: "Florianópolis", valor: 2900, tel: "(48) 92222-6677" },
  ],
};

export const prospeccoes = [
  { nome: "Maria Aparecida Silva", motivo: "Viaja todo mês de junho — sugerir Porto Seguro", urgencia: "alta" },
  { nome: "Carlos Eduardo Lima", motivo: "Comprou há 90 dias — perfil para revenda", urgencia: "alta" },
  { nome: "Ana Lúcia Ferreira", motivo: "Inativa há 5 meses — reativação", urgencia: "media" },
  { nome: "Ricardo Almeida", motivo: "Cliente quente — abriu última proposta", urgencia: "alta" },
  { nome: "Juliana Castro", motivo: "VIP — campanha de fidelidade", urgencia: "media" },
];
