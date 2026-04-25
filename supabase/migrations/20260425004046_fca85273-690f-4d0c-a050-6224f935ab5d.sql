-- Tabela para embarques operacionais do dia (página "Carros")
CREATE TYPE public.embarque_dia_status AS ENUM ('pendente', 'concluido');
CREATE TYPE public.embarque_dia_prioridade AS ENUM ('Normal', 'Alta', 'Baixa');

CREATE TABLE public.embarques_dia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servico TEXT NOT NULL,
  rota TEXT NOT NULL,
  cidade_origem TEXT,
  cidade_destino TEXT,
  hora_saida_prevista TEXT,
  hora_saida_real TEXT,
  previsao_chegada TEXT,
  hora_real TEXT,
  carro TEXT NOT NULL DEFAULT '--',
  motorista TEXT DEFAULT '',
  encomenda TEXT DEFAULT '',
  observacao TEXT DEFAULT '',
  prioridade public.embarque_dia_prioridade NOT NULL DEFAULT 'Normal',
  status public.embarque_dia_status NOT NULL DEFAULT 'pendente',
  passou BOOLEAN NOT NULL DEFAULT false,
  data_operacao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.embarques_dia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos veem embarques_dia" ON public.embarques_dia
  FOR SELECT TO authenticated USING (public.is_active(auth.uid()));

CREATE POLICY "Equipe insere embarques_dia" ON public.embarques_dia
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'operacional'::app_role) OR
    public.has_role(auth.uid(), 'vendedor'::app_role)
  );

CREATE POLICY "Equipe atualiza embarques_dia" ON public.embarques_dia
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'operacional'::app_role) OR
    public.has_role(auth.uid(), 'vendedor'::app_role)
  );

CREATE POLICY "Equipe apaga embarques_dia" ON public.embarques_dia
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'operacional'::app_role)
  );

CREATE TRIGGER trg_embarques_dia_updated
BEFORE UPDATE ON public.embarques_dia
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_embarques_dia_data ON public.embarques_dia(data_operacao);