import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "vendedor" | "financeiro" | "operacional" | "motorista";
type ProfileStatus = "pending" | "ativo" | "inativo";

interface Profile {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  status: ProfileStatus;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: prof }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as Profile) ?? null);
    setRoles((rs ?? []).map((r: any) => r.role as AppRole));
  };

  useEffect(() => {
    // 1. Listener primeiro
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer para evitar deadlock
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    // 2. Depois sessão atual
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  const refresh = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useHasRole(role: AppRole) {
  const { roles } = useAuth();
  return roles.includes(role);
}
