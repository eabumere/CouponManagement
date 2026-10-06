const SEPARATOR = '\n'

// e.g. buildCouponNumbers('101-001', 1, 5) -> ['101-001-01', ..., '101-001-05']
export const buildCouponNumbers = (code: string, start: number, quantity: number): string[] => {
    const last = start + quantity - 1
    const width = Math.max(2, String(last).length)
    return Array.from(
        { length: quantity },
        (_, i) => `${code}-${String(start + i).padStart(width, '0')}`
    )
}

export const serializeCouponNumbers = (coupons: string[]): string => coupons.join(SEPARATOR)

export const parseCouponNumbers = (value: unknown): string[] =>
    typeof value === 'string'
        ? value
              .split(/[\n,]/)
              .map((s) => s.trim())
              .filter(Boolean)
        : []
