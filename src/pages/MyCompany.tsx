import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MY_COMPANY_SELECTED_KEY = "mycompany-selected-company-id";
const SEL_NEW = "new" as const;

interface Company {
    id: string;
    user_id: string;
    responsible_name: string;
    company_name: string;
    banner_url: string | null;
    segment: string;
    full_address: string;
    maps_url: string | null;
    link_pagina: string | null;
    services_provided: string | null;
    whatsapp: string | null;
    published: boolean;
}

interface CompanyProduct {
    id: string;
    name: string;
    image_url: string | null;
    price: number;
    description: string | null;
    quantity: number;
}

function emptyFormState() {
    return {
        responsible_name: "",
        company_name: "",
        segment: "",
        full_address: "",
        maps_url: "",
        link_pagina: "",
        services_provided: "",
        whatsapp: "",
    };
}

function resolveSelection(preferred: string | typeof SEL_NEW, list: Company[]): string | typeof SEL_NEW {
    if (preferred === SEL_NEW) return SEL_NEW;
    if (list.some((c) => c.id === preferred)) return preferred;
    return list[0]?.id ?? SEL_NEW;
}

function resolveCompanySaveError(error: { code?: string; message?: string; details?: string | null }) {
    const msg = typeof error.message === "string" ? error.message.toLowerCase() : "";
    if (
        error.code === "23505" ||
        msg.includes("duplicate key") ||
        msg.includes("unique constraint") ||
        msg.includes("violates unique")
    ) {
        return "Não foi possível salvar: ainda há limite de uma empresa por usuário no banco. No Supabase, rode a migração supabase/migrations/20260524120000_companies_allow_multiple_per_user.sql e 20260525120000_drop_companies_user_id_unique_indexes.sql — ou execute o SQL no Editor SQL.";
    }
    return error.message ?? "Erro ao salvar empresa";
}

