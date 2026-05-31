import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Loader2, Handshake } from "lucide-react";

interface ParceiroItem {
    id: string;
    name: string;
    description: string | null;
    link: string | null;
    image_url: string | null;
}

const Parceiros = () => {
    const [parceiros, setParceiros] = useState<ParceiroItem[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        void load();
    }, []);

    const load = async () => {
        setFetching(true);
        const { data } = await supabase
            .from("parceiros")
            .select("id,name,description,link,image_url")
            .order("created_at", { ascending: false });
        setParceiros((data as ParceiroItem[]) ?? []);
        setFetching(false);
    };

    const CardInner = ({ p }: { p: ParceiroItem }) => (
        <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
            <div className="aspect-[3/1] bg-muted">
                {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <Handshake className="h-10 w-10 text-muted-foreground" />
                    </div>
                )}
            </div>
            <div className="p-4">
                <h3 className="font-serif text-lg font-semibold">{p.name}</h3>
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
            </div>
        </Card>
    );

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Parceiros</h1>
                <p className="text-muted-foreground mb-8">Clique para visitar o perfil do parceiro</p>

                {fetching ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : parceiros.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <Handshake className="mx-auto mb-4 h-12 w-12 opacity-40" />
                        Nenhum parceiro cadastrado ainda.
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {parceiros.map((p) =>
                            p.link ? (
                                <a key={p.id} href={p.link} target="_blank" rel="noopener noreferrer">
                                    <CardInner p={p} />
                                </a>
                            ) : (
                                <CardInner key={p.id} p={p} />
                            ),
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Parceiros;
