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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Shield, Ban, Upload, Trash2, Loader2, Gift, Pencil, Search, Eye, EyeOff, Handshake, Link2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { isSorteioEncerrado, normalizeSorteioLink, type Sorteio } from "@/lib/sorteios";
import { runSorteioDraw } from "@/lib/runSorteio";

interface Profile {
    user_id: string;
    name: string;
    email: string;
    phone: string | null;
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

interface Parceiro {
    id: string;
    name: string;
    description: string | null;
    link: string | null;
    image_url: string | null;
    created_at: string;
    created_by: string;
}

const emptyParceiroForm = {
    name: "",
    description: "",
    link: "",
};

type ParceiroFormState = typeof emptyParceiroForm;

const SORTEIO_FORM_STORAGE_KEY = "admin:sorteio-form-draft";

const emptySorteioForm = {
    name: "",
    sponsor_name: "",
    link_pagina: "",
    validity_period: "",
    start_date: "",
    end_date: "",
};

type SorteioFormState = typeof emptySorteioForm;

const loadSorteioFormDraft = (): SorteioFormState => {
    if (typeof window === "undefined") return { ...emptySorteioForm };
    try {
        const raw = window.localStorage.getItem(SORTEIO_FORM_STORAGE_KEY);
        if (!raw) return { ...emptySorteioForm };
        const parsed = JSON.parse(raw) as Partial<SorteioFormState>;
        return { ...emptySorteioForm, ...parsed };
    } catch {
        return { ...emptySorteioForm };
    }
};

const Admin = () => {
    const { user, loading: authLoading } = useAuth();
    const { isAdmin, loading: adminLoading } = useAdmin();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [userSearch, setUserSearch] = useState("");
    const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [banningId, setBanningId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [bannerModalOpen, setBannerModalOpen] = useState(false);
    const [newBannerLink, setNewBannerLink] = useState("");
    const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
    const [editBanner, setEditBanner] = useState<Banner | null>(null);
    const [editBannerLink, setEditBannerLink] = useState("");
    const [savingBannerLink, setSavingBannerLink] = useState(false);
    const [sorteios, setSorteios] = useState<Sorteio[]>([]);
    const [savingSorteio, setSavingSorteio] = useState(false);
    const [pendingSorteioImage, setPendingSorteioImage] = useState<File | null>(null);
    const [deletingSorteioId, setDeletingSorteioId] = useState<string | null>(null);
    const [togglingPublishId, setTogglingPublishId] = useState<string | null>(null);
    const [sorteioForm, setSorteioForm] = useState<SorteioFormState>(loadSorteioFormDraft);
    const [sorteioEditModalOpen, setSorteioEditModalOpen] = useState(false);
    const [editingSorteio, setEditingSorteio] = useState<Sorteio | null>(null);
    const [editSorteioForm, setEditSorteioForm] = useState({
        name: "",
        sponsor_name: "",
        link_pagina: "",
        validity_period: "",
        start_date: "",
        end_date: "",
        created_at: "",
    });
    const [pendingSorteioEditImage, setPendingSorteioEditImage] = useState<File | null>(null);
    const [drawingSorteio, setDrawingSorteio] = useState(false);

    const [parceiros, setParceiros] = useState<Parceiro[]>([]);
    const [parceiroForm, setParceiroForm] = useState<ParceiroFormState>({ ...emptyParceiroForm });
    const [pendingParceiroImage, setPendingParceiroImage] = useState<File | null>(null);
    const [savingParceiro, setSavingParceiro] = useState(false);
    const [deletingParceiroId, setDeletingParceiroId] = useState<string | null>(null);
    const [parceiroEditModalOpen, setParceiroEditModalOpen] = useState(false);
    const [editingParceiro, setEditingParceiro] = useState<Parceiro | null>(null);
    const [editParceiroForm, setEditParceiroForm] = useState<ParceiroFormState>({ ...emptyParceiroForm });
    const [pendingParceiroEditImage, setPendingParceiroEditImage] = useState<File | null>(null);

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

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(SORTEIO_FORM_STORAGE_KEY, JSON.stringify(sorteioForm));
        } catch {
            // Ignora erros de persistência (ex.: armazenamento cheio ou indisponível).
        }
    }, [sorteioForm]);

    const fetchData = async () => {
        setLoadingData(true);
        const [profilesRes, bannedRes, bannersRes, sorteiosRes, parceirosRes] = await Promise.all([
            supabase.from("profiles").select("user_id, name, email, phone, avatar_url, created_at").order("created_at", { ascending: false }),
            supabase.from("banned_users").select("*"),
            supabase.from("banners").select("*").order("display_order"),
            supabase.from("sorteios").select("*").order("created_at", { ascending: false }),
            supabase.from("parceiros").select("*").order("created_at", { ascending: false }),
        ]);
        if (profilesRes.data) setProfiles(profilesRes.data);
        if (bannedRes.data) setBannedUsers(bannedRes.data);
        if (bannersRes.data) setBanners(bannersRes.data);
        if (sorteiosRes.data) setSorteios(sorteiosRes.data as Sorteio[]);
        if (parceirosRes.data) setParceiros(parceirosRes.data as Parceiro[]);
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
        setSorteioForm({ ...emptySorteioForm });
        setPendingSorteioImage(null);
        if (typeof window !== "undefined") {
            try {
                window.localStorage.removeItem(SORTEIO_FORM_STORAGE_KEY);
            } catch {
                // Ignora erros ao limpar o rascunho.
            }
        }
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

    const handleToggleSorteioPublished = async (sorteio: Sorteio) => {
        setTogglingPublishId(sorteio.id);
        const nextPublished = !sorteio.published;
        const { error } = await supabase
            .from("sorteios")
            .update({ published: nextPublished })
            .eq("id", sorteio.id);
        if (error) {
            toast({ title: "Erro ao atualizar publicação", description: error.message, variant: "destructive" });
        } else {
            toast({ title: nextPublished ? "Sorteio publicado" : "Sorteio despublicado" });
            setSorteios((prev) =>
                prev.map((s) => (s.id === sorteio.id ? { ...s, published: nextPublished } : s))
            );
        }
        setTogglingPublishId(null);
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
            created_at: "",
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
            created_at: toDatetimeLocalValue(sorteio.created_at),
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

        const { name, sponsor_name, link_pagina, validity_period, start_date, end_date, created_at } = editSorteioForm;
        if (!name.trim() || !sponsor_name.trim() || !validity_period.trim() || !start_date || !end_date || !created_at) {
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
                created_at: new Date(created_at).toISOString(),
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

    const handleRunSorteio = async () => {
        setDrawingSorteio(true);
        const result = await runSorteioDraw(new Date(), Math.random, { force: true });
        switch (result.status) {
            case "ok": {
                const nomes = result.ganhadores.map((g) => g.name).join(", ");
                toast({
                    title: `Sorteio realizado! ${result.ganhadores.length} ganhador(es)`,
                    description: nomes ? `Ganhador(es): ${nomes}` : undefined,
                });
                break;
            }
            case "not-last-day":
                toast({ title: "Fora da data do sorteio", description: "O sorteio automático ocorre no último dia do mês." });
                break;
            case "no-participants":
                toast({ title: "Nenhum participante encontrado", variant: "destructive" });
                break;
            case "no-items":
                toast({ title: "Nenhum item disponível neste mês", description: "Cadastre sorteios com término dentro do mês vigente.", variant: "destructive" });
                break;
            case "error":
                toast({ title: "Erro ao realizar o sorteio", description: result.error, variant: "destructive" });
                break;
        }
        setDrawingSorteio(false);
    };

    const handlePickParceiroImage = (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: (file: File | null) => void,
    ) => {
        const file = e.target.files?.[0];
        if (!file) {
            setter(null);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Imagem muito grande (máx 5MB)", variant: "destructive" });
            e.target.value = "";
            return;
        }
        setter(file);
    };

    const uploadParceiroImage = async (file: File): Promise<string | null> => {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("parceiros").upload(path, file);
        if (uploadError) {
            toast({ title: "Erro no upload da imagem", description: uploadError.message, variant: "destructive" });
            return null;
        }
        const { data: urlData } = supabase.storage.from("parceiros").getPublicUrl(path);
        return urlData.publicUrl;
    };

    const removeParceiroImageFromStorage = async (imageUrl: string | null) => {
        if (!imageUrl) return;
        const fileName = imageUrl.split("/").pop();
        if (fileName) {
            await supabase.storage.from("parceiros").remove([fileName]);
        }
    };

    const resetParceiroForm = () => {
        setParceiroForm({ ...emptyParceiroForm });
        setPendingParceiroImage(null);
    };

    const handleCreateParceiro = async (e: React.FormEvent) => {
        e.preventDefault();
        const { name, description, link } = parceiroForm;
        if (!name.trim()) {
            toast({ title: "Informe o nome do parceiro", variant: "destructive" });
            return;
        }
        if (!pendingParceiroImage) {
            toast({ title: "Selecione uma imagem para o parceiro", variant: "destructive" });
            return;
        }
        setSavingParceiro(true);
        const imageUrl = await uploadParceiroImage(pendingParceiroImage);
        if (!imageUrl) {
            setSavingParceiro(false);
            return;
        }
        const { error } = await supabase.from("parceiros").insert({
            name: name.trim(),
            description: description.trim() || null,
            link: link.trim() || null,
            image_url: imageUrl,
            created_by: user!.id,
        });
        if (error) {
            await removeParceiroImageFromStorage(imageUrl);
            toast({ title: "Erro ao cadastrar parceiro", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Parceiro cadastrado com sucesso!" });
            resetParceiroForm();
            fetchData();
        }
        setSavingParceiro(false);
    };

    const resetParceiroEditModal = () => {
        setEditingParceiro(null);
        setEditParceiroForm({ ...emptyParceiroForm });
        setPendingParceiroEditImage(null);
    };

    const handleParceiroEditModalChange = (open: boolean) => {
        setParceiroEditModalOpen(open);
        if (!open) resetParceiroEditModal();
    };

    const handleOpenEditParceiro = (parceiro: Parceiro) => {
        setEditingParceiro(parceiro);
        setEditParceiroForm({
            name: parceiro.name,
            description: parceiro.description ?? "",
            link: parceiro.link ?? "",
        });
        setPendingParceiroEditImage(null);
        setParceiroEditModalOpen(true);
    };

    const handleUpdateParceiro = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingParceiro) return;
        const { name, description, link } = editParceiroForm;
        if (!name.trim()) {
            toast({ title: "Informe o nome do parceiro", variant: "destructive" });
            return;
        }
        setSavingParceiro(true);
        let imageUrl = editingParceiro.image_url;
        const previousImageUrl = editingParceiro.image_url;

        if (pendingParceiroEditImage) {
            const uploadedUrl = await uploadParceiroImage(pendingParceiroEditImage);
            if (!uploadedUrl) {
                setSavingParceiro(false);
                return;
            }
            imageUrl = uploadedUrl;
        }

        const { error } = await supabase
            .from("parceiros")
            .update({
                name: name.trim(),
                description: description.trim() || null,
                link: link.trim() || null,
                image_url: imageUrl,
            })
            .eq("id", editingParceiro.id);

        if (error) {
            if (imageUrl !== previousImageUrl) {
                await removeParceiroImageFromStorage(imageUrl);
            }
            toast({ title: "Erro ao atualizar parceiro", description: error.message, variant: "destructive" });
        } else {
            if (imageUrl !== previousImageUrl) {
                await removeParceiroImageFromStorage(previousImageUrl);
            }
            toast({ title: "Parceiro atualizado com sucesso!" });
            handleParceiroEditModalChange(false);
            fetchData();
        }
        setSavingParceiro(false);
    };

    const handleDeleteParceiro = async (parceiro: Parceiro) => {
        setDeletingParceiroId(parceiro.id);
        await removeParceiroImageFromStorage(parceiro.image_url);
        const { error } = await supabase.from("parceiros").delete().eq("id", parceiro.id);
        if (error) {
            toast({ title: "Erro ao remover parceiro", variant: "destructive" });
        } else {
            toast({ title: "Parceiro removido" });
            fetchData();
        }
        setDeletingParceiroId(null);
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

    const openEditBanner = (banner: Banner) => {
        setEditBanner(banner);
        setEditBannerLink(banner.link ?? "");
    };

    const handleEditBannerChange = (open: boolean) => {
        if (!open) {
            setEditBanner(null);
            setEditBannerLink("");
        }
    };

    const handleSaveBannerLink = async () => {
        if (!editBanner) return;
        setSavingBannerLink(true);
        const trimmed = editBannerLink.trim();
        const { error } = await supabase
            .from("banners")
            .update({ link: trimmed || null })
            .eq("id", editBanner.id);
        setSavingBannerLink(false);
        if (error) {
            toast({ title: "Erro ao atualizar o link", variant: "destructive" });
        } else {
            toast({ title: "Link atualizado!" });
            handleEditBannerChange(false);
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

    const normalizedSearch = userSearch.trim().toLowerCase();
    const filteredProfiles = normalizedSearch
        ? profiles.filter((p) =>
              p.user_id.toLowerCase().includes(normalizedSearch) ||
              (p.name ?? "").toLowerCase().includes(normalizedSearch) ||
              (p.email ?? "").toLowerCase().includes(normalizedSearch)
          )
        : profiles;

    const handleCopyField = async (value: string | null, label: string) => {
        const text = (value ?? "").trim();
        if (!text) {
            toast({ title: `${label} vazio`, description: "Nada para copiar." });
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            toast({ title: `${label} copiado!`, description: text });
        } catch {
            toast({ title: "Não foi possível copiar", variant: "destructive" });
        }
    };

    const getInitials = (name: string) =>
        name
            ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            : "U";

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
                        <TabsTrigger value="parceiros">Parceiros</TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <CardTitle>Usuários Cadastrados ({filteredProfiles.length})</CardTitle>
                                <div className="relative mt-4 max-w-md">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar por ID, nome ou e-mail..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
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
                                                <TableHead>ID</TableHead>
                                                <TableHead>Foto</TableHead>
                                                <TableHead>Nome</TableHead>
                                                <TableHead>Contato</TableHead>
                                                <TableHead>E-mail</TableHead>
                                                <TableHead>Cadastro</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredProfiles.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                                        Nenhum usuário encontrado.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                            filteredProfiles.map((p) => (
                                                <TableRow key={p.user_id}>
                                                    <TableCell
                                                        className="cursor-pointer font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
                                                        title="Clique para copiar o ID"
                                                        onClick={() => handleCopyField(p.user_id, "ID")}
                                                    >
                                                        {p.user_id}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Avatar className="h-9 w-9">
                                                            {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={p.name} /> : null}
                                                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                                                {getInitials(p.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </TableCell>
                                                    <TableCell
                                                        className="cursor-pointer font-medium transition-colors hover:text-primary"
                                                        title="Clique para copiar o nome"
                                                        onClick={() => handleCopyField(p.name, "Nome")}
                                                    >
                                                        {p.name}
                                                    </TableCell>
                                                    <TableCell
                                                        className="cursor-pointer transition-colors hover:text-primary"
                                                        title="Clique para copiar o contato"
                                                        onClick={() => handleCopyField(p.phone, "Contato")}
                                                    >
                                                        {p.phone || "—"}
                                                    </TableCell>
                                                    <TableCell
                                                        className="cursor-pointer transition-colors hover:text-primary"
                                                        title="Clique para copiar o e-mail"
                                                        onClick={() => handleCopyField(p.email, "E-mail")}
                                                    >
                                                        {p.email}
                                                    </TableCell>
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
                                            ))
                                            )}
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
                                                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <Button size="sm" variant="secondary" onClick={() => openEditBanner(b)}>
                                                        <Pencil className="mr-1 h-4 w-4" /> Editar link
                                                    </Button>
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
                        <Dialog open={!!editBanner} onOpenChange={handleEditBannerChange}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Editar link do banner</DialogTitle>
                                    <DialogDescription>
                                        Defina o link de destino. Use uma URL (https://...) para abrir uma página ou um e-mail para abrir o cliente de e-mail.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-2">
                                    {editBanner && (
                                        <img
                                            src={editBanner.image_url}
                                            alt={editBanner.title || "Banner"}
                                            className="aspect-[3/1] w-full rounded-md object-cover"
                                        />
                                    )}
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-banner-link">Link do banner (opcional)</Label>
                                        <Input
                                            id="edit-banner-link"
                                            type="text"
                                            placeholder="https://... ou contato@email.com"
                                            value={editBannerLink}
                                            onChange={(e) => setEditBannerLink(e.target.value)}
                                            disabled={savingBannerLink}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleEditBannerChange(false)}
                                        disabled={savingBannerLink}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="button" onClick={handleSaveBannerLink} disabled={savingBannerLink}>
                                        {savingBannerLink ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                                            </>
                                        ) : (
                                            "Salvar link"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
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
                                <CardHeader className="flex flex-row items-center justify-between gap-2">
                                    <CardTitle>Sorteios cadastrados ({sorteios.length})</CardTitle>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleRunSorteio}
                                        disabled={drawingSorteio || loadingData}
                                    >
                                        {drawingSorteio ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sorteando...
                                            </>
                                        ) : (
                                            <>
                                                <Gift className="mr-2 h-4 w-4" /> Realizar sorteio
                                            </>
                                        )}
                                    </Button>
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
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge variant={s.published ? "default" : "outline"}>
                                                                    {s.published ? "Publicado" : "Não publicado"}
                                                                </Badge>
                                                                <Badge variant={isSorteioEncerrado(s) ? "secondary" : "default"}>
                                                                    {isSorteioEncerrado(s) ? "Encerrado" : "Em andamento"}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1 text-sm text-muted-foreground">
                                                            <p>Observações: {s.validity_period}</p>
                                                            <p>Início: {formatSorteioDateTime(s.start_date)}</p>
                                                            <p>Término: {formatSorteioDateTime(s.end_date)}</p>
                                                            <p>Cadastrado em: {formatSorteioDateTime(s.created_at)}</p>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant={s.published ? "secondary" : "default"}
                                                                disabled={togglingPublishId === s.id || deletingSorteioId === s.id || savingSorteio}
                                                                onClick={() => handleToggleSorteioPublished(s)}
                                                            >
                                                                {togglingPublishId === s.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : s.published ? (
                                                                    <>
                                                                        <EyeOff className="mr-1 h-4 w-4" /> Despublicar
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Eye className="mr-1 h-4 w-4" /> Publicar
                                                                    </>
                                                                )}
                                                            </Button>
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
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-sorteio-created">Data de cadastro</Label>
                                            <Input
                                                id="edit-sorteio-created"
                                                type="datetime-local"
                                                value={editSorteioForm.created_at}
                                                onChange={(e) => setEditSorteioForm((f) => ({ ...f, created_at: e.target.value }))}
                                                disabled={savingSorteio}
                                                required
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Altere para prorrogar a participação do sorteio.
                                            </p>
                                        </div>
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

                    <TabsContent value="parceiros">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Handshake className="h-5 w-5 text-primary" />
                                        Cadastrar parceiro
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleCreateParceiro} className="grid gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="parceiro-image">Imagem do parceiro</Label>
                                            <Input
                                                id="parceiro-image"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handlePickParceiroImage(e, setPendingParceiroImage)}
                                                disabled={savingParceiro}
                                                required
                                            />
                                            {pendingParceiroImage ? (
                                                <p className="text-sm text-muted-foreground">{pendingParceiroImage.name}</p>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Nenhum arquivo selecionado.</p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="parceiro-name">Nome</Label>
                                            <Input
                                                id="parceiro-name"
                                                value={parceiroForm.name}
                                                onChange={(e) => setParceiroForm((f) => ({ ...f, name: e.target.value }))}
                                                disabled={savingParceiro}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="parceiro-link">Link (opcional)</Label>
                                            <Input
                                                id="parceiro-link"
                                                type="url"
                                                placeholder="https://..."
                                                value={parceiroForm.link}
                                                onChange={(e) => setParceiroForm((f) => ({ ...f, link: e.target.value }))}
                                                disabled={savingParceiro}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="parceiro-description">Descrição (opcional)</Label>
                                            <Textarea
                                                id="parceiro-description"
                                                placeholder="Descreva o parceiro..."
                                                value={parceiroForm.description}
                                                onChange={(e) => setParceiroForm((f) => ({ ...f, description: e.target.value }))}
                                                disabled={savingParceiro}
                                            />
                                        </div>
                                        <Button type="submit" disabled={savingParceiro}>
                                            {savingParceiro ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                                                </>
                                            ) : (
                                                "Cadastrar parceiro"
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Parceiros cadastrados ({parceiros.length})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {loadingData ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : parceiros.length === 0 ? (
                                        <p className="py-8 text-center text-muted-foreground">Nenhum parceiro cadastrado.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {parceiros.map((p) => (
                                                <div key={p.id} className="overflow-hidden rounded-lg border border-border">
                                                    {p.image_url && (
                                                        <img
                                                            src={p.image_url}
                                                            alt={p.name}
                                                            className="aspect-[16/9] w-full object-cover"
                                                        />
                                                    )}
                                                    <div className="p-4">
                                                        <p className="font-semibold text-foreground">{p.name}</p>
                                                        {p.description && (
                                                            <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                                                        )}
                                                        {p.link && (
                                                            <a
                                                                href={p.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                                            >
                                                                <Link2 className="h-3.5 w-3.5" /> {p.link}
                                                            </a>
                                                        )}
                                                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={deletingParceiroId === p.id || savingParceiro}
                                                                onClick={() => handleOpenEditParceiro(p)}
                                                            >
                                                                <Pencil className="mr-1 h-4 w-4" /> Editar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                disabled={deletingParceiroId === p.id || savingParceiro}
                                                                onClick={() => handleDeleteParceiro(p)}
                                                            >
                                                                {deletingParceiroId === p.id ? (
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

                        <Dialog open={parceiroEditModalOpen} onOpenChange={handleParceiroEditModalChange}>
                            <DialogContent className="flex max-h-[80vh] w-[calc(100%-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
                                <DialogHeader className="shrink-0 px-6 pt-6 pb-2 pr-12">
                                    <DialogTitle>Editar parceiro</DialogTitle>
                                    <DialogDescription>Atualize os dados do parceiro.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleUpdateParceiro} className="flex min-h-0 flex-1 flex-col">
                                    <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-parceiro-image">Imagem do parceiro</Label>
                                            {editingParceiro?.image_url && !pendingParceiroEditImage && (
                                                <img
                                                    src={editingParceiro.image_url}
                                                    alt={editingParceiro.name}
                                                    className="max-h-28 w-full rounded-md border border-border object-cover"
                                                />
                                            )}
                                            <Input
                                                id="edit-parceiro-image"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handlePickParceiroImage(e, setPendingParceiroEditImage)}
                                                disabled={savingParceiro}
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                {pendingParceiroEditImage
                                                    ? `Nova imagem: ${pendingParceiroEditImage.name}`
                                                    : "Deixe em branco para manter a imagem atual."}
                                            </p>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-parceiro-name">Nome</Label>
                                            <Input
                                                id="edit-parceiro-name"
                                                value={editParceiroForm.name}
                                                onChange={(e) => setEditParceiroForm((f) => ({ ...f, name: e.target.value }))}
                                                disabled={savingParceiro}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-parceiro-link">Link (opcional)</Label>
                                            <Input
                                                id="edit-parceiro-link"
                                                type="url"
                                                placeholder="https://..."
                                                value={editParceiroForm.link}
                                                onChange={(e) => setEditParceiroForm((f) => ({ ...f, link: e.target.value }))}
                                                disabled={savingParceiro}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-parceiro-description">Descrição (opcional)</Label>
                                            <Textarea
                                                id="edit-parceiro-description"
                                                value={editParceiroForm.description}
                                                onChange={(e) => setEditParceiroForm((f) => ({ ...f, description: e.target.value }))}
                                                disabled={savingParceiro}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleParceiroEditModalChange(false)}
                                            disabled={savingParceiro}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={savingParceiro}>
                                            {savingParceiro ? (
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
