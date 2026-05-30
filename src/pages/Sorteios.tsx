import { useEffect, useState, useRef, useCallback } from "react";
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

const CONFETTI_COLORS = ["#7F77DD", "#1D9E75", "#D85A30", "#378ADD", "#D4537E", "#EF9F27"];

const confettiPieces = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${5 + (i * 2.6) % 90}%`,
  width: `${6 + (i % 4) * 2}px`,
  height: `${6 + (i % 3) * 2}px`,
  duration: `${1.2 + (i % 5) * 0.28}s`,
  delay: `${(i % 8) * 0.07}s`,
}));

const SponsorBadge = ({ sorteio }: { sorteio: Sorteio }) => {
  const badge = <Badge variant="secondary">{sorteio.sponsor_name}</Badge>;

  if (!sorteio.link_pagina) {
    return badge;
  }

  return (
    <a
      href={sorteio.link_pagina}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex cursor-pointer underline-offset-2 hover:underline"
      title={`Visitar página de ${sorteio.sponsor_name}`}
    >
      {badge}
    </a>
  );
};

const Sorteios = () => {
  const [sorteios, setSorteios] = useState<Sorteio[]>([]);
  const [winnersBySorteio, setWinnersBySorteio] = useState<Record<string, string>>({});
  const [selectedWinnerName, setSelectedWinnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [winnerCountdown, setWinnerCountdown] = useState<number | null>(null);
  const [showWinnerName, setShowWinnerName] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [sorteiosRes, ganhadoresRes] = await Promise.all([
      supabase.from("sorteios").select("*").order("created_at", { ascending: false }),
      supabase.from("ganhadores").select("name, sorteio_id, created_at").order("created_at", { ascending: false }),
    ]);
    setSorteios((sorteiosRes.data as Sorteio[]) ?? []);

    const winners: Record<string, string> = {};
    for (const g of ganhadoresRes.data ?? []) {
      if (g.sorteio_id && !winners[g.sorteio_id]) {
        winners[g.sorteio_id] = g.name;
      }
    }
    setWinnersBySorteio(winners);
    setLoading(false);
  };

  const startWinnerAnimation = useCallback(() => {
    setShowWinnerName(false);
    setWinnerCountdown(3);

    let count = 3;
    countdownRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setWinnerCountdown(count);
      } else {
        clearInterval(countdownRef.current!);
        setWinnerCountdown(null);
        setShowWinnerName(true);
      }
    }, 900);
  }, []);

  const handleWinnerOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setWinnerModalOpen(false);
      clearInterval(countdownRef.current!);
      setWinnerCountdown(null);
      setShowWinnerName(false);
      setSelectedWinnerName(null);
    }
  }, []);

  const openWinnerModal = useCallback(
    (sorteio: Sorteio) => {
      const winner = winnersBySorteio[sorteio.id] ?? null;
      setSelectedWinnerName(winner);
      setWinnerModalOpen(true);
      if (winner) {
        startWinnerAnimation();
      } else {
        clearInterval(countdownRef.current!);
        setWinnerCountdown(null);
        setShowWinnerName(false);
      }
    },
    [winnersBySorteio, startWinnerAnimation]
  );

  const SorteioCard = ({ sorteio }: { sorteio: Sorteio }) => (
    <Card className="overflow-hidden">
      {sorteio.image_url && (
        <div className="aspect-[16/9] bg-muted">
          <img
            src={sorteio.image_url}
            alt={sorteio.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-lg">{sorteio.name}</CardTitle>
          <SponsorBadge sorteio={sorteio} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Início:</span>{" "}
          {formatDateTime(sorteio.start_date)}
        </p>
        <p>
          <span className="font-medium text-foreground">Término:</span>{" "}
          {formatDateTime(sorteio.end_date)}
        </p>
        <p>
          <span className="font-medium text-foreground">Observações:</span>{" "}
          {sorteio.validity_period}
        </p>
        <p>
          <span className="font-medium text-foreground">Cadastrado em:</span>{" "}
          {formatDateTime(sorteio.created_at)}
        </p>

        <button
          onClick={() => openWinnerModal(sorteio)}
          className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Ver ganhador
        </button>
      </CardContent>
    </Card>
  );

  const { emAndamento, encerrados } = partitionSorteios(sorteios);

  return (
    <>
      <style>{`
        @keyframes winnerCountdownPop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes winnerSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes winnerNamePop {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes winnerTrophyBounce {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          70% { transform: translateY(-4px); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(720deg); opacity: 0; }
        }
        .winner-countdown {
          animation: winnerCountdownPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .winner-slide-up {
          animation: winnerSlideUp 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .winner-name-pop {
          animation: winnerNamePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .winner-trophy {
          animation: winnerTrophyBounce 1.2s ease-in-out infinite;
        }
        .confetti-piece {
          animation: confettiFall linear forwards;
        }
      `}</style>

      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
          <h1 className="mb-2 font-serif text-3xl font-bold text-foreground">
            Sorteios
          </h1>
          <p className="mb-2 text-muted-foreground">
            Confira os sorteios disponíveis na plataforma
          </p>
          <button
            type="button"
            onClick={() => setRulesModalOpen(true)}
            className="mb-8 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Regras do sorteio
          </button>

          {/* Modal de regras */}
          <Dialog open={rulesModalOpen} onOpenChange={setRulesModalOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Como participar</DialogTitle>
              </DialogHeader>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Ter uma conta ativa na plataforma.</li>
                <li>
                  Ter no mínimo 1 produto cadastrado à venda na plataforma.
                </li>
                <li>
                  Estar seguindo o perfil da empresa responsável pelo sorteio no
                  Instagram.
                </li>
                <li>
                  Estar seguindo o perfil aquiShopping no Instagram.
                </li>
              </ol>

              <DialogHeader>
                <DialogTitle>Como acontece o sorteio</DialogTitle>
              </DialogHeader>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Apenas 1 ganhador por sorteio.</li>
                <li>
                  Da aba Sorteio em andamento, e sorteado apenas 1 item.
                </li>
                <li>
                  A plataforma irá sortear o item e o  ganhador de forma aleatória.
                </li>
                <li>
                  No final da data de termino do sorteio, o ganhador será revelado.
                </li>
                <li>
                  Entraremos em contato via e-mail com o ganhador para receber o prêmio.
                </li>
              </ol>
            </DialogContent>
          </Dialog>

          {/* Modal do ganhador */}
          <Dialog open={winnerModalOpen} onOpenChange={handleWinnerOpenChange}>
            <DialogContent className="max-w-sm overflow-hidden">
              <DialogHeader>
                <DialogTitle>Ganhador do sorteio</DialogTitle>
              </DialogHeader>

              <div className="relative flex min-h-[180px] flex-col items-center justify-center py-6">
                {/* Confetes */}
                {showWinnerName && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    {confettiPieces.map((piece) => (
                      <div
                        key={piece.id}
                        className="confetti-piece absolute rounded-sm"
                        style={{
                          width: piece.width,
                          height: piece.height,
                          background: piece.color,
                          left: piece.left,
                          top: "-10px",
                          animationDuration: piece.duration,
                          animationDelay: piece.delay,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Sem ganhador ainda */}
                {!selectedWinnerName && (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="text-5xl opacity-40">🎁</span>
                    <p className="text-sm text-muted-foreground">
                      O ganhador ainda não foi sorteado. Aguarde a data de término do sorteio.
                    </p>
                  </div>
                )}

                {/* Countdown */}
                {selectedWinnerName && winnerCountdown !== null && (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      Revelando o ganhador...
                    </p>
                    <span
                      key={winnerCountdown}
                      className="winner-countdown text-8xl font-medium text-foreground"
                    >
                      {winnerCountdown}
                    </span>
                  </div>
                )}

                {/* Nome do ganhador */}
                {selectedWinnerName && showWinnerName && (
                  <div className="winner-slide-up flex flex-col items-center gap-1 text-center">
                    <span className="winner-trophy text-5xl">🏆</span>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Ganhador do sorteio
                    </p>
                    <p className="winner-name-pop text-xl font-medium text-foreground">
                      {selectedWinnerName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Parabéns! Entre em contato para receber o prêmio.
                    </p>
                  </div>
                )}
              </div>
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
                  <p className="py-8 text-center text-muted-foreground">
                    Nenhum sorteio em andamento.
                  </p>
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
                  <p className="py-8 text-center text-muted-foreground">
                    Nenhum sorteio encerrado.
                  </p>
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
    </>
  );
};

export default Sorteios;