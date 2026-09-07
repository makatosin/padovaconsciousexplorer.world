export type Avatar = { id: number; emoji: string; label: string; bg: string };

export const AVATARS: Avatar[] = [
  { id: 1, emoji: "🦊", label: "Volpe",    bg: "bg-orange-100 text-orange-700 border-orange-300" },
  { id: 2, emoji: "🦉", label: "Gufo",     bg: "bg-amber-100 text-amber-700 border-amber-300" },
  { id: 3, emoji: "🐢", label: "Tartaruga",bg: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { id: 4, emoji: "🦋", label: "Farfalla", bg: "bg-sky-100 text-sky-700 border-sky-300" },
  { id: 5, emoji: "🐿️", label: "Scoiattolo", bg: "bg-rose-100 text-rose-700 border-rose-300" },
  { id: 6, emoji: "🦔", label: "Riccio",   bg: "bg-stone-100 text-stone-700 border-stone-300" },
];

export const getAvatar = (id: number | null | undefined): Avatar =>
  AVATARS.find((a) => a.id === id) ?? AVATARS[0];