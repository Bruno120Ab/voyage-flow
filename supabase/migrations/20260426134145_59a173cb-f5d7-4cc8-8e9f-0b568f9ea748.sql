
-- Tabela de vendas diárias (fechamento de caixa)
CREATE TABLE public.vendas_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos veem vendas" ON public.vendas_diarias
  FOR SELECT TO authenticated USING (is_active(auth.uid()));
CREATE POLICY "Equipe insere vendas" ON public.vendas_diarias
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role) OR has_role(auth.uid(),'vendedor'::app_role)
  );
CREATE POLICY "Equipe atualiza vendas" ON public.vendas_diarias
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role)
  );
CREATE POLICY "Admin/financeiro apaga vendas" ON public.vendas_diarias
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role)
  );

CREATE TRIGGER tr_vendas_diarias_updated
  BEFORE UPDATE ON public.vendas_diarias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_vendas_diarias_data ON public.vendas_diarias(data DESC);

-- Configurações simples (chave/valor) para meta_mes etc
CREATE TABLE public.app_config (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos veem config" ON public.app_config
  FOR SELECT TO authenticated USING (is_active(auth.uid()));
CREATE POLICY "Admin/financeiro escreve config" ON public.app_config
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role)
  );
CREATE POLICY "Admin/financeiro atualiza config" ON public.app_config
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role)
  );

CREATE TRIGGER tr_app_config_updated
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cidades atendidas (rota / NH Intelligence)
CREATE TABLE public.cidades_rota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  antes text,
  depois text,
  proprietario text,
  contato text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cidades_rota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos veem cidades" ON public.cidades_rota
  FOR SELECT TO authenticated USING (is_active(auth.uid()));
CREATE POLICY "Equipe insere cidades" ON public.cidades_rota
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operacional'::app_role) OR has_role(auth.uid(),'vendedor'::app_role)
  );
CREATE POLICY "Equipe atualiza cidades" ON public.cidades_rota
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operacional'::app_role) OR has_role(auth.uid(),'vendedor'::app_role)
  );
CREATE POLICY "Admin apaga cidades" ON public.cidades_rota
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER tr_cidades_rota_updated
  BEFORE UPDATE ON public.cidades_rota
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
