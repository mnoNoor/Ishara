export const DIALECTS = [
  "سورية",
  "سعودي",
  "مصري",
  "لبناني",
  "عراقي",
  "خليجي",
] as const;

export type Dialect = (typeof DIALECTS)[number];
