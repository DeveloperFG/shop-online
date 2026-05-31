export interface Sorteio {
  id: string;
  name: string;
  sponsor_name: string;
  link_pagina: string | null;
  validity_period: string;
  start_date: string;
  end_date: string;
  image_url: string | null;
  published: boolean;
  created_at: string;
  created_by: string;
}

/** Índice contínuo de mês (ano * 12 + mês) para comparar mês/ano facilmente. */
function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

/**
 * Compara a data de criação com a data de término do sorteio.
 * Se o término cair em um mês diferente e posterior ao da criação
 * (ex.: criado em janeiro e terminando em fevereiro), o sorteio é
 * considerado encerrado. Enquanto término e criação estiverem no mesmo
 * mês, permanece em andamento.
 */
export function isSorteioEncerrado(sorteio: Pick<Sorteio, "created_at" | "end_date">): boolean {
  const createdMonth = monthIndex(new Date(sorteio.created_at));
  const endMonth = monthIndex(new Date(sorteio.end_date));

  return endMonth > createdMonth;
}

/** Normaliza URL para armazenamento (adiciona https:// se necessário). Retorna null se vazio. */
export function normalizeSorteioLink(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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

/** Dados mínimos de um participante usados no sorteio do ganhador. */
export interface SorteioParticipant {
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
}

/** Registro inserido na tabela `ganhadores`. */
export interface GanhadorInsert {
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  sorteio_id: string;
  sorteio_name: string;
  sponsor_name: string;
}

/** Verifica se `end_date` cai no mesmo dia (ano/mês/dia) que `now`. */
export function isEndDateToday(endDate: string, now = new Date()): boolean {
  const end = new Date(endDate);
  return (
    end.getFullYear() === now.getFullYear() &&
    end.getMonth() === now.getMonth() &&
    end.getDate() === now.getDate()
  );
}

/** Sorteios cuja data de término é exatamente o dia atual. */
export function selectSorteiosEndingToday<T extends Pick<Sorteio, "end_date">>(
  sorteios: T[],
  now = new Date()
): T[] {
  return sorteios.filter((s) => isEndDateToday(s.end_date, now));
}

/** Itens cuja data ainda não venceu (término maior ou igual a agora). */
export function selectSorteiosNaoVencidos<T extends Pick<Sorteio, "end_date">>(
  sorteios: T[],
  now = new Date()
): T[] {
  const ref = now.getTime();
  return sorteios.filter((s) => new Date(s.end_date).getTime() >= ref);
}

/** Verifica se `now` é o último dia do mês vigente. */
export function isLastDayOfMonth(now = new Date()): boolean {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getMonth() !== now.getMonth();
}

/**
 * Itens dentro do mês vigente: o término (`end_date`) cai no mesmo mês/ano
 * que `now`. Independe do horário, então sorteios que terminam ainda neste
 * mês continuam elegíveis ao longo de todo o dia.
 */
export function selectSorteiosDoMesVigente<T extends Pick<Sorteio, "end_date">>(
  sorteios: T[],
  now = new Date()
): T[] {
  return sorteios.filter((s) => {
    const end = new Date(s.end_date);
    return end.getFullYear() === now.getFullYear() && end.getMonth() === now.getMonth();
  });
}

/**
 * Seleciona um elemento aleatório da lista.
 * `random` permite injetar um gerador determinístico em testes.
 */
export function pickRandom<T>(items: T[], random: () => number = Math.random): T | null {
  if (items.length === 0) return null;
  const index = Math.floor(random() * items.length);
  return items[Math.min(index, items.length - 1)];
}

/** Monta o registro de ganhador combinando dados do participante e do item sorteado. */
export function buildGanhadorInsert(
  winner: SorteioParticipant,
  item: Pick<Sorteio, "id" | "name" | "sponsor_name">
): GanhadorInsert {
  return {
    name: winner.name,
    email: winner.email,
    phone: winner.phone ?? null,
    location: winner.location ?? null,
    sorteio_id: item.id,
    sorteio_name: item.name,
    sponsor_name: item.sponsor_name,
  };
}
