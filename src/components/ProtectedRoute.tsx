import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (profile && profile.status !== "ativo") return <Navigate to="/aguardando" replace />;
  return <>{children}</>;
}
