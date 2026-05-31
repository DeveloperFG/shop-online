export const PRODUCT_CATEGORIES = [
  "Eletrônicos",
  "Roupas e Acessórios",
  "Casa e Decoração",
  "Esportes e Lazer",
  "Veículos e Peças",
  "Livros e Papelaria",
  "Brinquedos e Games",
  "Saúde e Beleza",
  "Ferramentas",
  "Aluguel",
  "Serviço",
  "Outros",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
