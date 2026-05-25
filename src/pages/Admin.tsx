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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Ban, Upload, Trash2, Loader2, Gift, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { isSorteioEncerrado, normalizeSorteioLink, type Sorteio } from "@/lib/sorteios";

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
    is_active: boolean;
    display_order: number;
    link: string | null;
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
    const [bannerModalOpen, setBannerModalOpen] = useState(false);
    const [newBannerLink, setNewBannerLink] = useState("");
    const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
    const [sorteios, setSorteios] = useState<Sorteio[]>([]);
    const [savingSorteio, setSavingSorteio] = useState(false);
    const [pendingSorteioImage, setPendingSorteioImage] = useState<File | null>(null);
    const [deletingSorteioId, setDeletingSorteioId] = useState<string | null>(null);
    const [sorteioForm, setSorteioForm] = useState({
        name: "",
        sponsor_name: "",
        link_pagina: "",
        validity_period: "",
        start_date: "",
        end_date: "",
    });
    const [sorteioEditModalOpen, setSorteioEditModalOpen] = useState(false);
    const [editingSorteio, setEditingSorteio] = useState<Sorteio | null>(null);
    const [editSorteioForm, setEditSorteioForm] = useState({
        name: "",
        sponsor_name: "",
        link_pagina: "",
        validity_period: "",
        start_date: "",
        end_date: "",
    });
    const [pendingSorteioEditImage, setPendingSorteioEditImage] = useState<File | null>(null);

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
        const [profilesRes, bannedRes, bannersRes, sorteiosRes] = await Promise.all([
            supabase.from("profiles").select("user_id, name, email, avatar_url, created_at").order("created_at", { ascending: false }),
            supabase.from("banned_users").select("*"),
            supabase.from("banners").select("*").order("display_order"),
            supabase.from("sorteios").select("*").order("created_at", { ascending: false }),
        ]);
        if (profilesRes.data) setProfiles(profilesRes.data);
        if (bannedRes.data) setBannedUsers(bannedRes.data);
        if (bannersRes.data) setBanners(bannersRes.data);
        if (sorteiosRes.data) setSorteios(sorteiosRes.data as Sorteio[]);
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

    const resetBannerModal = () => {
        setNewBannerLink("");
        setPendingBannerFile(null);
    };

    const handleBannerModalChange = (open: boolean) => {
        setBannerModalOpen(open);
        if (!open) resetBannerModal();
    };

    const handlePickBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setPendingBannerFile(null);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Imagem muito grande (máx 5MB)", variant: "destructive" });
            e.target.value = "";
            return;
        }
        setPendingBannerFile(file);
    };

    const handleSubmitBanner = async () => {
        const file = pendingBannerFile;
        if (!file) {
            toast({ title: "Selecione uma imagem", variant: "destructive" });
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
        const linkTrimmed = newBannerLink.trim();
        const { error: insertError } = await supabase.from("banners").insert({
            image_url: urlData.publicUrl,
            title: file.name,
            display_order: banners.length,
            link: linkTrimmed.length > 0 ? linkTrimmed : null,
        });
        if (insertError) {
            toast({ title: "Erro ao salvar banner", variant: "destructive" });
        } else {
            toast({ title: "Banner adicionado!" });
            handleBannerModalChange(false);
            fetchData();
        }
        setUploading(false);
    };

    const resetSorteioForm = () => {
        setSorteioForm({
            name: "",
            sponsor_name: "",
            link_pagina: "",
            validity_period: "",
            start_date: "",
            end_date: "",
        });
        setPendingSorteioImage(null);
    };

    const handlePickSorteioImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setPendingSorteioImage(null);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Imagem muito grande (máx 5MB)", variant: "destructive" });
            e.target.value = "";
            return;
        }
        setPendingSorteioImage(file);
    };

    const uploadSorteioImage = async (file: File): Promise<string | null> => {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("sorteios").upload(path, file);
        if (uploadError) {
            toast({ title: "Erro no upload da imagem", description: uploadError.message, variant: "destructive" });
            return null;
        }
        const { data: urlData } = supabase.storage.from("sorteios").getPublicUrl(path);
        return urlData.publicUrl;
    };

    const removeSorteioImageFromStorage = async (imageUrl: string | null) => {
        if (!imageUrl) return;
        const fileName = imageUrl.split("/").pop();
        if (fileName) {
            await supabase.storage.from("sorteios").remove([fileName]);
        }
    };

    const handleCreateSorteio = async (e: React.FormEvent) => {
        e.preventDefault();
        const { name, sponsor_name, link_pagina, validity_period, start_date, end_date } = sorteioForm;
        if (!name.trim() || !sponsor_name.trim() || !validity_period.trim() || !start_date || !end_date) {
            toast({ title: "Preencha todos os campos do sorteio", variant: "destructive" });
            return;
        }
        if (!pendingSorteioImage) {
            toast({ title: "Selecione uma imagem para o sorteio", variant: "destructive" });
            return;
        }
        if (new Date(end_date) < new Date(start_date)) {
            toast({ title: "A data final deve ser igual ou posterior à data de início", variant: "destructive" });
            return;
        }
        setSavingSorteio(true);
        const imageUrl = await uploadSorteioImage(pendingSorteioImage);
        if (!imageUrl) {
            setSavingSorteio(false);
            return;
        }
        const { error } = await supabase.from("sorteios").insert({
            name: name.trim(),
            sponsor_name: sponsor_name.trim(),
            link_pagina: normalizeSorteioLink(link_pagina),
            validity_period: validity_period.trim(),
            start_date: new Date(start_date).toISOString(),
            end_date: new Date(end_date).toISOString(),
            image_url: imageUrl,
            created_by: user!.id,
        });
        if (error) {
            await removeSorteioImageFromStorage(imageUrl);
            toast({ title: "Erro ao cadastrar sorteio", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Sorteio cadastrado com sucesso!" });
            resetSorteioForm();
            fetchData();
        }
        setSavingSorteio(false);
    };

    const handleDeleteSorteio = async (sorteio: Sorteio) => {
        setDeletingSorteioId(sorteio.id);
        await removeSorteioImageFromStorage(sorteio.image_url);
        const { error } = await supabase.from("sorteios").delete().eq("id", sorteio.id);
        if (error) {
            toast({ title: "Erro ao remover sorteio", variant: "destructive" });
        } else {
            toast({ title: "Sorteio removido" });
            fetchData();
        }
        setDeletingSorteioId(null);
    };

    const formatSorteioDateTime = (value: string) =>
        new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    const toDatetimeLocalValue = (iso: string) => {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const resetSorteioEditModal = () => {
        setEditingSorteio(null);
        setEditSorteioForm({
            name: "",
            sponsor_name: "",
            link_pagina: "",
            validity_period: "",
            start_date: "",
            end_date: "",
        });
        setPendingSorteioEditImage(null);
    };

    const handleSorteioEditModalChange = (open: boolean) => {
        setSorteioEditModalOpen(open);
        if (!open) resetSorteioEditModal();
    };

    const handleOpenEditSorteio = (sorteio: Sorteio) => {
        setEditingSorteio(sorteio);
        setEditSorteioForm({
            name: sorteio.name,
            sponsor_name: sorteio.sponsor_name,
            link_pagina: sorteio.link_pagina ?? "",
            validity_period: sorteio.validity_period,
            start_date: toDatetimeLocalValue(sorteio.start_date),
            end_date: toDatetimeLocalValue(sorteio.end_date),
        });
        setPendingSorteioEditImage(null);
        setSorteioEditModalOpen(true);
    };

    const handlePickSorteioEditImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setPendingSorteioEditImage(null);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Imagem muito grande (máx 5MB)", variant: "destructive" });
            e.target.value = "";
            return;
        }
        setPendingSorteioEditImage(file);
    };

    const handleUpdateSorteio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSorteio) return;

        const { name, sponsor_name, link_pagina, validity_period, start_date, end_date } = editSorteioForm;
        if (!name.trim() || !sponsor_name.trim() || !validity_period.trim() || !start_date || !end_date) {
            toast({ title: "Preencha todos os campos do sorteio", variant: "destructive" });
            return;
        }
        if (new Date(end_date) < new Date(start_date)) {
            toast({ title: "A data final deve ser igual ou posterior à data de início", variant: "destructive" });
            return;
        }

        setSavingSorteio(true);
        let imageUrl = editingSorteio.image_url;
        const previousImageUrl = editingSorteio.image_url;

        if (pendingSorteioEditImage) {
            const uploadedUrl = await uploadSorteioImage(pendingSorteioEditImage);
            if (!uploadedUrl) {
                setSavingSorteio(false);
                return;
            }
            imageUrl = uploadedUrl;
        }

        if (!imageUrl) {
            toast({ title: "O sorteio precisa de uma imagem", variant: "destructive" });
            setSavingSorteio(false);
            return;
        }

        const { error } = await supabase
            .from("sorteios")
            .update({
                name: name.trim(),
                sponsor_name: sponsor_name.trim(),
                link_pagina: normalizeSorteioLink(link_pagina),
                validity_period: validity_period.trim(),
                start_date: new Date(start_date).toISOString(),
                end_date: new Date(end_date).toISOString(),
                image_url: imageUrl,
            })
            .eq("id", editingSorteio.id);

        if (error) {
            if (imageUrl !== previousImageUrl) {
                await removeSorteioImageFromStorage(imageUrl);
            }
            toast({ title: "Erro ao atualizar sorteio", description: error.message, variant: "destructive" });
        } else {
            if (imageUrl !== previousImageUrl) {
                await removeSorteioImageFromStorage(previousImageUrl);
            }
            toast({ title: "Sorteio atualizado com sucesso!" });
            handleSorteioEditModalChange(false);
            fetchData();
        }
        setSavingSorteio(false);
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
                        <TabsTrigger value="sorteios">Sorteios</TabsTrigger>
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
                                    <Button type="button" onClick={() => setBannerModalOpen(true)} disabled={uploading}>
                                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        Adicionar Banner
                                    </Button>
                                    <Dialog open={bannerModalOpen} onOpenChange={handleBannerModalChange}>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Novo banner</DialogTitle>
                                                <DialogDescription>Envie a imagem e, se quiser, o link ao qual o banner deve levar ao ser clicado.</DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="banner-file-modal">Imagem</Label>
                                                    <Input
                                                        id="banner-file-modal"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handlePickBannerFile}
                                                        disabled={uploading}
                                                    />
                                                    {pendingBannerFile ? (
                                                        <p className="text-sm text-muted-foreground">{pendingBannerFile.name}</p>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">Nenhum arquivo selecionado.</p>
                                                    )}
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="banner-link">Link do banner (opcional)</Label>
                                                    <Input
                                                        id="banner-link"
                                                        type="text"
                                                        placeholder="https://..."
                                                        value={newBannerLink}
                                                        onChange={(e) => setNewBannerLink(e.target.value)}
                                                        disabled={uploading}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => handleBannerModalChange(false)} disabled={uploading}>
                                                    Cancelar
                                                </Button>
                                                <Button type="button" onClick={handleSubmitBanner} disabled={uploading}>
                                                    {uploading ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                                                        </>
                                                    ) : (
                                                        "Salvar banner"
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
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
                                                {(b.link || b.title) && (
                                                    <div
                                                        className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-3 py-1 text-xs text-white"
                                                        title={b.link ?? b.title ?? undefined}
                                                    >
                                                        {b.link ? `Link: ${b.link}` : b.title}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sorteios">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Gift className="h-5 w-5 text-primary" />
                                        Cadastrar sorteio
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleCreateSorteio} className="grid gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="sorteio-name">Nome do sorteio</Label>
                                            <Input
                                                id="sorteio-name"
                                                value={sorteioForm.name}
                                                onChange={(e) => setSorteioForm((f) => ({ ...f, name: e.target.value }))}
                                                disabled={savingSorteio}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="sorteio-image">Imagem do sorteio</Label>
                                            <Input
                                                id="sorteio-image"
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePickSorteioImage}
                                                disabled={savingSorteio}
                                                required
                                            />
                                            {pendingSorteioImage ? (
                                                <p className="text-sm text-muted-foreground">{pendingSorteioImage.name}</p>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Nenhum arquivo selecionado.</p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="sorteio-sponsor">Nome do patrocinador</Label>
                                            <Input
                                                id="sorteio-sponsor"
                                                value={sorteioForm.sponsor_name}
                                                onChange={(e) => setSorteioForm((f) => ({ ...f, sponsor_name: e.target.value }))}
                                                disabled={savingSorteio}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="sorteio-link">Link da página do patrocinador (opcional)</Label>
                                            <Input
                                                id="sorteio-link"
                                                type="url"
                                                placeholder="https://..."
                                                value={sorteioForm.link_pagina}
                                                onChange={(e) => setSorteioForm((f) => ({ ...f, link_pagina: e.target.value }))}
                                                disabled={savingSorteio}
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                Ao clicar no nome do patrocinador na página de sorteios, o usuário será direcionado para este link.
                                            </p>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="sorteio-validity">Observações</Label>
                                            <Textarea
                                                id="sorteio-validity"
                                                placeholder="Ex.: O melhor da city, etc.."
                                                value={sorteioForm.validity_period}
                                                onChange={(e) => setSorteioForm((f) => ({ ...f, validity_period: e.target.value }))}
                                                disabled={savingSorteio}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="sorteio-start">Data de início</Label>
                                                <Input
                                                    id="sorteio-start"
                                                    type="datetime-local"
                                                    value={sorteioForm.start_date}
                                                    onChange={(e) => setSorteioForm((f) => ({ ...f, start_date: e.target.value }))}
                                                    disabled={savingSorteio}
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="sorteio-end">Data de final</Label>
                                                <Input
                                                    id="sorteio-end"
                                                    type="datetime-local"
                                                    value={sorteioForm.end_date}
                                                    onChange={(e) => setSorteioForm((f) => ({ ...f, end_date: e.target.value }))}
                                                    disabled={savingSorteio}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Data e hora do cadastro serão registradas automaticamente ao salvar.
                                        </p>
                                        <Button type="submit" disabled={savingSorteio}>
                                            {savingSorteio ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                                                </>
                                            ) : (
                                                "Cadastrar sorteio"
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Sorteios cadastrados ({sorteios.length})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {loadingData ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : sorteios.length === 0 ? (
                                        <p className="py-8 text-center text-muted-foreground">Nenhum sorteio cadastrado.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {sorteios.map((s) => (
                                                <div key={s.id} className="overflow-hidden rounded-lg border border-border">
                                                    {s.image_url && (
                                                        <img
                                                            src={s.image_url}
                                                            alt={s.name}
                                                            className="aspect-[16/9] w-full object-cover"
                                                        />
                                                    )}
                                                    <div className="p-4">
                                                        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                                            <div>
                                                                <p className="font-semibold text-foreground">{s.name}</p>
                                                                <p className="text-sm text-muted-foreground">Patrocinador: {s.sponsor_name}</p>
                                                            </div>
                                                            <Badge variant={isSorteioEncerrado(s) ? "secondary" : "default"}>
                                                                {isSorteioEncerrado(s) ? "Encerrado" : "Em andamento"}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-1 text-sm text-muted-foreground">
                                                            <p>Observações: {s.validity_period}</p>
                                                            <p>Início: {formatSorteioDateTime(s.start_date)}</p>
                                                            <p>Término: {formatSorteioDateTime(s.end_date)}</p>
                                                            <p>Cadastrado em: {formatSorteioDateTime(s.created_at)}</p>
                                                        </div>
                                                        <div className="mt-3 flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={deletingSorteioId === s.id || savingSorteio}
                                                                onClick={() => handleOpenEditSorteio(s)}
                                                            >
                                                                <Pencil className="mr-1 h-4 w-4" /> Editar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                disabled={deletingSorteioId === s.id || savingSorteio}
                                                                onClick={() => handleDeleteSorteio(s)}
                                                            >
                                                                {deletingSorteioId === s.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <Trash2 className="mr-1 h-4 w-4" /> Remover
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Dialog open={sorteioEditModalOpen} onOpenChange={handleSorteioEditModalChange}>
                            <DialogContent className="flex max-h-[80vh] w-[calc(100%-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
                                <DialogHeader className="shrink-0 px-6 pt-6 pb-2 pr-12">
                                    <DialogTitle>Editar sorteio</DialogTitle>
                                    <DialogDescription>
                                        Atualize os dados do sorteio. A data de cadastro não é alterada.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleUpdateSorteio} className="flex min-h-0 flex-1 flex-col">
                                    <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-sorteio-name">Nome do sorteio</Label>
                                            <Input
                                                id="edit-sorteio-name"
                                                value={editSorteioForm.name}
                                                onChange={(e) => setEditSorteioForm((f) => ({ ...f, name: e.target.value }))}
                                                disabled={savingSorteio}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-sorteio-image">Imagem do sorteio</Label>
                                            {editingSorteio?.image_url && !pendingSorteioEditImage && (
                                                <img
                                                    src={editingSorteio.image_url}
                                                    alt={editingSorteio.name}
                                                    className="max-h-28 w-full rounded-md border border-border object-cover"
                                                />
                                            )}
                                            <Input
                                                id="edit-sorteio-image"
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePickSorteioEditImage}
                                                disabled={savingSorteio}
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                {pendingSorteioEditImage
                                                    ? `Nova imagem: ${pendingSorteioEditImage.name}`
                                                    : "Deixe em branco para manter a imagem atual."}
                                            </p>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-sorteio-sponsor">Nome do patrocinador</Label>
                                            <Input
                                                id="edit-sorteio-sponsor"
                                                value={editSorteioForm.sponsor_name}
                                                onChange={(e) => setEditSorteioForm((f) => ({ ...f, sponsor_name: e.target.value }))}
                                                disabled={savingSorteio}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-sorteio-link">Link da página do patrocinador (opcional)</Label>
                                            <Input
                                                id="edit-sorteio-link"
                                                type="url"
                                                placeholder="https://..."
                                                value={editSorteioForm.link_pagina}
                                                onChange={(e) => setEditSorteioForm((f) => ({ ...f, link_pagina: e.target.value }))}
                                                disabled={savingSorteio}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-sorteio-validity">Observações</Label>
                                            <Textarea
                                                id="edit-sorteio-validity"
                                                value={editSorteioForm.validity_period}
                                                onChange={(e) => setEditSorteioForm((f) => ({ ...f, validity_period: e.target.value }))}
                                                disabled={savingSorteio}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="edit-sorteio-start">Data de início</Label>
                                                <Input
                                                    id="edit-sorteio-start"
                                                    type="datetime-local"
                                                    value={editSorteioForm.start_date}
                                                    onChange={(e) => setEditSorteioForm((f) => ({ ...f, start_date: e.target.value }))}
                                                    disabled={savingSorteio}
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="edit-sorteio-end">Data de final</Label>
                                                <Input
                                                    id="edit-sorteio-end"
                                                    type="datetime-local"
                                                    value={editSorteioForm.end_date}
                                                    onChange={(e) => setEditSorteioForm((f) => ({ ...f, end_date: e.target.value }))}
                                                    disabled={savingSorteio}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        {editingSorteio && (
                                            <p className="text-sm text-muted-foreground">
                                                Cadastrado em: {formatSorteioDateTime(editingSorteio.created_at)}
                                            </p>
                                        )}
                                    </div>
                                    <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleSorteioEditModalChange(false)}
                                            disabled={savingSorteio}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={savingSorteio}>
                                            {savingSorteio ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                                                </>
                                            ) : (
                                                "Salvar alterações"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Admin;
