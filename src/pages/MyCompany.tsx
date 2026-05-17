import { useEffect, useState } from "react";
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

interface Company {
    id: string;
    user_id: string;
    responsible_name: string;
    company_name: string;
    banner_url: string | null;
    segment: string;
    full_address: string;
    maps_url: string | null;
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

const MyCompany = () => {
    const { user, loading, subscription } = useAuth();
    const navigate = useNavigate();

    const [company, setCompany] = useState<Company | null>(null);
    const [products, setProducts] = useState<CompanyProduct[]>([]);
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bannerFile, setBannerFile] = useState<File | null>(null);

    // form state
    const [form, setForm] = useState({
        responsible_name: "",
        company_name: "",
        segment: "",
        full_address: "",
        maps_url: "",
        whatsapp: "",
    });

    // product dialog
    const [prodOpen, setProdOpen] = useState(false);
    const [prodSaving, setProdSaving] = useState(false);
    const [prodForm, setProdForm] = useState({ name: "", price: "", description: "", quantity: "1" });
    const [prodFile, setProdFile] = useState<File | null>(null);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            navigate("/auth");
            return;
        }
        if (subscription.plan_tier !== "enterprise") {
            toast.error("Plano Premium Enterprise necessário");
            navigate("/pricing");
            return;
        }
        void load();
    }, [loading, user, subscription.plan_tier]);

    const load = async () => {
        setFetching(true);
        const { data: c } = await supabase
            .from("companies")
            .select("*")
            .eq("user_id", user!.id)
            .maybeSingle();
        if (c) {
            setCompany(c as Company);
            setForm({
                responsible_name: c.responsible_name,
                company_name: c.company_name,
                segment: c.segment,
                full_address: c.full_address,
                maps_url: c.maps_url ?? "",
                whatsapp: (c as any).whatsapp ?? "",
            });
            const { data: p } = await supabase
                .from("company_products")
                .select("id,name,image_url,price,description,quantity")
                .eq("company_id", c.id)
                .order("created_at", { ascending: false });
            setProducts((p as CompanyProduct[]) ?? []);
        }
        setFetching(false);
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
            let banner_url = company?.banner_url ?? null;
            if (bannerFile) banner_url = await uploadBanner(bannerFile);
            if (!banner_url && !company) {
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
                whatsapp: form.whatsapp || null,
            };

            if (company) {
                const { error } = await supabase
                    .from("companies")
                    .update(payload)
                    .eq("id", company.id);
                if (error) throw error;
                toast.success("Empresa atualizada");
            } else {
                const { error } = await supabase.from("companies").insert({
                    user_id: user!.id,
                    ...payload,
                });
                if (error) throw error;
                toast.success("Empresa cadastrada");
            }
            setBannerFile(null);
            await load();
        } catch (e: any) {
            toast.error(e.message ?? "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const togglePublish = async () => {
        if (!company) return;
        const { error } = await supabase
            .from("companies")
            .update({ published: !company.published })
            .eq("id", company.id);
        if (error) return toast.error(error.message);
        toast.success(company.published ? "Empresa despublicada" : "Empresa publicada");
        await load();
    };

    const handleAddProduct = async () => {
        if (!company) return;
        if (!prodForm.name || !prodForm.price) {
            toast.error("Preencha nome e preço");
            return;
        }
        setProdSaving(true);
        try {
            let image_url: string | null = null;
            if (prodFile) image_url = await uploadProductImage(prodFile);
            const { error } = await supabase.from("company_products").insert({
                company_id: company.id,
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
            await load();
        } catch (e: any) {
            toast.error(e.message ?? "Erro");
        } finally {
            setProdSaving(false);
        }
    };

    const deleteProduct = async (id: string) => {
        const { error } = await supabase.from("company_products").delete().eq("id", id);
        if (error) return toast.error(error.message);
        toast.success("Produto removido");
        await load();
    };

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
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="font-serif text-3xl font-bold text-foreground">Minha Empresa</h1>
                    {company && (
                        <div className="flex items-center gap-2">
                            <Badge variant={company.published ? "default" : "secondary"}>
                                {company.published ? "Publicada" : "Rascunho"}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={togglePublish}>
                                {company.published ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                {company.published ? "Despublicar" : "Publicar"}
                            </Button>
                        </div>
                    )}
                </div>

                <Card className="p-6 mb-8 space-y-4">
                    <h2 className="font-serif text-xl font-semibold">
                        {company ? "Editar dados da empresa" : "Dados da empresa"}
                    </h2>

                    <div>
                        <Label>Banner da empresa (máx. 2MB)</Label>
                        {(bannerFile || company?.banner_url) && (
                            <div className="mt-2 mb-2 aspect-[3/1] w-full overflow-hidden rounded-md border">
                                <img
                                    src={bannerFile ? URL.createObjectURL(bannerFile) : company!.banner_url!}
                                    alt="Banner"
                                    className="h-full w-full object-cover"
                                />
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
                            <Input
                                value={form.company_name}
                                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                            />
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
                    </div>

                    <div>
                        <Label>Endereço completo *</Label>
                        <Textarea
                            value={form.full_address}
                            onChange={(e) => setForm({ ...form, full_address: e.target.value })}
                            rows={2}
                        />
                    </div>

                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {company ? "Salvar alterações" : "Cadastrar empresa"}
                    </Button>
                </Card>

                {company && (
                    <Card className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-serif text-xl font-semibold">Meus produtos</h2>
                            <Dialog open={prodOpen} onOpenChange={setProdOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="mr-2 h-4 w-4" /> Cadastrar produto
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Novo produtssso</DialogTitle>
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
                                                            `Imagem muito grande (${(f.size / 1024 / 1024).toFixed(2)}MB). O limite é 2MB.`
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
                                                <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                                                    Sem imagem
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <p className="font-medium truncate">{p.name}</p>
                                            <p className="text-sm text-primary font-semibold">
                                                R$ {Number(p.price).toFixed(2)}
                                            </p>
                                            {p.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
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