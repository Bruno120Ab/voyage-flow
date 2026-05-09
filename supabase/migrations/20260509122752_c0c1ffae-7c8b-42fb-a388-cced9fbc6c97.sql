ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.embarques_dia REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.embarques_dia;