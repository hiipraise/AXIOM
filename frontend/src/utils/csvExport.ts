/**
 * Convert an array of objects to CSV string and trigger a download.
 * Keys order can be specified; otherwise uses Object.keys of the first row.
 */
export function downloadCSV(
  rows: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; label: string }[],
) {
  if (!rows.length) return

  const keys = columns
    ? columns.map((c) => c.key)
    : (Object.keys(rows[0]!) as (keyof typeof rows[0])[])

  const labels = columns
    ? columns.map((c) => c.label)
    : keys

  const esc = (v: unknown) => {
    const s = String(v ?? "")
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const header = labels.map(esc).join(",")
  const body = rows
    .map((row) => keys.map((k) => esc(row[k])).join(","))
    .join("\n")

  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
