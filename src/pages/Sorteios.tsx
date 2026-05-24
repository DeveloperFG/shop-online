import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Gift } from "lucide-react";
import { partitionSorteios, type Sorteio } from "@/lib/sorteios";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

const SorteioCard = ({ sorteio }: { sorteio: Sorteio }) => (
  <Card className="overflow-hidden">
    {sorteio.image_url && (
      <div className="aspect-[16/9] bg-muted">
        <img src={sorteio.image_url} alt={sorteio.name} className="h-full w-full object-cover" />
      </div>
    )}
    <CardHeader className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle className="text-lg">{sorteio.name}</CardTitle>
        <Badge variant="secondary">{sorteio.sponsor_name}</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-2 text-sm text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">Período de vigência:</span> {sorteio.validity_period}
      </p>
      <p>
        <span className="font-medium text-foreground">Início:</span> {formatDateTime(sorteio.start_date)}
      </p>
      <p>
        <span className="font-medium text-foreground">Término:</span> {formatDateTime(sorteio.end_date)}
      </p>
      <p>
        <span className="font-medium text-foreground">Cadastrado em:</span> {formatDateTime(sorteio.created_at)}
      </p>
    </CardContent>
  </Card>
);

const Sorteios = () => {
  const [sorteios, setSorteios] = useState<Sorteio[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sorteios")
      .select("*")
      .order("created_at", { ascending: false });
    setSorteios((data as Sorteio[]) ?? []);
    setLoading(false);
  };

  const { emAndamento, encerrados } = partitionSorteios(sorteios);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
        <h1 className="mb-2 font-serif text-3xl font-bold text-foreground">Sorteios</h1>
        <p className="mb-2 text-muted-foreground">Confira os sorteios disponíveis na plataforma</p>
        <button
          type="button"
          onClick={() => setRulesModalOpen(true)}
          className="mb-8 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Regras para participar
        </button>

        <Dialog open={rulesModalOpen} onOpenChange={setRulesModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Regras do sorteio</DialogTitle>
            </DialogHeader>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Ter uma conta ativa na plataforma.
              </li>
              <li>
                Ter no mínimo 1 produto cadastrado à venda na plataforma.
              </li>
              <li>
                Estar seguindo o perfil da empresa sorteada no Instagram.
              </li>
              <li>
                Estar seguindo o perfil FSolutions no Instagram.
              </li>
            </ol>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sorteios.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Gift className="mx-auto mb-4 h-12 w-12 opacity-40" />
            Nenhum sorteio cadastrado no momento.
          </div>
        ) : (
          <Tabs defaultValue="andamento">
            <TabsList className="mb-6">
              <TabsTrigger value="andamento">
                Sorteio em andamento ({emAndamento.length})
              </TabsTrigger>
              <TabsTrigger value="encerrados">
                Sorteios encerrados ({encerrados.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="andamento">
              {emAndamento.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Nenhum sorteio em andamento.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {emAndamento.map((s) => (
                    <SorteioCard key={s.id} sorteio={s} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="encerrados">
              {encerrados.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Nenhum sorteio encerrado.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {encerrados.map((s) => (
                    <SorteioCard key={s.id} sorteio={s} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Sorteios;
