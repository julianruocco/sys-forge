export function uid(prefix: string) {
  const bytes = crypto.randomUUID().replace(/-/g, "").slice(0, 8)
  return `${prefix}-${bytes}`
}
