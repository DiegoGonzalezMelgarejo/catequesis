function escapeValue(value: unknown) {
  const normalized = value == null ? '' : String(value)
  return `"${normalized.replaceAll('"', '""')}"`
}

export function buildCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0])
  const lines = rows.map((row) => headers.map((header) => escapeValue(row[header])).join(','))
  return [headers.join(','), ...lines].join('\n')
}

export async function exportCsvFile(
  filename: string,
  rows: Array<Record<string, unknown>>,
  title: string,
) {
  const csv = buildCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })

  try {
    const file = new File([blob], filename, { type: blob.type })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title })
      return 'shared'
    }
  } catch {
    // Fallback to download when share APIs are not available.
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
