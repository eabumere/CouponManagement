import { webcrypto } from 'crypto'
import { validateCouponForm } from './components/CouponForm'
import { DEFAULT_CONFIG } from './constants'
import { mergeConfig } from './lib/config'
import {
    buildCouponNumbers,
    parseCoupons,
    serializeCoupons,
    summarizeIssued,
    toCouponRecords,
} from './lib/coupons'
import { addMonths, formatLong, parseDate, toFormDate, toIsoDate } from './lib/dates'

// jsdom has no Web Crypto; browsers do
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

// Deterministic stand-in for the random letter generator
const sequence = (...codes: string[]) => {
    let i = 0
    return () => codes[i++]
}

describe('coupon numbers', () => {
    it('adds a random 3-letter code before the sequential suffix', () => {
        const { coupons, codes } = buildCouponNumbers('101-001', 1, 5)
        coupons.forEach((coupon, i) => expect(coupon).toMatch(new RegExp(`^101-001-[A-Z]{3}0${i + 1}$`)))
        expect(new Set(codes).size).toBe(5)
    })

    it('continues from a later start number', () => {
        const { coupons } = buildCouponNumbers('101-001', 6, 2, [], { random: sequence('KAZ', 'PXT') })
        expect(coupons).toEqual(['101-001-KAZ06', '101-001-PXT07'])
    })

    it('never reuses a code within the same parent', () => {
        const random = sequence('KAZ', 'KAZ', 'PXT', 'MQN')
        const { coupons, codes } = buildCouponNumbers('101-001', 3, 2, ['PXT'], { random })
        expect(coupons).toEqual(['101-001-KAZ03', '101-001-MQN04'])
        expect(codes).toEqual(['KAZ', 'MQN'])
    })

    it('supports recursive parents', () => {
        const { coupons } = buildCouponNumbers('101-001-KAZ01', 1, 1, [], { random: sequence('QIJ') })
        expect(coupons).toEqual(['101-001-KAZ01-QIJ01'])
    })

    it('keeps counting past 99', () => {
        const { coupons } = buildCouponNumbers('101-001', 99, 2, [], { random: sequence('AAA', 'BBB') })
        expect(coupons).toEqual(['101-001-AAA99', '101-001-BBB100'])
    })

    it('summarizes coupons already issued to a parent', () => {
        const issued = [
            '101-001-KAZ01',
            '101-001-PXT02',
            '101-001-04', // earlier format without a random code
            '101-001-KAZ01-QIJ01', // child of another parent
            '101-002-MQN09', // different seed
        ]
        expect(summarizeIssued('101-001', issued)).toEqual({ lastNumber: 4, usedCodes: ['KAZ', 'PXT'] })
        expect(summarizeIssued('101-001-KAZ01', issued)).toEqual({ lastNumber: 1, usedCodes: ['QIJ'] })
        expect(summarizeIssued('101-003', issued)).toEqual({ lastNumber: 0, usedCodes: [] })
    })

    it('stores coupons as a JSON list with redemption status', () => {
        const records = toCouponRecords(['101-001-04', '101-001-05'])
        const stored = serializeCoupons(records)
        expect(JSON.parse(stored)).toEqual([
            { clientCoupon: '101-001-04', redeemed: false, redeemedAt: null },
            { clientCoupon: '101-001-05', redeemed: false, redeemedAt: null },
        ])
        expect(parseCoupons(stored)).toEqual(records)
    })

    it('keeps redemption status when reading', () => {
        const stored = '[{"clientCoupon":"101-001-04","redeemed":true,"redeemedAt":"2026-10-01"}]'
        expect(parseCoupons(stored)[0]).toEqual({
            clientCoupon: '101-001-04',
            redeemed: true,
            redeemedAt: '2026-10-01',
        })
    })

    it('reads the earlier newline format and empty values', () => {
        expect(parseCoupons('101-001-01\n101-001-02').map((c) => c.clientCoupon)).toEqual([
            '101-001-01',
            '101-001-02',
        ])
        expect(parseCoupons(undefined)).toEqual([])
        expect(parseCoupons('')).toEqual([])
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
            { mobilizerCode: '', quantity: '0', expiryDate: '2026-09-01' },
            '2026-09-22'
        )
        expect(Object.keys(errors).sort()).toEqual(['expiryDate', 'mobilizerCode', 'quantity'])
    })
})

describe('config', () => {
    it('uses defaults when the dataStore has no entry', () => {
        expect(mergeConfig(undefined)).toEqual(DEFAULT_CONFIG)
    })

    it('uses dataStore values when provided, defaults otherwise', () => {
        const config = mergeConfig({
            expiryMonths: 6,
            maxQuantity: null, // not provided -> default
            dateLocale: '', // empty -> default
            fields: { couponPdf: 'pdfFile' },
            pdf: { title: 'NEW TITLE', titleColor: [0, 0, 0], labels: { notice: 'Note' } },
            couponCode: { length: '4' }, // wrong type -> default
            unknownKey: 'ignored',
        })
        expect(config.expiryMonths).toBe(6)
        expect(config.maxQuantity).toBe(DEFAULT_CONFIG.maxQuantity)
        expect(config.dateLocale).toBe(DEFAULT_CONFIG.dateLocale)
        expect(config.fields).toEqual({ ...DEFAULT_CONFIG.fields, couponPdf: 'pdfFile' })
        expect(config.pdf.title).toBe('NEW TITLE')
        expect(config.pdf.titleColor).toEqual([0, 0, 0])
        expect(config.pdf.labels).toEqual({ ...DEFAULT_CONFIG.pdf.labels, notice: 'Note' })
        expect(config.couponCode.length).toBe(3)
        expect(config).not.toHaveProperty('unknownKey')
    })

    it('reads the fields required before generating', () => {
        expect(mergeConfig({}).requiredBeforeGenerate).toEqual(['mobilizerCode', 'quantity'])
        expect(mergeConfig({}).hideGenerateUntilReady).toBe(false)
        const config = mergeConfig({
            requiredBeforeGenerate: ['mobilizerCode'],
            hideGenerateUntilReady: true,
        })
        expect(config.requiredBeforeGenerate).toEqual(['mobilizerCode'])
        expect(config.hideGenerateUntilReady).toBe(true)
    })

    it('applies configured coupon code format and validation', () => {
        const format = { letters: 'XY', length: 2, suffixDigits: 3 }
        const { coupons } = buildCouponNumbers('101-001', 1, 1, [], { format, random: () => 'XY' })
        expect(coupons).toEqual(['101-001-XY001'])
        expect(summarizeIssued('101-001', ['101-001-XY007'], format)).toEqual({
            lastNumber: 7,
            usedCodes: ['XY'],
        })
        const errors = validateCouponForm(
            { mobilizerCode: '101001', quantity: '5', expiryDate: '2026-12-22' },
            '2026-09-22',
            { ...DEFAULT_CONFIG, mobilizerCodePattern: '^\\d{3}-\\d{3}$' }
        )
        expect(errors.mobilizerCode).toBe(DEFAULT_CONFIG.mobilizerCodePatternMessage)
    })
})
