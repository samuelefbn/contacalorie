/** Minuscolo e senza accenti, per confronti di ricerca tolleranti. */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

export const matches = (text: string, query: string) => normalize(text).includes(normalize(query))
