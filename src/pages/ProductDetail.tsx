import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

import { FaWhatsapp } from 'react-icons/fa';

import {
  ArrowLeft,
  Clock,
  Package,
  MapPin,
  Star,
  Loader2,
  Mail,
  Phone,
  User,
  MessageCircle,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import ReviewSection from "@/components/ReviewSection";
import ChatDialog from "@/components/ChatDialog";

type Product = Tables<"products">;
type Profile = Tables<"profiles">;


function buildWhatsAppUrl(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);


  const WHATSAPP_DEFAULT_MESSAGE = `Olá, gostaria de saber mais sobre o item: ${product?.name}`;



  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/");
      return;
    }
    if (!id) return;

    const fetch = async () => {
      const { data: prod } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (!prod) {
        setLoading(false);
        return;
      }
      setProduct(prod);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", prod.user_id)
        .single();

      setSeller(profile ?? null);
      setLoading(false);
    };
    fetch();
  }, [id, user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 pt-24 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">Produto não encontrado</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/catalog")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao catálogo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 pt-20 pb-16">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate("/catalog")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>

        {/* Product image */}
        <div className="overflow-hidden rounded-xl bg-muted">
          <div className="flex aspect-square items-center justify-center sm:aspect-[4/3]">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="block max-h-full max-w-full object-contain"
              />
            ) : (
              <Package className="h-16 w-16 text-muted-foreground/40" />
            )}
          </div>
        </div>

        {/* Product info */}
        <div className="mt-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
            <Badge className="shrink-0 text-base px-3 py-1">
              R$ {Number(product.price).toFixed(2)}
            </Badge>
          </div>

          {product.description && (
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {product.usage_time && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Tempo de uso: {product.usage_time}
              </span>
            )}
            {product.quantity != null && (
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4" /> Quantidade: {product.quantity} un.
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Publicado em {new Date(product.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* Seller card */}
        {seller && (
          <>
            <Separator className="my-6" />
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Vendedor
                </h2>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                    {seller.avatar_url ? (
                      <img
                        src={seller.avatar_url}
                        alt={seller.name ?? "Foto do vendedor"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-semibold text-foreground">{seller.name}</p>

                    {seller.reputation_score != null && Number(seller.reputation_score) > 0 && (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        {Number(seller.reputation_score).toFixed(1)}
                      </span>
                    )}

                    {seller.location && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" /> {seller.location}
                      </p>
                    )}
                    {seller.email && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" /> {seller.email}
                      </p>
                    )}
                    {seller.phone && (
                      <a
                        href={buildWhatsAppUrl(seller.phone, WHATSAPP_DEFAULT_MESSAGE)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        <FaWhatsapp className="h-4 w-4 shrink-0" /> {seller.phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Chat button - only if not own product */}
                {user && product.user_id !== user.id && (
                  <Button
                    className="mt-4 w-full"
                    onClick={() => setChatOpen(true)}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> Enviar mensagem
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Reviews */}
        <Separator className="my-6" />
        <ReviewSection sellerId={product.user_id} productId={product.id} />

        {/* Chat Dialog */}
        {seller && product && user && product.user_id !== user.id && (
          <ChatDialog
            open={chatOpen}
            onOpenChange={setChatOpen}
            conversationId={null}
            sellerId={product.user_id}
            sellerName={seller.name}
            productId={product.id}
            productName={product.name}
          />
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
