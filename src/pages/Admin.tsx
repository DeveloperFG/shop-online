import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Ban, Upload, Trash2, Loader2 } from "lucide-react";

interface Profile {
    user_id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    created_at: string;
}

interface BannedUser {
    id: string;
    user_id: string;
    reason: string | null;
    created_at: string;
}

interface Banner {
    id: string;
    image_url: string;
    title: string | null;
    active: boolean;
    display_order: number;
}

const Admin = () => {
    const { user, loading: authLoading } = useAuth();
    const { isAdmin, loading: adminLoading } = useAdmin();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [banningId, setBanningId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!authLoading && !adminLoading) {
            if (!user || !isAdmin) {
                navigate("/");
            }
        }
    }, [user, isAdmin, authLoading, adminLoading, navigate]);

    useEffect(() => {
        if (isAdmin) {
            fetchData();
        }
    }, [isAdmin]);

    const fetchData = async () => {
        setLoadingData(true);
        const [profilesRes, bannedRes, bannersRes] = await Promise.all([
            supabase.from("profiles").select("user_id, name, email, avatar_url, created_at").order("created_at", { ascending: false }),
            supabase.from("banned_users").select("*"),
            supabase.from("banners").select("*").order("display_order"),
        ]);
        if (profilesRes.data) setProfiles(profilesRes.data);
        if (bannedRes.data) setBannedUsers(bannedRes.data);
        if (bannersRes.data) setBanners(bannersRes.data);
        setLoadingData(false);
    };

    const isBanned = (userId: string) => bannedUsers.some((b) => b.user_id === userId);

    const handleBan = async (userId: string) => {
        setBanningId(userId);
        const { error } = await supabase.from("banned_users").insert({
            user_id: userId,
            banned_by: user!.id,
            reason: "Bloqueado pelo administrador",
        });
        if (error) {
            toast({ title: "Erro ao bloquear usuário", variant: "destructive" });
        } else {
            toast({ title: "Usuário bloqueado com sucesso" });
            fetchData();
        }
        setBanningId(null);
    };

    const handleUnban = async (userId: string) => {
        setBanningId(userId);
        const ban = bannedUsers.find((b) => b.user_id === userId);
        if (ban) {
            const { error } = await supabase.from("banned_users").delete().eq("id", ban.id);
            if (error) {
                toast({ title: "Erro ao desbloquear usuário", variant: "destructive" });
            } else {
                toast({ title: "Usuário desbloqueado" });
                fetchData();
            }
        }
        setBanningId(null);
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Imagem muito grande (máx 5MB)", variant: "destructive" });
            return;
        }
        setUploading(true);
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("banners").upload(path, file);
        if (uploadError) {
            toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
            setUploading(false);
            return;
        }
        const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
        const { error: insertError } = await supabase.from("banners").insert({
            image_url: urlData.publicUrl,
            title: file.name,
            display_order: banners.length,
        });
        if (insertError) {
            toast({ title: "Erro ao salvar banner", variant: "destructive" });
        } else {
            toast({ title: "Banner adicionado!" });
            fetchData();
        }
        setUploading(false);
    };

    const handleDeleteBanner = async (banner: Banner) => {
        const fileName = banner.image_url.split("/").pop();
        if (fileName) {
            await supabase.storage.from("banners").remove([fileName]);
        }
        const { error } = await supabase.from("banners").delete().eq("id", banner.id);
        if (error) {
            toast({ title: "Erro ao remover banner", variant: "destructive" });
        } else {
            toast({ title: "Banner removido" });
            fetchData();
        }
    };

    if (authLoading || adminLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 pt-24 pb-12">
                <div className="mb-8 flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold text-foreground">Painel do Administrador</h1>
                </div>

                <Tabs defaultValue="users">
                    <TabsList className="mb-6">
                        <TabsTrigger value="users">Usuários</TabsTrigger>
                        <TabsTrigger value="banners">Banners</TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <CardTitle>Usuários Cadastrados ({profiles.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingData ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nome</TableHead>
                                                <TableHead>E-mail</TableHead>
                                                <TableHead>Cadastro</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {profiles.map((p) => (
                                                <TableRow key={p.user_id}>
                                                    <TableCell className="font-medium">{p.name}</TableCell>
                                                    <TableCell>{p.email}</TableCell>
                                                    <TableCell>{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                                                    <TableCell>
                                                        {isBanned(p.user_id) ? (
                                                            <Badge variant="destructive">Bloqueado</Badge>
                                                        ) : (
                                                            <Badge variant="secondary">Ativo</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {p.user_id !== user?.id && (
                                                            isBanned(p.user_id) ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={banningId === p.user_id}
                                                                    onClick={() => handleUnban(p.user_id)}
                                                                >
                                                                    {banningId === p.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desbloquear"}
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    disabled={banningId === p.user_id}
                                                                    onClick={() => handleBan(p.user_id)}
                                                                >
                                                                    {banningId === p.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Ban className="mr-1 h-4 w-4" /> Bloquear</>}
                                                                </Button>
                                                            )
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="banners">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Banners do Carrossel</CardTitle>
                                <div>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id="banner-upload"
                                        onChange={handleBannerUpload}
                                        disabled={uploading}
                                    />
                                    <Button asChild disabled={uploading}>
                                        <label htmlFor="banner-upload" className="cursor-pointer">
                                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                            {uploading ? "Enviando..." : "Adicionar Banner"}
                                        </label>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {banners.length === 0 ? (
                                    <p className="py-8 text-center text-muted-foreground">Nenhum banner cadastrado.</p>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {banners.map((b) => (
                                            <div key={b.id} className="group relative overflow-hidden rounded-lg border border-border">
                                                <img src={b.image_url} alt={b.title || "Banner"} className="aspect-[3/1] w-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteBanner(b)}>
                                                        <Trash2 className="mr-1 h-4 w-4" /> Remover
                                                    </Button>
                                                </div>
                                                {b.title && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-1 text-xs text-white">
                                                        {b.title}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Admin;
