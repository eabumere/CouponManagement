import { CouponConfig, DEFAULT_CONFIG } from '../constants'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const isProvided = (value: unknown) =>
    value !== undefined &&
    value !== null &&
    value !== '' &&
    !(Array.isArray(value) && value.length === 0)

// Deep-merges overrides (from the dataStore) onto the defaults. An override is used only
// when it is provided and has the same type as the default; otherwise the default stays.
const merge = (defaults: unknown, overrides: unknown): unknown => {
    if (isPlainObject(defaults)) {
        if (!isPlainObject(overrides)) return defaults
        return Object.fromEntries(
            Object.entries(defaults).map(([key, value]) => [key, merge(value, overrides[key])])
        )
    }
    if (!isProvided(overrides)) return defaults
    if (Array.isArray(defaults)) return Array.isArray(overrides) ? overrides : defaults
    return typeof overrides === typeof defaults ? overrides : defaults
}

export const mergeConfig = (overrides: unknown, defaults: CouponConfig = DEFAULT_CONFIG): CouponConfig =>
    merge(defaults, overrides) as CouponConfig
