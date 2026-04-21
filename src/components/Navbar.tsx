import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAdmin } from "@/hooks/useAdmin";

import { Image } from "@radix-ui/react-avatar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Sun, Moon, MessageCircle, LogOut, Shield } from "lucide-react";
import { useState } from "react";
import ConversationsList from "./ConversationsList";
import ProfileMenu from "./ProfileMenu";
import UserRankingModal from "./UserRankingModal";

import logo from "@/assets/logo.png";

const Navbar = () => {
  const { user, signOut, subscription } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useUnreadMessages();
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const [rankingOpen, setRankingOpen] = useState(false);

  const links = [
    { to: "/catalog", label: "Catálogo" },
    { to: "/pricing", label: "Planos" },
    // { to: "/ranking", label: "Ranking" },
    ...(user ? [{ to: "/dashboard", label: "Dashboard" }] : []),
    ...(subscription.plan_tier === "enterprise" ? [{ to: "/minha-empresa", label: "Minha Empresa" }] : []),
  ];


  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">

        <Link to="/">
          <img src="/logo.png" alt="AQui-Tem Logo" className="h-8 w-auto" />
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-4 md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setRankingOpen(true);
              setOpen(false);
            }}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ranking
          </button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user && (
            <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => setMessagesOpen(true)}>
              <MessageCircle className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          )}
          {user ? (
            <ProfileMenu />
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>

        {/* Mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon"><Menu /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <div className="mt-8 flex flex-col gap-4">
              {links.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-lg font-medium text-foreground">
                  {l.label}
                </Link>
              ))}
              {user && (
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-lg font-medium text-foreground"
                >
                  Meu Perfil
                </Link>
              )}

              <button
                onClick={() => {
                  setRankingOpen(true);
                  setOpen(false);
                }}
                className="flex items-center gap-2 text-lg font-medium text-foreground text-left"
              >
                Ranking
              </button>

              {user && isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-lg font-medium text-foreground"
                >
                  Administração
                </Link>
              )}

              <Button variant="outline" size="sm" onClick={toggleTheme} className="justify-start">
                {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {theme === "dark" ? "Modo claro" : "Modo escuro"}
              </Button>
              {user && (
                <Button variant="outline" size="sm" className="justify-start relative" onClick={() => { setMessagesOpen(true); setOpen(false); }}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Mensagens
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              )}
              {user ? (
                <Button variant="outline" onClick={() => { signOut(); setOpen(false); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </Button>
              ) : (
                <Button asChild onClick={() => setOpen(false)}>
                  <Link to="/auth">Entrar</Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
        {user && <ConversationsList open={messagesOpen} onOpenChange={setMessagesOpen} />}
        {user && rankingOpen && (
          <UserRankingModal
            onClose={() => setRankingOpen(false)}
          />
        )}
      </div>
    </nav>
  );
};

export default Navbar;
