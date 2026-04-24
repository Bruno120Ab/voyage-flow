import { LayoutDashboard, Bus, CalendarDays, Users, KanbanSquare, Sparkles, Wallet, BarChart3, MessageCircle, Settings, Plane, ShieldCheck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Frota", url: "/frota", icon: Bus },
  { title: "Embarques", url: "/embarques", icon: CalendarDays },
    { title: "Carros", url: "/PaginaEmbarques", icon: CalendarDays },

  { title: "Passageiros", url: "/passageiros", icon: Users },
  { title: "CRM / Funil", url: "/crm", icon: KanbanSquare },
  { title: "Prospecção", url: "/prospeccao", icon: Sparkles },
];

const tools = [
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const initials = (profile?.nome || profile?.email || "U")
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const renderItem = (item: { title: string; url: string; icon: any }) => {
    const active = pathname === item.url;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild className="h-10">
          <NavLink
            to={item.url}
            end
            className={`group relative flex items-center gap-3 rounded-md px-3 transition-all ${
              active
                ? "bg-sidebar-accent text-primary font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-gold" />}
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="text-sm">{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow">
            <Plane className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-base text-foreground">ViaCRM</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Travel Suite</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 scrollbar-thin">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 px-3">Operação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{main.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 px-3">Gestão</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{tools.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-4">
            {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 px-3">Admin</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {renderItem({ title: "Equipe", url: "/equipe", icon: ShieldCheck })}
                {renderItem({ title: "Configurações", url: "/configuracoes", icon: Settings })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className={`flex items-center gap-3 rounded-lg p-2 ${collapsed ? "justify-center" : "bg-sidebar-accent/40"}`}>
          <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">{initials}</div>
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-xs font-medium truncate">{profile?.nome || "Usuário"}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{roles[0] || "—"}</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
