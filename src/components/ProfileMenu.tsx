import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, LayoutDashboard } from "lucide-react";

const ProfileMenu = () => {
    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState<{ name: string; avatar_url: string | null } | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("name, avatar_url")
                .eq("user_id", user.id)
                .single();
            if (data) setProfile(data as any);
        };
        fetchProfile();

        const channel = supabase
            .channel("profile-changes")
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, (payload) => {
                const d = payload.new as any;
                setProfile({ name: d.name, avatar_url: d.avatar_url });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    if (!user) return null;

    const initials = profile?.name
        ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-border hover:ring-primary transition-colors">
                    {profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt={profile?.name || "Perfil"} />
                    ) : null}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                    <p className="text-sm font-medium text-foreground truncate">{profile?.name || "Usuário"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" /> Meu Perfil
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sair
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ProfileMenu;
