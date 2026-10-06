import { CouponCodeFormat, DEFAULT_CONFIG } from '../constants'

// One issued coupon, stored as JSON in the couponNumbers data element.
// `redeemed` / `redeemedAt` are placeholders for future redemption tracking.
export type CouponRecord = {
    clientCoupon: string
    redeemed: boolean
    redeemedAt: string | null
}

export const randomLetters = (format: CouponCodeFormat = DEFAULT_CONFIG.couponCode): string => {
    const { letters, length } = format
    const bytes = new Uint32Array(length)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => letters[b % letters.length]).join('')
}

type BuildOptions = { format?: CouponCodeFormat; random?: () => string }

// Coupon = <parent>-<random code><sequential suffix>, where the parent is a
// seed (101-001) or an earlier coupon (101-001-KAZ01) for recursive generation.
// Random codes are never reused within the same parent (`usedCodes`).
// e.g. buildCouponNumbers('101-001', 1, 2, []) -> ['101-001-KAZ01', '101-001-PXT02']
export const buildCouponNumbers = (
    parent: string,
    start: number,
    quantity: number,
    usedCodes: string[] = [],
    { format = DEFAULT_CONFIG.couponCode, random = () => randomLetters(format) }: BuildOptions = {}
): { coupons: string[]; codes: string[] } => {
    const used = new Set(usedCodes)
    if (used.size + quantity > format.letters.length ** format.length) {
        throw new Error(`No unused random codes left for ${parent}`)
    }

    const codes: string[] = []
    const coupons = Array.from({ length: quantity }, (_, i) => {
        let code = random()
        while (used.has(code)) code = random()
        used.add(code)
        codes.push(code)
        return `${parent}-${code}${String(start + i).padStart(format.suffixDigits, '0')}`
    })
    return { coupons, codes }
}

export const toCouponRecords = (coupons: string[]): CouponRecord[] =>
    coupons.map((clientCoupon): CouponRecord => ({ clientCoupon, redeemed: false, redeemedAt: null }))

export const serializeCoupons = (records: CouponRecord[]): string => JSON.stringify(records)

// Reads the JSON list; also accepts the earlier newline/comma separated format
export const parseCoupons = (value: unknown): CouponRecord[] => {
    if (typeof value !== 'string' || !value.trim()) return []
    try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
            return parsed
                .filter((item) => typeof item?.clientCoupon === 'string')
                .map((item) => ({
                    clientCoupon: item.clientCoupon,
                    redeemed: item.redeemed === true,
                    redeemedAt: item.redeemedAt ?? null,
                }))
        }
    } catch {
        // not JSON: fall through to the legacy format
    }
    return toCouponRecords(
        value
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
    )
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const escapeCharClass = (s: string) => s.replace(/[\]\\^-]/g, '\\$&')

// From coupons already issued (taken from earlier events' couponNumbers), find the
// last sequential number and the random codes used directly under `parent`.
// Coupons without a random code (earlier format, e.g. 101-001-04) still count for numbering.
export const summarizeIssued = (
    parent: string,
    issued: string[],
    format: CouponCodeFormat = DEFAULT_CONFIG.couponCode
) => {
    const code = `[${escapeCharClass(format.letters)}]{${format.length}}`
    const pattern = new RegExp(`^${escapeRegExp(parent)}-(${code})?(\\d+)$`)
    let lastNumber = 0
    const usedCodes: string[] = []
    for (const coupon of issued) {
        const match = coupon.match(pattern)
        if (!match) continue
        if (match[1]) usedCodes.push(match[1])
        lastNumber = Math.max(lastNumber, Number(match[2]))
    }
    return { lastNumber, usedCodes }
}
