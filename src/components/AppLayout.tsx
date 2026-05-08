import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUnreadMessages } from "@/utils/sendZapApi";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await signOut(); navigate("/auth"); };

  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r: any = await getUnreadMessages();
        const arr = Array.isArray(r) ? r
          : Array.isArray(r?.messages) ? r.messages
          : Array.isArray(r?.response) ? r.response
          : Array.isArray(r?.data) ? r.data : [];
        if (!cancelled) setUnread(arr.length);
      } catch { /* silencioso */ }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar passageiro, placa, embarque..."
                className="pl-9 h-9 bg-card border-border/60 focus-visible:ring-primary/40"
              />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 ml-auto">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
                <LogOut className="h-[18px] w-[18px]" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 animate-fade-in overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
