
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor', 'financeiro', 'operacional', 'motorista');
CREATE TYPE public.profile_status AS ENUM ('pending', 'ativo', 'inativo');
CREATE TYPE public.veiculo_status AS ENUM ('operando', 'agendado', 'finalizado', 'manutencao');
CREATE TYPE public.embarque_status AS ENUM ('rascunho', 'confirmado', 'pendente', 'em_rota', 'finalizado', 'cancelado');
CREATE TYPE public.pagamento_status AS ENUM ('pendente', 'parcial', 'pago');
CREATE TYPE public.passageiro_tag AS ENUM ('novo', 'recorrente', 'vip', 'retorno', 'inativo', 'quente');
CREATE TYPE public.lead_etapa AS ENUM ('novo', 'contato', 'negociacao', 'aguardando', 'fechado', 'pos_venda', 'perdido');

-- =========================================================
-- HELPERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT,
  email TEXT,
  status public.profile_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_active(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'ativo')
$$;

-- =========================================================
-- TRIGGER: criar profile + role pendente ao registrar
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;

  INSERT INTO public.profiles (id, nome, email, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN is_first_user THEN 'ativo'::public.profile_status ELSE 'pending'::public.profile_status END
  );

  -- Primeiro usuário vira admin automaticamente; demais entram como vendedor pendente
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor');
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- POLICIES: profiles
-- =========================================================
CREATE POLICY "Usuário vê o próprio perfil" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin vê todos os perfis" ON public.profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuário atualiza próprio perfil" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin atualiza qualquer perfil" ON public.profiles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- POLICIES: user_roles
-- =========================================================
CREATE POLICY "Usuário vê seus papéis" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin vê todos os papéis" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia papéis" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- VEÍCULOS
-- =========================================================
CREATE TABLE public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL,
  capacidade INTEGER NOT NULL DEFAULT 0,
  motorista_nome TEXT,
  motorista_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.veiculo_status NOT NULL DEFAULT 'agendado',
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_veiculos_updated BEFORE UPDATE ON public.veiculos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Ativos veem veículos" ON public.veiculos
FOR SELECT TO authenticated USING (public.is_active(auth.uid()));
CREATE POLICY "Admin/operacional inserem veículos" ON public.veiculos
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operacional'));
CREATE POLICY "Admin/operacional atualizam veículos" ON public.veiculos
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operacional'));
CREATE POLICY "Admin apaga veículos" ON public.veiculos
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- EMBARQUES
-- =========================================================
CREATE TABLE public.embarques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  origem TEXT NOT NULL,
  destino TEXT NOT NULL,
  local_embarque TEXT,
  data_saida TIMESTAMPTZ NOT NULL,
  data_retorno TIMESTAMPTZ,
  valor_operacao NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_operacao NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.embarque_status NOT NULL DEFAULT 'rascunho',
  pagamento_status public.pagamento_status NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.embarques ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_embarques_updated BEFORE UPDATE ON public.embarques
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_embarques_data_saida ON public.embarques(data_saida);

CREATE POLICY "Ativos veem embarques" ON public.embarques
FOR SELECT TO authenticated USING (public.is_active(auth.uid()));
CREATE POLICY "Equipe insere embarques" ON public.embarques
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'operacional') OR
  public.has_role(auth.uid(), 'vendedor')
);
CREATE POLICY "Equipe atualiza embarques" ON public.embarques
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'operacional') OR
  public.has_role(auth.uid(), 'vendedor')
);
CREATE POLICY "Admin/financeiro apagam embarques" ON public.embarques
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- =========================================================
-- PASSAGEIROS
-- =========================================================
CREATE TABLE public.passageiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  cidade TEXT,
  data_nascimento DATE,
  destino_preferido TEXT,
  observacoes TEXT,
  tag public.passageiro_tag NOT NULL DEFAULT 'novo',
  total_viagens INTEGER NOT NULL DEFAULT 0,
  ticket_medio NUMERIC(12,2) NOT NULL DEFAULT 0,
  ultima_viagem DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.passageiros ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_passageiros_updated BEFORE UPDATE ON public.passageiros
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_passageiros_nome ON public.passageiros(nome);

CREATE POLICY "Ativos veem passageiros" ON public.passageiros
FOR SELECT TO authenticated USING (public.is_active(auth.uid()));
CREATE POLICY "Equipe insere passageiros" ON public.passageiros
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'vendedor') OR
  public.has_role(auth.uid(), 'operacional')
);
CREATE POLICY "Equipe atualiza passageiros" ON public.passageiros
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'vendedor') OR
  public.has_role(auth.uid(), 'operacional')
);
CREATE POLICY "Admin apaga passageiros" ON public.passageiros
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- EMBARQUE x PASSAGEIROS
-- =========================================================
CREATE TABLE public.embarque_passageiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id UUID NOT NULL REFERENCES public.embarques(id) ON DELETE CASCADE,
  passageiro_id UUID NOT NULL REFERENCES public.passageiros(id) ON DELETE CASCADE,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  pagamento_status public.pagamento_status NOT NULL DEFAULT 'pendente',
  check_in BOOLEAN NOT NULL DEFAULT false,
  poltrona TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (embarque_id, passageiro_id)
);
ALTER TABLE public.embarque_passageiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos veem vínculos" ON public.embarque_passageiros
FOR SELECT TO authenticated USING (public.is_active(auth.uid()));
CREATE POLICY "Equipe gerencia vínculos" ON public.embarque_passageiros
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'vendedor') OR
  public.has_role(auth.uid(), 'operacional')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'vendedor') OR
  public.has_role(auth.uid(), 'operacional')
);

-- =========================================================
-- LEADS / CRM
-- =========================================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  cidade TEXT,
  destino TEXT,
  valor_estimado NUMERIC(12,2) NOT NULL DEFAULT 0,
  etapa public.lead_etapa NOT NULL DEFAULT 'novo',
  origem TEXT,
  observacoes TEXT,
  follow_up_em TIMESTAMPTZ,
  passageiro_id UUID REFERENCES public.passageiros(id) ON DELETE SET NULL,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_leads_etapa ON public.leads(etapa);

CREATE POLICY "Ativos veem leads" ON public.leads
FOR SELECT TO authenticated USING (public.is_active(auth.uid()));
CREATE POLICY "Equipe insere leads" ON public.leads
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'vendedor')
);
CREATE POLICY "Equipe atualiza leads" ON public.leads
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'vendedor')
);
CREATE POLICY "Admin apaga leads" ON public.leads
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
