import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FaWhatsapp } from 'react-icons/fa';
import { Loader2, MapPin, Star, Building2, MessageCircle, Link2, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
    link_pagina: string | null;
    services_provided: string | null;
    whatsapp: string | null;
}

interface Product {
    id: string;
    name: string;
    image_url: string | null;
    price: number;
    description: string | null;
    quantity: number;
}

interface Review {
    id: string;
    reviewer_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
}

const CompanyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [company, setCompany] = useState<Company | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [fetching, setFetching] = useState(true);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    // Open modal from ?produto=<id> deep link once products load
    useEffect(() => {
        const pid = searchParams.get("produto");
        if (!pid || products.length === 0) return;
        if (selectedProduct?.id === pid) return;
        const found = products.find((p) => p.id === pid);
        if (found) setSelectedProduct(found);
    }, [products, searchParams]);

    const openProduct = (p: Product) => {
        setSelectedProduct(p);
        const next = new URLSearchParams(searchParams);
        next.set("produto", p.id);
        setSearchParams(next, { replace: false });
    };

    const closeProduct = () => {
        setSelectedProduct(null);
        setLinkCopied(false);
        const next = new URLSearchParams(searchParams);
        next.delete("produto");
        setSearchParams(next, { replace: true });
    };

    const copyProductLink = async () => {
        if (!selectedProduct) return;
        const url = `${window.location.origin}/empresa/${company?.id}?produto=${selectedProduct.id}`;
        try {
            await navigator.clipboard.writeText(url);
            setLinkCopied(true);
            toast.success("Link copiado!");
            setTimeout(() => setLinkCopied(false), 2000);
        } catch {
            toast.error("Não foi possível copiar o link");
        }
    };

    useEffect(() => {
        if (loading) return;
        if (!user) {
            navigate("/auth");
            return;
        }
        void load();
    }, [id, loading, user]);

    const load = async () => {
        setFetching(true);
        const { data: c } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
        if (!c) {
            setFetching(false);
            return;
        }
        setCompany(c as Company);
        const [{ data: p }, { data: r }] = await Promise.all([
            supabase
                .from("company_products")
                .select("id,name,image_url,price,description,quantity")
                .eq("company_id", id),
            supabase
                .from("company_reviews")
                .select("id,reviewer_id,rating,comment,created_at")
                .eq("company_id", id)
                .order("created_at", { ascending: false }),
        ]);
        setProducts((p as Product[]) ?? []);
        setReviews((r as Review[]) ?? []);
        setFetching(false);
    };

    const submitReview = async () => {
        if (!company) return;
        setSubmitting(true);
        const { error } = await supabase.from("company_reviews").insert({
            company_id: company.id,
            reviewer_id: user!.id,
            rating,
            comment: comment || null,
        });
        setSubmitting(false);
        if (error) return toast.error(error.message);
        toast.success("Avaliação enviada");
        setComment("");
        setRating(5);
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

    if (!company) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="text-center pt-32 text-muted-foreground">Empresa não encontrada</div>
            </div>
        );
    }

    const avgRating =
        reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const isOwner = user?.id === company.user_id;

    const whatsappDigits = (company.whatsapp ?? "").replace(/\D/g, "");
    const whatsappLink = whatsappDigits
        ? `https://wa.me/${whatsappDigits.startsWith("55") ? whatsappDigits : `55${whatsappDigits}`}?text=${encodeURIComponent(
            `Olá! Vi a empresa ${company.company_name} e gostaria de mais informações.`
        )}`
        : null;

    const pageLinkRaw = (company.link_pagina ?? "").trim();
    const pageLinkHref =
        pageLinkRaw && !/^javascript:/i.test(pageLinkRaw)
            ? /^https?:\/\//i.test(pageLinkRaw)
                ? pageLinkRaw
                : `https://${pageLinkRaw.replace(/^\/+/, "")}`
            : null;

    /** Exibe na página pública apenas quando há descrição (valor truthy após trim). */
    const servicesProvidedText = company.services_provided?.trim() ?? "";
    const hasServicesProvided = servicesProvidedText.length > 0;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-16">
                <div className="aspect-[3/1] w-full bg-muted max-h-[400px] overflow-hidden">
                    {company.banner_url ? (
                        <img src={company.banner_url} alt={company.company_name} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <Building2 className="h-16 w-16 text-muted-foreground" />
                        </div>
                    )}
                </div>

                <div className="mx-auto max-w-5xl px-4 py-8">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 className="font-serif text-3xl font-bold">{company.company_name}</h1>
                            <p className="text-muted-foreground">{company.segment}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Responsável: {company.responsible_name}
                            </p>
                        </div>
                        {reviews.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            className={`h-5 w-5 ${s <= Math.round(avgRating) ? "fill-primary text-primary" : "text-muted-foreground"
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {avgRating.toFixed(1)} ({reviews.length})
                                </span>
                            </div>
                        )}
                    </div>

                    <Card className="p-4 mb-8">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-primary mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm">{company.full_address}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {company.maps_url && (
                                        <a href={company.maps_url} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm">
                                                <MapPin className="mr-2 h-4 w-4" />
                                                Abrir no Google Maps
                                            </Button>
                                        </a>
                                    )}
                                    {pageLinkHref && (
                                        <a href={pageLinkHref} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm">
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Visitar página
                                            </Button>
                                        </a>
                                    )}
                                    {whatsappLink && (
                                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                            <Button size="sm" className="bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white">
                                                <FaWhatsapp className="h-4 w-4 shrink-0" /> Mandar mensagem no WhatsApp
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {hasServicesProvided && (
                        <Card className="p-4 mb-8">
                            <h2 className="font-serif text-xl font-semibold mb-2">Serviços prestados</h2>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{servicesProvidedText}</p>
                        </Card>
                    )}

                    <h2 className="font-serif text-2xl font-semibold mb-4">Produtos</h2>
                    {products.length === 0 ? (
                        <p className="text-muted-foreground mb-8">Nenhum produto cadastrado.</p>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-8">
                            {products.map((p) => (
                                <Card
                                    key={p.id}
                                    className="overflow-hidden cursor-pointer transition-shadow hover:shadow-lg"
                                    onClick={() => openProduct(p)}
                                >
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
                                        <p className="font-medium truncate">{p.name}</p>
                                        <p className="text-primary font-semibold">R$ {Number(p.price).toFixed(2)}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    <h2 className="font-serif text-2xl font-semibold mb-4">Avaliações</h2>

                    {isOwner ? (
                        <Card className="p-4 mb-6 bg-muted/50">
                            <p className="text-sm text-muted-foreground">
                                Você é o dono desta empresa e não pode avaliá-la. As avaliações deixadas por visitantes aparecerão abaixo.
                            </p>
                        </Card>
                    ) : (
                        <Card className="p-4 mb-6">
                            <p className="text-sm font-medium mb-2">Deixe sua avaliação</p>
                            <div className="flex gap-1 mb-3">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button key={s} onClick={() => setRating(s)} type="button">
                                        <Star
                                            className={`h-6 w-6 ${s <= rating ? "fill-primary text-primary" : "text-muted-foreground"
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <Textarea
                                placeholder="Comentário (opcional)"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                                className="mb-3"
                            />
                            <Button onClick={submitReview} disabled={submitting} size="sm">
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar avaliação
                            </Button>
                        </Card>
                    )}

                    {reviews.length === 0 ? (
                        <p className="text-muted-foreground">Nenhuma avaliação ainda.</p>
                    ) : (
                        <div className="space-y-3">
                            {reviews.map((r) => (
                                <Card key={r.id} className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`h-4 w-4 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"
                                                    }`}
                                            />
                                        ))}
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(r.created_at).toLocaleDateString("pt-BR")}
                                        </span>
                                    </div>
                                    {r.comment && <p className="text-sm">{r.comment}</p>}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={!!selectedProduct} onOpenChange={(o) => !o && closeProduct()}>
                <DialogContent className="max-w-lg">
                    {selectedProduct && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="font-serif text-2xl">{selectedProduct.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="aspect-square bg-muted rounded-md overflow-hidden">
                                    {selectedProduct.image_url ? (
                                        <img
                                            src={selectedProduct.image_url}
                                            alt={selectedProduct.name}
                                            className="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                                            Sem imagem
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-2xl font-semibold text-primary">
                                        R$ {Number(selectedProduct.price).toFixed(2)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Quantidade: {selectedProduct.quantity ?? 1}
                                    </p>
                                </div>
                                {selectedProduct.description ? (
                                    <div>
                                        <p className="text-sm font-medium mb-1">Descrição</p>
                                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                                            {selectedProduct.description}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Sem descrição cadastrada.</p>
                                )}
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={copyProductLink}
                                >
                                    {linkCopied ? (
                                        <Check className="mr-2 h-4 w-4 text-primary" />
                                    ) : (
                                        <Link2 className="mr-2 h-4 w-4" />
                                    )}
                                    {linkCopied ? "Link copiado!" : "Copiar link do produto"}
                                </Button>
                                {whatsappLink && (
                                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block">
                                        <Button className="w-full bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white">
                                            <MessageCircle className="mr-2 h-4 w-4" />
                                            Falar no WhatsApp sobre este produto
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CompanyDetail;