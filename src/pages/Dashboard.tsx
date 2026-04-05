import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import TermsModal from "@/components/TermsModal";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import {
  Crown, Package, Plus, Pencil, Trash2, CreditCard,
  RefreshCw, ShieldCheck, Loader2, Eye, EyeOff
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_CATEGORIES } from "@/constants/categories";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

const FREE_PRODUCT_LIMIT = 3;

const Dashboard = () => {
  const { user, loading: authLoading, subscription, checkingSubscription, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [showTerms, setShowTerms] = useState(false);
  const [usuario, setUsuario] = useState<unknown>(null);

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [usageTime, setUsageTime] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const TERMS_VERSION = "v1.0";


  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/");
      return;
    }
    fetchProducts();
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success("Assinatura realizada com sucesso!");
      refreshSubscription();
    } else if (checkout === "cancel") {
      toast.info("Checkout cancelado.");
    }
  }, [user, authLoading, navigate, searchParams]);


  useEffect(() => {
    const loadUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      setUsuario(currentUser);

      if (!currentUser) return;

      // verifica se já aceitou
      const { data } = await supabase
        .from("user_terms_acceptance")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("terms_version", TERMS_VERSION)
        .maybeSingle();

      if (!data) {
        // delay de 3 segundos
        setTimeout(() => {
          setShowTerms(true);
        }, 3000);
      }
    };

    loadUser();
  }, []);


  const fetchProducts = async () => {
    if (!user) return;
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setProducts(data || []);
    setLoadingProducts(false);
  };

  const canAddProduct = subscription.subscribed || products.length < FREE_PRODUCT_LIMIT;

  const openNew = () => {
    if (!canAddProduct) {
      toast.error("Limite de produtos atingido. Faça upgrade para Premium!");
      return;
    }
    setEditing(null);
    setName(""); setPrice(""); setDescription(""); setUsageTime(""); setQuantity("1"); setCategory(""); setImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setPrice(String(p.price));
    setDescription(p.description || "");
    setUsageTime(p.usage_time || "");
    setQuantity(String(p.quantity ?? 1));
    setCategory((p as any).category || "");
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {


    if (!user || !name.trim() || !price) return;
    setSaving(true);
    try {
      let imageUrl = editing?.image_url || null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, imageFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const productData: any = {
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim() || null,
        usage_time: usageTime.trim() || null,
        quantity: parseInt(quantity) || 1,
        category: category || null,
        image_url: imageUrl,
        user_id: user.id,
      };

      if (editing) {
        const { error } = await supabase.from("products").update(productData).eq("id", editing.id);
        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        // console.log("SESSION:", sessionData)
        const { error } = await supabase.from("products").insert({ ...productData, status: "draft" });
        if (error) throw error;
        toast.success("Produto cadastrado! Publique-o para aparecer no catálogo.");
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      // toast.error(err.message || "Erro ao salvar produto");
      console.log("FULL ERROR:", err)
      toast.error(err.message || "Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (product: Product) => {
    const newStatus = product.status === "active" ? "draft" : "active";
    const { error } = await supabase.from("products").update({ status: newStatus }).eq("id", product.id);
    if (error) {
      toast.error("Erro ao alterar status");
      return;
    }
    toast.success(newStatus === "active" ? "Produto publicado no catálogo!" : "Produto retirado do catálogo.");
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Produto removido!");
      setDeleteId(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover produto");
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center pt-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  if (!user) return null;

  const publishedCount = products.filter((p) => p.status === "active").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {showTerms && user && (
        <TermsModal
          user={user}
          onAccept={() => setShowTerms(false)}
        />
      )}
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16 space-y-8">
        {/* Subscription Status */}
        <Card className={subscription.subscribed ? "border-primary ring-1 ring-primary/20" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {subscription.subscribed ? (
                    <><ShieldCheck className="h-5 w-5 text-primary" /> Plano Premium</>
                  ) : (
                    <><Package className="h-5 w-5 text-muted-foreground" /> Plano Grátis</>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {subscription.subscribed
                    ? `Ativo até ${new Date(subscription.subscription_end!).toLocaleDateString("pt-BR")}`
                    : `${products.length}/${FREE_PRODUCT_LIMIT} produtos · ${publishedCount} publicado(s)`
                  }
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={refreshSubscription} disabled={checkingSubscription}>
                  <RefreshCw className={`h-4 w-4 ${checkingSubscription ? "animate-spin" : ""}`} />
                </Button>
                {subscription.subscribed ? (
                  <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
                    <CreditCard className="h-4 w-4 mr-1" />
                    {portalLoading ? "Abrindo..." : "Gerenciar"}
                  </Button>
                ) : (
                  <Button size="sm" asChild>
                    <Link to="/pricing">
                      <Crown className="h-4 w-4 mr-1" /> Upgrade
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {!subscription.subscribed && (
            <CardContent className="pt-0">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(products.length / FREE_PRODUCT_LIMIT) * 100}%` }}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Products Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Meus Produtos</h2>
            <Button onClick={openNew} disabled={!canAddProduct} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo Produto
            </Button>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum produto cadastrado ainda.</p>
                <Button onClick={openNew} className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Cadastrar primeiro produto
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <Card key={p.id} className={`min-w-0 overflow-hidden ${p.status !== "active" ? "opacity-70" : ""}`}>
                  <div className="relative min-w-0">
                    <div className="relative aspect-video w-full min-h-0 overflow-hidden bg-muted">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="absolute inset-0 box-border h-full w-full object-contain object-center p-2"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={p.status === "active" ? "default" : "secondary"}
                      className="absolute top-2 left-2"
                    >
                      {p.status === "active" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground truncate">{p.name}</h3>
                        <p className="text-lg font-bold text-primary">
                          R$ {Number(p.price).toFixed(2).replace(".", ",")}
                        </p>
                        {p.usage_time && (
                          <p className="text-xs text-muted-foreground mt-1">Uso: {p.usage_time}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Qtd: {p.quantity ?? 1}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant={p.status === "active" ? "outline" : "default"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => togglePublish(p)}
                          title={p.status === "active" ? "Retirar do catálogo" : "Publicar no catálogo"}
                        >
                          {p.status === "active" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize as informações do produto." : "Preencha os dados. O produto será criado como rascunho — publique-o depois."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tempo de uso</Label>
              <Input value={usageTime} onChange={(e) => setUsageTime(e.target.value)} placeholder="Ex: 6 meses, 1 ano" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o produto..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Imagem</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !price}>
              {saving ? "Salvando..." : editing ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover produto</DialogTitle>
            <DialogDescription>Tem certeza que deseja remover este produto? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
