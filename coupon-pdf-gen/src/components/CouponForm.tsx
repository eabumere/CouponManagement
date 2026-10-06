import { Button, NoticeBox } from '@dhis2/ui'
import React from 'react'
import { CouponConfig, DEFAULT_CONFIG } from '../constants'

// Inputs are not rendered by the plugin: the values come from the data elements
// shown as normal Capture fields and mapped to the plugin aliases.
export type CouponFormValues = {
    mobilizerCode: string
    quantity: string
    expiryDate: string // yyyy-MM-dd
}

export type CouponFormErrors = Partial<Record<keyof CouponFormValues, string>>

type ValidationConfig = Pick<
    CouponConfig,
    'maxQuantity' | 'mobilizerCodePattern' | 'mobilizerCodePatternMessage'
>

export const validateCouponForm = (
    values: CouponFormValues,
    today: string,
    { maxQuantity, mobilizerCodePattern, mobilizerCodePatternMessage }: ValidationConfig = DEFAULT_CONFIG
): CouponFormErrors => {
    const errors: CouponFormErrors = {}
    const code = values.mobilizerCode.trim()
    const quantity = Number(values.quantity)

    if (!code) errors.mobilizerCode = 'Peer Mobilizer Code is required'
    else if (mobilizerCodePattern && !new RegExp(mobilizerCodePattern).test(code))
        errors.mobilizerCode = mobilizerCodePatternMessage

    if (!values.quantity) errors.quantity = 'Number of coupons is required'
    else if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity)
        errors.quantity = `Number of coupons: enter a whole number between 1 and ${maxQuantity}`

    if (!values.expiryDate) errors.expiryDate = 'Coupon expiry date is required'
    else if (values.expiryDate <= today) errors.expiryDate = 'Coupon expiry date must be after today'

    return errors
}

type Props = {
    errors: CouponFormErrors
    loading: boolean
    // Labels of required fields that are still empty
    missing: string[]
    hideUntilReady: boolean
    onGenerate: () => void
}

export const CouponForm = ({ errors, loading, missing, hideUntilReady, onGenerate }: Props) => {
    const messages = Object.values(errors).filter(Boolean)
    const ready = missing.length === 0

    if (!ready && hideUntilReady) return null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length > 0 && (
                <NoticeBox warning title="Cannot generate coupons yet">
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {messages.map((message) => (
                            <li key={message}>{message}</li>
                        ))}
                    </ul>
                </NoticeBox>
            )}
            <div>
                <Button primary loading={loading} disabled={!ready || loading} onClick={onGenerate}>
                    Generate coupons
                </Button>
            </div>
            {!ready && (
                <div style={{ fontSize: 13, color: '#6c7787' }}>
                    Fill in {missing.join(' and ')} to enable
                </div>
            )}
        </div>
    )
}