const MyCompany = () => {
    const { user, loading, subscription } = useAuth();
    const navigate = useNavigate();

    const [companiesList, setCompaniesList] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | typeof SEL_NEW>(SEL_NEW);
    const [products, setProducts] = useState<CompanyProduct[]>([]);
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [bannerFile, setBannerFile] = useState<File | null>(null);

    const [form, setForm] = useState(emptyFormState);

    const [prodOpen, setProdOpen] = useState(false);
    const [prodSaving, setProdSaving] = useState(false);
    const [prodForm, setProdForm] = useState({ name: "", price: "", description: "", quantity: "1" });
    const [prodFile, setProdFile] = useState<File | null>(null);

    const activeCompany =
        selectedCompanyId !== SEL_NEW ? companiesList.find((c) => c.id === selectedCompanyId) ?? null : null;

    const loadProducts = useCallback(async (companyId: string) => {
        // Ordenação por `id`: evita 400 quando a tabela no remoto não expõe `created_at`.
        const { data: p, error } = await supabase
            .from("company_products")
            .select("id,name,image_url,price,description,quantity")
            .eq("company_id", companyId)
            .order("id", { ascending: false });
        if (error) {
            // Evita toast a cada mudança de empresa; o console guarda detalhes do PostgREST.
            console.error("company_products:", error.code, error.message, error);
            setProducts([]);
            return;
        }
        setProducts((p as CompanyProduct[]) ?? []);
    }, []);

    const hydrateForSelection = useCallback(
        (sid: string | typeof SEL_NEW, list: Company[]) => {
            const resolved = resolveSelection(sid, list);
            if (resolved !== sid) {
                setSelectedCompanyId(resolved);
                sessionStorage.setItem(MY_COMPANY_SELECTED_KEY, resolved);
                sid = resolved;
            }
            if (sid === SEL_NEW) {
                setForm(emptyFormState());
                setProducts([]);
                setBannerFile(null);
                return;
            }
            const row = list.find((c) => c.id === sid);
            if (!row) return;
            setForm({
                responsible_name: row.responsible_name,
                company_name: row.company_name,
                segment: row.segment,
                full_address: row.full_address,
                maps_url: row.maps_url ?? "",
                link_pagina: row.link_pagina ?? "",
                services_provided: row.services_provided ?? "",
                whatsapp: row.whatsapp ?? "",
            });
            setBannerFile(null);
            void loadProducts(row.id);
        },
        [loadProducts],
    );

    const refreshCompanies = useCallback(
        async (preferSelection?: string | typeof SEL_NEW) => {
            if (!user) return;
            const { data, error } = await supabase
                .from("companies")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            const list = (data as Company[]) ?? [];

            let preferred: string | typeof SEL_NEW;
            if (preferSelection !== undefined) {
                preferred = preferSelection;
            } else {
                const saved = sessionStorage.getItem(MY_COMPANY_SELECTED_KEY);
                if (saved === SEL_NEW) preferred = SEL_NEW;
                else if (saved && list.some((c) => c.id === saved)) preferred = saved;
                else if (list.length > 0) preferred = list[0].id;
                else preferred = SEL_NEW;
            }

            const resolved = resolveSelection(preferred, list);
            setCompaniesList(list);
            setSelectedCompanyId(resolved);
            sessionStorage.setItem(MY_COMPANY_SELECTED_KEY, resolved);
            hydrateForSelection(resolved, list);
        },
        [user, hydrateForSelection],
    );

    useEffect(() => {
        if (loading) return;
        if (!user) {
            navigate("/auth");
            return;
        }
        if (!subscription.subscribed || subscription.plan_tier !== "enterprise") {
            toast.error("É necessário ter o plano Premium Enterprise ativo");
            navigate("/pricing");
            return;
        }
        let cancelled = false;
        (async () => {
            setFetching(true);
            try {
                await refreshCompanies();
            } catch (e: unknown) {
                if (!cancelled) toast.error(e instanceof Error ? e.message : "Erro ao carregar empresas");
            } finally {
                if (!cancelled) setFetching(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loading, user, subscription.subscribed, subscription.plan_tier, navigate, refreshCompanies]);

    const onSelectCompany = (value: string) => {
        const v = (value === SEL_NEW ? SEL_NEW : value) as string | typeof SEL_NEW;
        setSelectedCompanyId(v);
        sessionStorage.setItem(MY_COMPANY_SELECTED_KEY, v);
        hydrateForSelection(v, companiesList);
    };

    const uploadBanner = async (file: File): Promise<string> => {
        if (file.size > 2 * 1024 * 1024) {
            throw new Error("Banner deve ter no máximo 2MB");
        }
        const ext = file.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("company-banners").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("company-banners").getPublicUrl(path);
        return data.publicUrl;
    };

    const uploadProductImage = async (file: File): Promise<string> => {
        if (file.size > 2 * 1024 * 1024) throw new Error("Imagem deve ter no máximo 2MB");
        const ext = file.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("company-products").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("company-products").getPublicUrl(path);
        return data.publicUrl;
    };

    const handleSave = async () => {
        if (!form.responsible_name || !form.company_name || !form.segment || !form.full_address) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }
        setSaving(true);
        try {
            let banner_url = activeCompany?.banner_url ?? null;
            if (bannerFile) banner_url = await uploadBanner(bannerFile);
            const isNew = selectedCompanyId === SEL_NEW;
            if (!banner_url && isNew) {
                toast.error("Envie um banner da empresa");
                setSaving(false);
                return;
            }

            const payload = {
                responsible_name: form.responsible_name,
                company_name: form.company_name,
                segment: form.segment,
                full_address: form.full_address,
                banner_url,
                maps_url: form.maps_url || null,
                link_pagina: form.link_pagina.trim() || null,
                services_provided: form.services_provided.trim() || null,
                whatsapp: form.whatsapp || null,
            };

            let nextSelection: string | typeof SEL_NEW = selectedCompanyId;

            if (!isNew && activeCompany) {
                const { error } = await supabase.from("companies").update(payload).eq("id", activeCompany.id);
                if (error) throw new Error(resolveCompanySaveError(error));
                toast.success("Empresa atualizada");
            } else {
                const { data: inserted, error } = await supabase
                    .from("companies")
                    .insert({
                        user_id: user!.id,
                        ...payload,
                    })
                    .select("*")
                    .single();
                if (error) throw new Error(resolveCompanySaveError(error));
                toast.success("Empresa cadastrada");
                nextSelection = (inserted as Company).id;
            }
            setBannerFile(null);
            setFetching(true);
            await refreshCompanies(nextSelection);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Erro ao salvar");
        } finally {
            setFetching(false);
            setSaving(false);
        }
    };

    const togglePublish = async () => {
        if (!activeCompany) return;
        const { error } = await supabase
            .from("companies")
            .update({ published: !activeCompany.published })
            .eq("id", activeCompany.id);
        if (error) return toast.error(error.message);
        toast.success(activeCompany.published ? "Empresa despublicada" : "Empresa publicada");
        setFetching(true);
        try {
            await refreshCompanies(activeCompany.id);
        } finally {
            setFetching(false);
        }
    };

    const handleDeleteCompany = async () => {
        if (!activeCompany) return;
        setDeleting(true);
        try {
            await supabase.from("company_reviews").delete().eq("company_id", activeCompany.id);
            await supabase.from("company_products").delete().eq("company_id", activeCompany.id);
            const { error } = await supabase.from("companies").delete().eq("id", activeCompany.id).eq("user_id", user!.id);
            if (error) throw error;
            toast.success("Empresa removida");
            setDeleteOpen(false);
            setFetching(true);
            sessionStorage.removeItem(MY_COMPANY_SELECTED_KEY);
            await refreshCompanies();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Erro ao remover empresa");
        } finally {
            setFetching(false);
            setDeleting(false);
        }
    };

    const handleAddProduct = async () => {
        if (!activeCompany) return;
        if (!prodForm.name || !prodForm.price) {
            toast.error("Preencha nome e preço");
            return;
        }
        setProdSaving(true);
        try {
            let image_url: string | null = null;
            if (prodFile) image_url = await uploadProductImage(prodFile);
            const { error } = await supabase.from("company_products").insert({
                company_id: activeCompany.id,
                user_id: user!.id,
                name: prodForm.name,
                price: parseFloat(prodForm.price),
                description: prodForm.description.trim() || null,
                quantity: parseInt(prodForm.quantity) || 1,
                image_url,
            });
            if (error) throw error;
            toast.success("Produto cadastrado");
            setProdForm({ name: "", price: "", description: "", quantity: "1" });
            setProdFile(null);
            setProdOpen(false);
            await loadProducts(activeCompany.id);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Erro");
        } finally {
            setProdSaving(false);
        }
    };

    const deleteProduct = async (id: string) => {
        const { error } = await supabase.from("company_products").delete().eq("id", id);
        if (error) return toast.error(error.message);
        toast.success("Produto removido");
        if (activeCompany) await loadProducts(activeCompany.id);
    };

    const bannerObjectUrl = useMemo(
        () => (bannerFile ? URL.createObjectURL(bannerFile) : null),
        [bannerFile],
    );
    const bannerPreviewUrl = bannerObjectUrl ?? activeCompany?.banner_url ?? null;

    useEffect(() => {
        return () => {
            if (bannerObjectUrl) URL.revokeObjectURL(bannerObjectUrl);
        };
    }, [bannerObjectUrl]);

    if (loading || fetching) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center pt-32">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-4xl px-4 pt-24 pb-16">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="font-serif text-3xl font-bold text-foreground">Minhas empresas</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Plano Enterprise: cadastre e gerencie quantas empresas precisar.
                        </p>
                    </div>
                    {activeCompany && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Badge variant={activeCompany.published ? "default" : "secondary"}>
                                {activeCompany.published ? "Publicada" : "Rascunho"}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={togglePublish}>
                                {activeCompany.published ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                {activeCompany.published ? "Despublicar" : "Publicar"}
                            </Button>
                        </div>
                    )}
                </div>

                <Card className="mb-8 p-6">
                    <Label className="text-base font-semibold">Empresa ativa</Label>
                    <p className="mb-3 text-xs text-muted-foreground">Escolha uma empresa para editar ou crie uma nova.</p>
                    <Select value={selectedCompanyId} onValueChange={onSelectCompany}>
                        <SelectTrigger className="w-full max-w-md">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={SEL_NEW}>+ Nova empresa</SelectItem>
                            {companiesList.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.company_name || "Sem nome"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Card>

                <Card className="mb-8 space-y-4 p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="font-serif text-xl font-semibold">
                            {selectedCompanyId === SEL_NEW ? "Cadastrar nova empresa" : "Editar dados da empresa"}
                        </h2>
                        {activeCompany && (
                            <Button variant="destructive" size="sm" type="button" onClick={() => setDeleteOpen(true)}>
                                Remover empresa
                            </Button>
                        )}
                    </div>

                    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Remover empresa?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Isso apaga produtos e avaliações desta empresa. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    type="button"
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={deleting}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        void handleDeleteCompany();
                                    }}
                                >
                                    {deleting ? "Removendo..." : "Remover"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <div>
                        <Label>Banner da empresa (máx. 2MB)</Label>
                        {bannerPreviewUrl && (
                            <div className="mb-2 mt-2 aspect-[3/1] w-full overflow-hidden rounded-md border">
                                <img src={bannerPreviewUrl} alt="Banner" className="h-full w-full object-cover" />
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    if (f.size > 2 * 1024 * 1024) {
                                        toast.error("Banner deve ter no máximo 2MB");
                                        return;
                                    }
                                    setBannerFile(f);
                                }}
                            />
                            <Upload className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label>Responsável pela empresa *</Label>
                            <Input
                                value={form.responsible_name}
                                onChange={(e) => setForm({ ...form, responsible_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Nome da empresa *</Label>
                            <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                        </div>
                        <div>
                            <Label>Segmento *</Label>
                            <Input
                                value={form.segment}
                                onChange={(e) => setForm({ ...form, segment: e.target.value })}
                                placeholder="Ex: Restaurante, Tecnologia, Moda"
                            />
                        </div>
                        <div>
                            <Label>WhatsApp</Label>
                            <Input
                                value={form.whatsapp}
                                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                                placeholder="Ex: 11999998888 (somente números, com DDD)"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label>Link do Google Maps</Label>
                            <Input
                                value={form.maps_url}
                                onChange={(e) => setForm({ ...form, maps_url: e.target.value })}
                                placeholder="https://maps.google.com/..."
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label>Link da página (site ou rede social)</Label>
                            <Input
                                value={form.link_pagina}
                                onChange={(e) => setForm({ ...form, link_pagina: e.target.value })}
                                placeholder="https://... (opcional)"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Endereço completo *</Label>
                        <Textarea value={form.full_address} onChange={(e) => setForm({ ...form, full_address: e.target.value })} rows={2} />
                    </div>

                    <div>
                        <Label>Serviços prestados (se houver)</Label>
                        <Textarea
                            value={form.services_provided}
                            onChange={(e) => setForm({ ...form, services_provided: e.target.value })}
                            placeholder="Descreva os serviços oferecidos pela empresa (opcional)"
                            rows={4}
                        />
                    </div>

                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {selectedCompanyId === SEL_NEW ? "Cadastrar empresa" : "Salvar alterações"}
                    </Button>
                </Card>

                {activeCompany && (
                    <Card className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-serif text-xl font-semibold">Produtos desta empresa</h2>
                            <Dialog open={prodOpen} onOpenChange={setProdOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="mr-2 h-4 w-4" /> Cadastrar produto
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Novo produto</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Nome *</Label>
                                            <Input value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label>Preço (R$) *</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={prodForm.price}
                                                    onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <Label>Quantidade *</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={prodForm.quantity}
                                                    onChange={(e) => setProdForm({ ...prodForm, quantity: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Descrição</Label>
                                            <Textarea
                                                value={prodForm.description}
                                                onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                                                placeholder="Descreva detalhes do produto"
                                                rows={3}
                                            />
                                        </div>
                                        <div>
                                            <Label>Imagem do produto (máx. 2MB)</Label>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0] ?? null;
                                                    if (f && f.size > 2 * 1024 * 1024) {
                                                        toast.error(
                                                            `Imagem muito grande (${(f.size / 1024 / 1024).toFixed(2)}MB). O limite é 2MB.`,
                                                        );
                                                        e.target.value = "";
                                                        setProdFile(null);
                                                        return;
                                                    }
                                                    setProdFile(f);
                                                }}
                                            />
                                            {prodFile && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {prodFile.name} · {(prodFile.size / 1024 / 1024).toFixed(2)}MB
                                                </p>
                                            )}
                                        </div>
                                        <Button onClick={handleAddProduct} disabled={prodSaving} className="w-full">
                                            {prodSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Cadastrar
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {products.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                                {products.map((p) => (
                                    <Card key={p.id} className="overflow-hidden">
                                        <div className="aspect-square bg-muted">
                                            {p.image_url ? (
                                                <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                                    Sem imagem
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <p className="truncate font-medium">{p.name}</p>
                                            <p className="text-sm font-semibold text-primary">R$ {Number(p.price).toFixed(2)}</p>
                                            {p.description && (
                                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground">Qtd: {p.quantity ?? 1}</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="mt-2 w-full text-destructive"
                                                onClick={() => deleteProduct(p.id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Remover
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
};

export default MyCompany;
