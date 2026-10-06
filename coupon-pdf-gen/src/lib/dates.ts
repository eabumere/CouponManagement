// Capture form date values follow the system setting keyDateFormat:
// 'yyyy-MM-dd' (default) or 'dd-MM-yyyy'. Dates are handled as local calendar days.

export type DateFormat = 'yyyy-MM-dd' | 'dd-MM-yyyy'

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

export const addMonths = (date: Date, months: number): Date => {
    const result = new Date(date.getFullYear(), date.getMonth() + months, 1)
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
    result.setDate(Math.min(date.getDate(), lastDay))
    return result
}

export const toIsoDate = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const toFormDate = (date: Date, format: DateFormat = 'yyyy-MM-dd'): string =>
    format === 'dd-MM-yyyy'
        ? `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`
        : toIsoDate(date)

// Accepts 'YYYY-MM-DD' or 'DD-MM-YYYY' (optionally followed by a time part)
export const parseDate = (value: unknown): Date | null => {
    if (typeof value !== 'string') return null
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    const dmy = value.match(/^(\d{2})-(\d{2})-(\d{4})/)
    const [y, m, d] = iso
        ? [iso[1], iso[2], iso[3]]
        : dmy
          ? [dmy[3], dmy[2], dmy[1]]
          : []
    if (!y) return null
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return date.getMonth() === Number(m) - 1 ? date : null
}

// e.g. 22 September 2026
export const formatLong = (date: Date): string =>
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export const startOfToday = (): Date => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
