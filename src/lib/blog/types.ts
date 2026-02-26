export interface BlogArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  tags: string[];
  coverImage: string;
  author: string;
  publishedAt: string;
  readTime: number;
  metaTitle: string;
  metaDescription: string;
  relatedProducts: string[];
}

export type BlogCategory =
  | "gravidez"
  | "recem-nascido"
  | "amamentacao"
  | "sono-do-bebe"
  | "alimentacao"
  | "desenvolvimento"
  | "saude"
  | "moda-infantil"
  | "decoracao"
  | "dicas-de-mae"
  | "passeios"
  | "seguranca"
  | "sustentabilidade"
  | "tecnologia"
  | "educacao";

export const categoryLabels: Record<BlogCategory, string> = {
  gravidez: "Gravidez",
  "recem-nascido": "Recem-Nascido",
  amamentacao: "Amamentacao",
  "sono-do-bebe": "Sono do Bebe",
  alimentacao: "Alimentacao",
  desenvolvimento: "Desenvolvimento",
  saude: "Saude",
  "moda-infantil": "Moda Infantil",
  decoracao: "Decoracao",
  "dicas-de-mae": "Dicas de Mae",
  passeios: "Passeios",
  seguranca: "Seguranca",
  sustentabilidade: "Sustentabilidade",
  tecnologia: "Tecnologia",
  educacao: "Educacao",
};

export const categoryColors: Record<BlogCategory, string> = {
  gravidez: "bg-pink-100 text-pink-700",
  "recem-nascido": "bg-blue-100 text-blue-700",
  amamentacao: "bg-purple-100 text-purple-700",
  "sono-do-bebe": "bg-indigo-100 text-indigo-700",
  alimentacao: "bg-green-100 text-green-700",
  desenvolvimento: "bg-yellow-100 text-yellow-700",
  saude: "bg-red-100 text-red-700",
  "moda-infantil": "bg-fuchsia-100 text-fuchsia-700",
  decoracao: "bg-amber-100 text-amber-700",
  "dicas-de-mae": "bg-rose-100 text-rose-700",
  passeios: "bg-teal-100 text-teal-700",
  seguranca: "bg-orange-100 text-orange-700",
  sustentabilidade: "bg-emerald-100 text-emerald-700",
  tecnologia: "bg-cyan-100 text-cyan-700",
  educacao: "bg-violet-100 text-violet-700",
};

export const categoryEmojis: Record<BlogCategory, string> = {
  gravidez: "🤰",
  "recem-nascido": "👶",
  amamentacao: "🤱",
  "sono-do-bebe": "😴",
  alimentacao: "🍼",
  desenvolvimento: "🧒",
  saude: "🏥",
  "moda-infantil": "👗",
  decoracao: "🎨",
  "dicas-de-mae": "💡",
  passeios: "🚗",
  seguranca: "🛡️",
  sustentabilidade: "🌿",
  tecnologia: "📱",
  educacao: "📚",
};
