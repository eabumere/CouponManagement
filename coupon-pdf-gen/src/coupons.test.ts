import { validateCouponForm } from './components/CouponForm'
import { buildCouponNumbers, parseCouponNumbers, serializeCouponNumbers } from './lib/coupons'
import { addMonths, formatLong, parseDate, toFormDate, toIsoDate } from './lib/dates'

describe('coupon numbers', () => {
    it('builds a zero-padded sequence', () => {
        expect(buildCouponNumbers('101-001', 1, 5)).toEqual([
            '101-001-01',
            '101-001-02',
            '101-001-03',
            '101-001-04',
            '101-001-05',
        ])
    })

    it('continues from a later start number', () => {
        expect(buildCouponNumbers('101-001', 6, 2)).toEqual(['101-001-06', '101-001-07'])
    })

    it('widens padding past 99', () => {
        expect(buildCouponNumbers('101-001', 99, 2)).toEqual(['101-001-099', '101-001-100'])
    })

    it('round-trips through the stored text value', () => {
        const coupons = buildCouponNumbers('101-001', 1, 3)
        expect(parseCouponNumbers(serializeCouponNumbers(coupons))).toEqual(coupons)
        expect(parseCouponNumbers(undefined)).toEqual([])
    })
})

describe('dates', () => {
    it('adds months and clamps to the end of month', () => {
        expect(toIsoDate(addMonths(new Date(2026, 8, 22), 3))).toBe('2026-12-22')
        expect(toIsoDate(addMonths(new Date(2026, 10, 30), 3))).toBe('2027-02-28')
    })

    it('parses both Capture date formats', () => {
        expect(toIsoDate(parseDate('2026-12-22') as Date)).toBe('2026-12-22')
        expect(toIsoDate(parseDate('22-12-2026') as Date)).toBe('2026-12-22')
        expect(parseDate('2026-02-31')).toBeNull()
        expect(parseDate('')).toBeNull()
    })

    it('formats for forms and the PDF', () => {
        const date = new Date(2026, 8, 22)
        expect(toFormDate(date, 'dd-MM-yyyy')).toBe('22-09-2026')
        expect(toFormDate(date)).toBe('2026-09-22')
        expect(formatLong(date)).toBe('22 September 2026')
    })
})

describe('form validation', () => {
    const valid = { mobilizerCode: '101-001', quantity: '5', expiryDate: '2026-12-22' }

    it('accepts valid input', () => {
        expect(validateCouponForm(valid, '2026-09-22')).toEqual({})
    })

    it('rejects bad input', () => {
        const errors = validateCouponForm(
            { mobilizerCode: '101001', quantity: '0', expiryDate: '2026-09-01' },
            '2026-09-22'
        )
        expect(Object.keys(errors).sort()).toEqual(['expiryDate', 'mobilizerCode', 'quantity'])
    })
})
