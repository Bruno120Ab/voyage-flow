-- Adiciona colunas para o novo Kanban de atendimento e funcionalidades de revenda
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS kanban_status text NOT NULL DEFAULT 'nao_atendido',
  ADD COLUMN IF NOT EXISTS ultima_mensagem text,
  ADD COLUMN IF NOT EXISTS ultima_interacao timestamptz,
  ADD COLUMN IF NOT EXISTS dias_para_retorno integer,
  ADD COLUMN IF NOT EXISTS pronto_revenda boolean NOT NULL DEFAULT false;

-- Trigger de validação para kanban_status (evita CHECK rígido com valores fixos)
CREATE OR REPLACE FUNCTION public.validate_lead_kanban_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kanban_status NOT IN ('nao_atendido','em_atendimento','venda','revenda','aguardando','finalizado') THEN
    RAISE EXCEPTION 'kanban_status inválido: %', NEW.kanban_status;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_lead_kanban_status ON public.leads;
CREATE TRIGGER trg_validate_lead_kanban_status
BEFORE INSERT OR UPDATE OF kanban_status ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.validate_lead_kanban_status();

-- Embarques vinculados a leads (cadastro rápido pelo CRM)
ALTER TABLE public.embarques_dia
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS cliente_nome text,
  ADD COLUMN IF NOT EXISTS local_embarque text,
  ADD COLUMN IF NOT EXISTS data_ida date,
  ADD COLUMN IF NOT EXISTS dias_para_retorno integer;

CREATE INDEX IF NOT EXISTS idx_embarques_dia_lead_id ON public.embarques_dia(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_kanban_status ON public.leads(kanban_status);
CREATE INDEX IF NOT EXISTS idx_leads_ultima_interacao ON public.leads(ultima_interacao);