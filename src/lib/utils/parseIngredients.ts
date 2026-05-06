export type IngredientItem = {
  name: string
  quantity?: string
  unit?: string
}

export function parseIngredients(raw: string): IngredientItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => {
      if (typeof item === "string") return { name: item }
      if (typeof item === "object" && item !== null && typeof item.name === "string") {
        return {
          name: item.name,
          quantity: item.quantity ?? undefined,
          unit: item.unit ?? undefined,
        }
      }
      return { name: String(item) }
    })
  } catch {
    return []
  }
}
