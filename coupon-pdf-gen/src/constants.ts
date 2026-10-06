// Plugin aliases configured in the Tracker Plugin Configurator (EPOA program stage)
export const FIELDS = {
    mobilizerCode: 'peerMobilizerCode',
    quantity: 'couponQuantity',
    expiryDate: 'couponExpiryDate',
    generationDate: 'couponGenerationDate',
    couponNumbers: 'couponNumbers',
    couponPdf: 'couponPdf',
} as const

// dataStore namespace holding the last issued coupon number per peer mobilizer
export const DATASTORE_NAMESPACE = 'couponManagement'

export const EXPIRY_MONTHS = 3
export const MAX_QUANTITY = 99
