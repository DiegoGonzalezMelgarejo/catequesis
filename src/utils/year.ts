export function getCurrentYear() {
  return new Date().getFullYear()
}

export function formatYearLabel(year: number) {
  return `Corte ${year}`
}

export function sortYearsDescending(years: number[]) {
  return [...new Set(years)].sort((left, right) => right - left)
}
