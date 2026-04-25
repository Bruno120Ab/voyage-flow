export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      embarque_passageiros: {
        Row: {
          bilhete_impresso: boolean
          check_in: boolean
          comprovante_enviado: boolean
          created_at: string
          embarque_id: string
          id: string
          observacoes: string | null
          pagamento_status: Database["public"]["Enums"]["pagamento_status"]
          passageiro_id: string
          poltrona: string | null
          valor_pago: number
          vendido: boolean
        }
        Insert: {
          bilhete_impresso?: boolean
          check_in?: boolean
          comprovante_enviado?: boolean
          created_at?: string
          embarque_id: string
          id?: string
          observacoes?: string | null
          pagamento_status?: Database["public"]["Enums"]["pagamento_status"]
          passageiro_id: string
          poltrona?: string | null
          valor_pago?: number
          vendido?: boolean
        }
        Update: {
          bilhete_impresso?: boolean
          check_in?: boolean
          comprovante_enviado?: boolean
          created_at?: string
          embarque_id?: string
          id?: string
          observacoes?: string | null
          pagamento_status?: Database["public"]["Enums"]["pagamento_status"]
          passageiro_id?: string
          poltrona?: string | null
          valor_pago?: number
          vendido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "embarque_passageiros_embarque_id_fkey"
            columns: ["embarque_id"]
            isOneToOne: false
            referencedRelation: "embarques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embarque_passageiros_passageiro_id_fkey"
            columns: ["passageiro_id"]
            isOneToOne: false
            referencedRelation: "passageiros"
            referencedColumns: ["id"]
          },
        ]
      }
      embarques: {
        Row: {
          created_at: string
          created_by: string | null
          custo_operacao: number
          data_retorno: string | null
          data_saida: string
          destino: string
          id: string
          local_embarque: string | null
          observacoes: string | null
          origem: string
          pagamento_status: Database["public"]["Enums"]["pagamento_status"]
          status: Database["public"]["Enums"]["embarque_status"]
          updated_at: string
          valor_operacao: number
          veiculo_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_operacao?: number
          data_retorno?: string | null
          data_saida: string
          destino: string
          id?: string
          local_embarque?: string | null
          observacoes?: string | null
          origem: string
          pagamento_status?: Database["public"]["Enums"]["pagamento_status"]
          status?: Database["public"]["Enums"]["embarque_status"]
          updated_at?: string
          valor_operacao?: number
          veiculo_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_operacao?: number
          data_retorno?: string | null
          data_saida?: string
          destino?: string
          id?: string
          local_embarque?: string | null
          observacoes?: string | null
          origem?: string
          pagamento_status?: Database["public"]["Enums"]["pagamento_status"]
          status?: Database["public"]["Enums"]["embarque_status"]
          updated_at?: string
          valor_operacao?: number
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embarques_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      embarques_dia: {
        Row: {
          carro: string
          cidade_destino: string | null
          cidade_origem: string | null
          created_at: string
          created_by: string | null
          data_operacao: string
          encomenda: string | null
          hora_real: string | null
          hora_saida_prevista: string | null
          hora_saida_real: string | null
          id: string
          motorista: string | null
          observacao: string | null
          passou: boolean
          previsao_chegada: string | null
          prioridade: Database["public"]["Enums"]["embarque_dia_prioridade"]
          rota: string
          servico: string
          status: Database["public"]["Enums"]["embarque_dia_status"]
          updated_at: string
        }
        Insert: {
          carro?: string
          cidade_destino?: string | null
          cidade_origem?: string | null
          created_at?: string
          created_by?: string | null
          data_operacao?: string
          encomenda?: string | null
          hora_real?: string | null
          hora_saida_prevista?: string | null
          hora_saida_real?: string | null
          id?: string
          motorista?: string | null
          observacao?: string | null
          passou?: boolean
          previsao_chegada?: string | null
          prioridade?: Database["public"]["Enums"]["embarque_dia_prioridade"]
          rota: string
          servico: string
          status?: Database["public"]["Enums"]["embarque_dia_status"]
          updated_at?: string
        }
        Update: {
          carro?: string
          cidade_destino?: string | null
          cidade_origem?: string | null
          created_at?: string
          created_by?: string | null
          data_operacao?: string
          encomenda?: string | null
          hora_real?: string | null
          hora_saida_prevista?: string | null
          hora_saida_real?: string | null
          id?: string
          motorista?: string | null
          observacao?: string | null
          passou?: boolean
          previsao_chegada?: string | null
          prioridade?: Database["public"]["Enums"]["embarque_dia_prioridade"]
          rota?: string
          servico?: string
          status?: Database["public"]["Enums"]["embarque_dia_status"]
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          cidade: string | null
          created_at: string
          created_by: string | null
          destino: string | null
          email: string | null
          etapa: Database["public"]["Enums"]["lead_etapa"]
          follow_up_em: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          passageiro_id: string | null
          responsavel_id: string | null
          telefone: string | null
          updated_at: string
          valor_estimado: number
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          destino?: string | null
          email?: string | null
          etapa?: Database["public"]["Enums"]["lead_etapa"]
          follow_up_em?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          passageiro_id?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string
          valor_estimado?: number
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          destino?: string | null
          email?: string | null
          etapa?: Database["public"]["Enums"]["lead_etapa"]
          follow_up_em?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          passageiro_id?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string
          valor_estimado?: number
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_passageiro_id_fkey"
            columns: ["passageiro_id"]
            isOneToOne: false
            referencedRelation: "passageiros"
            referencedColumns: ["id"]
          },
        ]
      }
      passageiros: {
        Row: {
          cidade: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          destino_preferido: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          tag: Database["public"]["Enums"]["passageiro_tag"]
          telefone: string | null
          ticket_medio: number
          total_viagens: number
          ultima_viagem: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          destino_preferido?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          tag?: Database["public"]["Enums"]["passageiro_tag"]
          telefone?: string | null
          ticket_medio?: number
          total_viagens?: number
          ultima_viagem?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          destino_preferido?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          tag?: Database["public"]["Enums"]["passageiro_tag"]
          telefone?: string | null
          ticket_medio?: number
          total_viagens?: number
          ultima_viagem?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["profile_status"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          status?: Database["public"]["Enums"]["profile_status"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["profile_status"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          capacidade: number
          created_at: string
          created_by: string | null
          id: string
          modelo: string
          motorista_nome: string | null
          motorista_user_id: string | null
          observacoes: string | null
          placa: string
          status: Database["public"]["Enums"]["veiculo_status"]
          updated_at: string
        }
        Insert: {
          capacidade?: number
          created_at?: string
          created_by?: string | null
          id?: string
          modelo: string
          motorista_nome?: string | null
          motorista_user_id?: string | null
          observacoes?: string | null
          placa: string
          status?: Database["public"]["Enums"]["veiculo_status"]
          updated_at?: string
        }
        Update: {
          capacidade?: number
          created_at?: string
          created_by?: string | null
          id?: string
          modelo?: string
          motorista_nome?: string | null
          motorista_user_id?: string | null
          observacoes?: string | null
          placa?: string
          status?: Database["public"]["Enums"]["veiculo_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "vendedor"
        | "financeiro"
        | "operacional"
        | "motorista"
      embarque_dia_prioridade: "Normal" | "Alta" | "Baixa"
      embarque_dia_status: "pendente" | "concluido"
      embarque_status:
        | "rascunho"
        | "confirmado"
        | "pendente"
        | "em_rota"
        | "finalizado"
        | "cancelado"
      lead_etapa:
        | "novo"
        | "contato"
        | "negociacao"
        | "aguardando"
        | "fechado"
        | "pos_venda"
        | "perdido"
      pagamento_status: "pendente" | "parcial" | "pago"
      passageiro_tag:
        | "novo"
        | "recorrente"
        | "vip"
        | "retorno"
        | "inativo"
        | "quente"
      profile_status: "pending" | "ativo" | "inativo"
      veiculo_status: "operando" | "agendado" | "finalizado" | "manutencao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vendedor", "financeiro", "operacional", "motorista"],
      embarque_dia_prioridade: ["Normal", "Alta", "Baixa"],
      embarque_dia_status: ["pendente", "concluido"],
      embarque_status: [
        "rascunho",
        "confirmado",
        "pendente",
        "em_rota",
        "finalizado",
        "cancelado",
      ],
      lead_etapa: [
        "novo",
        "contato",
        "negociacao",
        "aguardando",
        "fechado",
        "pos_venda",
        "perdido",
      ],
      pagamento_status: ["pendente", "parcial", "pago"],
      passageiro_tag: [
        "novo",
        "recorrente",
        "vip",
        "retorno",
        "inativo",
        "quente",
      ],
      profile_status: ["pending", "ativo", "inativo"],
      veiculo_status: ["operando", "agendado", "finalizado", "manutencao"],
    },
  },
} as const
