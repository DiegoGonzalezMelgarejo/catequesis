export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getPrefixes(value: string) {
  const prefixes: string[] = []

  for (let index = 1; index <= value.length; index += 1) {
    prefixes.push(value.slice(0, index))
  }

  return prefixes
}

export function buildSearchTokens(...inputs: Array<string | undefined>) {
  const normalizedValues = inputs.map((input) => normalizeSearchText(input ?? '')).filter(Boolean)
  const tokens = new Set<string>()

  normalizedValues.forEach((value) => {
    getPrefixes(value).forEach((prefix) => tokens.add(prefix))

    value
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .forEach((word) => {
        getPrefixes(word).forEach((prefix) => tokens.add(prefix))
      })
  })

  return [...tokens]
}
