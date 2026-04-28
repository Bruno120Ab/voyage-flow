
CREATE TYPE public.tarefa_prioridade AS ENUM ('baixa', 'normal', 'alta', 'urgente');
CREATE TYPE public.tarefa_status AS ENUM ('pendente', 'em_andamento', 'concluida', 'cancelada');

CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TEXT,
  prioridade public.tarefa_prioridade NOT NULL DEFAULT 'normal',
  status public.tarefa_status NOT NULL DEFAULT 'pendente',
  concluida_em TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos veem tarefas" ON public.tarefas FOR SELECT TO authenticated
  USING (is_active(auth.uid()));

CREATE POLICY "Equipe insere tarefas" ON public.tarefas FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operacional') OR has_role(auth.uid(),'vendedor') OR has_role(auth.uid(),'financeiro'));

CREATE POLICY "Equipe atualiza tarefas" ON public.tarefas FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operacional') OR has_role(auth.uid(),'vendedor') OR has_role(auth.uid(),'financeiro'));

CREATE POLICY "Admin apaga tarefas" ON public.tarefas FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER set_tarefas_updated_at BEFORE UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.tarefas;
