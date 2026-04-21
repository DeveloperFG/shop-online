import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";

interface CompanyItem {
    id: string;
    company_name: string;
    segment: string;
    banner_url: string | null;
}

const Companies = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<CompanyItem[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            navigate("/auth");
            return;
        }
        void load();
    }, [loading, user]);

    const load = async () => {
        setFetching(true);
        const { data } = await supabase
            .from("companies")
            .select("id,company_name,segment,banner_url")
            .eq("published", true)
            .order("created_at", { ascending: false });
        setCompanies((data as CompanyItem[]) ?? []);
        setFetching(false);
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Empresas</h1>
                <p className="text-muted-foreground mb-8">Conheça as empresas da nossa plataforma</p>

                {fetching ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : companies.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <Building2 className="mx-auto mb-4 h-12 w-12 opacity-40" />
                        Nenhuma empresa publicada ainda.
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {companies.map((c) => (
                            <Link key={c.id} to={`/empresa/${c.id}`}>
                                <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                                    <div className="aspect-[3/1] bg-muted">
                                        {c.banner_url ? (
                                            <img src={c.banner_url} alt={c.company_name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <Building2 className="h-10 w-10 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-serif text-lg font-semibold">{c.company_name}</h3>
                                        <p className="text-sm text-muted-foreground">{c.segment}</p>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Companies;
