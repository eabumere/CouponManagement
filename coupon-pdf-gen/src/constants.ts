// Default settings for the coupon plugin.
// Every value can be overridden from the DHIS2 dataStore entry CONFIG_DATASTORE
// (namespace/key). Values missing there (or null / empty) fall back to the ones here.

export const CONFIG_DATASTORE = { namespace: 'couponPdfGen', key: 'config' }

export const DEFAULT_CONFIG = {
    // Plugin aliases configured in the Tracker Plugin Configurator (EPOA program stage)
    fields: {
        mobilizerCode: 'peerMobilizerCode',
        quantity: 'couponQuantity',
        expiryDate: 'couponExpiryDate',
        generationDate: 'couponGenerationDate',
        couponNumbers: 'couponNumbers',
    },

    expiryMonths: 3,
    maxQuantity: 99,

    // Keys from `fields` that must have a value before "Generate coupons" is enabled
    requiredBeforeGenerate: ['mobilizerCode', 'quantity'],
    // true = hide the button until ready; false = show it disabled with a hint
    hideGenerateUntilReady: false,

    // Regular expression the Peer Mobilizer Code must match, e.g. '^\\d{3}-\\d{3}$'. Empty = no check
    mobilizerCodePattern: '',
    mobilizerCodePatternMessage: 'Peer Mobilizer Code: expected format 101-001',

    // Coupon = <parent>-<random code><sequential suffix>, e.g. 101-001-KAZ01
    couponCode: {
        letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        length: 3,
        suffixDigits: 2,
    },

    // Org unit scope searched for earlier coupons (tracker API ouMode)
    orgUnitMode: 'ACCESSIBLE',

    // Locale for long dates such as "22 September 2026"
    dateLocale: 'en-GB',

    // Coupon table shown in the plugin (not the PDF)
    view: {
        labels: {
            redeemed: 'Redeemed',
            redeemedAt: 'Redeemed on',
            yes: 'Yes',
            no: 'No',
            // {count} and {total} are replaced with numbers
            summary: 'Redeemed: {count} of {total}',
        },
    },

    pdf: {
        fileNamePrefix: 'EPOA_Coupons',
        title: 'EPOA COUPON GENERATION SHEET',
        titleColor: [84, 122, 161],
        labels: {
            cbo: 'Community-Based Organization (CBO)',
            generationDate: 'Date of generation',
            mobilizerCode: 'Peer Mobilizer Code',
            couponCount: 'Number of Coupons Generated',
            expiryDate: 'Coupon Expiry Date',
            tableNumber: 'No.',
            tableCoupon: 'Coupon Number',
            notice: 'Important Notice',
        },
        notice:
            'The Peer Mobilizer must record each coupon number on both the booklet stub and the detachable coupon. ' +
            'Each coupon is valid for one HIV testing service only and may be used once. Coupons are strictly ' +
            'personal, non-transferable and must be presented before the expiry date.',
    },
}

export type CouponConfig = typeof DEFAULT_CONFIG
export type CouponCodeFormat = CouponConfig['couponCode']
export type PdfConfig = CouponConfig['pdf']
export type FieldAliases = CouponConfig['fields']
