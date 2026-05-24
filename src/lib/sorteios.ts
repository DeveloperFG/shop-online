export interface Sorteio {
  id: string;
  name: string;
  sponsor_name: string;
  validity_period: string;
  start_date: string;
  end_date: string;
  image_url: string | null;
  created_at: string;
  created_by: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Sorteio encerrado se passou da data final ou se foi cadastrado há mais de 30 dias. */
export function isSorteioEncerrado(sorteio: Pick<Sorteio, "created_at" | "end_date">, now = Date.now()): boolean {
  const createdAt = new Date(sorteio.created_at).getTime();
  const endDate = new Date(sorteio.end_date).getTime();

  if (now - createdAt > THIRTY_DAYS_MS) return true;
  if (now > endDate) return true;

  return false;
}

export function partitionSorteios(sorteios: Sorteio[]) {
  const emAndamento: Sorteio[] = [];
  const encerrados: Sorteio[] = [];

  for (const s of sorteios) {
    if (isSorteioEncerrado(s)) {
      encerrados.push(s);
    } else {
      emAndamento.push(s);
    }
  }

  return { emAndamento, encerrados };
}
