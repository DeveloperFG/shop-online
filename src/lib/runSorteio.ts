import { supabase } from "@/integrations/supabase/client";
import {
  buildGanhadorInsert,
  isLastDayOfMonth,
  pickRandom,
  selectSorteiosDoMesVigente,
  type GanhadorInsert,
  type Sorteio,
  type SorteioParticipant,
} from "@/lib/sorteios";

export type DrawStatus =
  | "ok"
  | "not-last-day"
  | "no-participants"
  | "no-items"
  | "error";

export interface DrawResult {
  status: DrawStatus;
  ganhadores: GanhadorInsert[];
  error?: string;
}

export interface RunSorteioOptions {
  /**
   * Ignora a verificação do "último dia do mês" e realiza o sorteio
   * imediatamente. Usado pelo botão manual do administrador.
   */
  force?: boolean;
}

/**
 * Executa o sorteio:
 * 1. Considera elegíveis os itens dentro do mês vigente (term. no mês/ano atual).
 * 2. Automaticamente, o sorteio só ocorre no último dia do mês; o botão do
 *    administrador pode forçar a execução via `options.force`.
 * 3. Busca todos os participantes (profiles), sorteia 1 ganhador e 1 item de
 *    forma aleatória e grava o resultado na tabela `ganhadores`.
 *
 * `now` e `random` são injetáveis para facilitar testes determinísticos.
 */
export async function runSorteioDraw(
  now: Date = new Date(),
  random: () => number = Math.random,
  options: RunSorteioOptions = {}
): Promise<DrawResult> {
  const { data: sorteiosData, error: sorteiosError } = await supabase
    .from("sorteios")
    .select("*");

  if (sorteiosError) {
    return { status: "error", ganhadores: [], error: sorteiosError.message };
  }

  const sorteios = (sorteiosData as Sorteio[]) ?? [];

  const itensDoMes = selectSorteiosDoMesVigente(sorteios, now);
  if (itensDoMes.length === 0) {
    return { status: "no-items", ganhadores: [] };
  }

  if (!options.force && !isLastDayOfMonth(now)) {
    return { status: "not-last-day", ganhadores: [] };
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("name, email, phone, location");

  if (profilesError) {
    return { status: "error", ganhadores: [], error: profilesError.message };
  }

  const participantes = (profilesData as SorteioParticipant[]) ?? [];
  if (participantes.length === 0) {
    return { status: "no-participants", ganhadores: [] };
  }

  const ganhador = pickRandom(participantes, random);
  const item = pickRandom(itensDoMes, random);
  if (!ganhador || !item) {
    return { status: "no-participants", ganhadores: [] };
  }

  const registro = buildGanhadorInsert(ganhador, item);

  const { error: insertError } = await supabase
    .from("ganhadores")
    .insert([registro]);

  if (insertError) {
    return { status: "error", ganhadores: [], error: insertError.message };
  }

  return { status: "ok", ganhadores: [registro] };
}
