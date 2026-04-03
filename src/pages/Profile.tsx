import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Loader2, Camera, Save } from "lucide-react";

const Profile = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [location, setLocation] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            navigate("/auth");
            return;
        }
        fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (!error && data) {
            setName(data.name);
            setEmail(data.email);
            setPhone(data.phone || "");
            setLocation(data.location || "");
            setAvatarUrl((data as any).avatar_url || null);
        }
        setLoading(false);
    };

    const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

    const handleAvatarUpload = async (file: File) => {
        if (!user) return;
        if (file.size > MAX_AVATAR_SIZE) {
            toast.error("A imagem deve ter no máximo 2MB.");
            return;
        }
        if (!file.type.startsWith("image/")) {
            toast.error("O arquivo deve ser uma imagem.");
            return;
        }
        setUploadingAvatar(true);
        try {
            const ext = file.name.split(".").pop();
            const path = `avatars/${user.id}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from("product-images")
                .upload(path, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
            const newUrl = urlData.publicUrl;

            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: newUrl } as any)
                .eq("user_id", user.id);
            if (updateError) throw updateError;

            setAvatarUrl(newUrl);
            toast.success("Foto de perfil atualizada!");
        } catch (err: any) {
            toast.error(err.message || "Erro ao enviar foto");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSave = async () => {
        if (!user || !name.trim()) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    name: name.trim(),
                    phone: phone.trim() || null,
                    location: location.trim() || null,
                })
                .eq("user_id", user.id);
            if (error) throw error;
            toast.success("Perfil atualizado com sucesso!");
        } catch (err: any) {
            toast.error(err.message || "Erro ao atualizar perfil");
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    const initials = name
        ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 pt-24 pb-16 space-y-6">
                <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        {/* Avatar Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Foto de Perfil</CardTitle>
                                <CardDescription>Clique na imagem para alterar sua foto</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center gap-6">
                                <label className="relative cursor-pointer group">
                                    <Avatar className="h-24 w-24">
                                        {avatarUrl ? (
                                            <AvatarImage src={avatarUrl} alt={name} />
                                        ) : null}
                                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {uploadingAvatar ? (
                                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                                        ) : (
                                            <Camera className="h-6 w-6 text-white" />
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploadingAvatar}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleAvatarUpload(file);
                                        }}
                                    />
                                </label>
                                <div>
                                    <p className="font-medium text-foreground">{name}</p>
                                    <p className="text-sm text-muted-foreground">{email}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Profile Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nome *</Label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                                </div>
                                <div className="space-y-2">
                                    <Label>E-mail</Label>
                                    <Input value={email} disabled className="opacity-60" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Localização</Label>
                                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Cidade, Estado" />
                                </div>
                                <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
                                    <Save className="h-4 w-4 mr-1" />
                                    {saving ? "Salvando..." : "Salvar Alterações"}
                                </Button>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
};

export default Profile;
