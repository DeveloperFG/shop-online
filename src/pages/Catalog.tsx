import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, Clock, MapPin, Star, Loader2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_CATEGORIES } from "@/constants/categories";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Profile = Tables<"profiles">;
type ProductWithSeller = Product & { seller?: Profile; category?: string | null };

const Catalog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductWithSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchProducts = async () => {
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!prods?.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(prods.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      // 👉 COLOCA O LOG AQUI 👇
      console.log("profiles vindo do supabase:", profiles);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
      setProducts(prods.map((p) => ({ ...p, seller: profileMap.get(p.user_id) })));
      setLoading(false);
    };
    fetchProducts();
  }, [navigate, user]);

  const sellerNames = useMemo(() => {
    const names = new Set<string>();
    products.forEach((p) => {
      if (p.seller?.name) names.add(p.seller.name);
    });
    return Array.from(names).sort();
  }, [products]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if ((p as any).category) cats.add((p as any).category);
    });
    return Array.from(cats).sort();
  }, [products]);

  console.log('categorias existentes', availableCategories)
  console.log("nomes de usuarios", sellerNames)
  console.log("produtos", products)

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || (p as any).category === categoryFilter;
      const matchesSeller = !sellerFilter || p.seller?.name === sellerFilter;
      return matchesSearch && matchesCategory && matchesSeller;
    });
  }, [products, search, categoryFilter, sellerFilter]);

  const hasActiveFilters = categoryFilter || sellerFilter;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Catálogo</h1>
          <p className="mt-2 text-muted-foreground">Produtos publicados para venda</p>
        </div>

        {/* Search & Filters */}
        <div className="mb-8 space-y-3">
          <div className="relative mx-auto max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                {sellerNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCategoryFilter(""); setSellerFilter(""); }}
                className="h-9 text-sm"
              >
                <X className="h-3 w-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {filtered.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="aspect-square overflow-hidden bg-muted flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain p-2"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground/40" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
                    <Badge variant="secondary" className="shrink-0">
                      R$ {Number(product.price).toFixed(2)}
                    </Badge>
                  </div>
                  {(product as any).category && (
                    <Badge variant="outline" className="mb-2 text-xs">{(product as any).category}</Badge>
                  )}
                  {product.description && (
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {product.usage_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {product.usage_time}
                      </span>
                    )}
                    {product.quantity != null && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> {product.quantity} un.
                      </span>
                    )}
                  </div>
                  {product.seller && (
                    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{product.seller.name}</span>
                      {product.seller.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" /> {product.seller.location}
                        </span>
                      )}
                      {product.seller.reputation_score != null && Number(product.seller.reputation_score) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          {Number(product.seller.reputation_score).toFixed(1)}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;
