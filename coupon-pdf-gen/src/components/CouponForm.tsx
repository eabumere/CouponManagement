import { Button, NoticeBox } from '@dhis2/ui'
import React from 'react'
import { MAX_QUANTITY } from '../constants'

// Inputs are not rendered by the plugin: the values come from the data elements
// shown as normal Capture fields and mapped to the plugin aliases.
export type CouponFormValues = {
    mobilizerCode: string
    quantity: string
    expiryDate: string // yyyy-MM-dd
}

export type CouponFormErrors = Partial<Record<keyof CouponFormValues, string>>

// Peer mobilizer codes look like 101-001
const MOBILIZER_CODE_PATTERN = /^\d{3}-\d{3}$/

export const validateCouponForm = (values: CouponFormValues, today: string): CouponFormErrors => {
    const errors: CouponFormErrors = {}
    const code = values.mobilizerCode.trim()
    const quantity = Number(values.quantity)

    if (!code) errors.mobilizerCode = 'Peer Mobilizer Code is required'
    else if (!MOBILIZER_CODE_PATTERN.test(code))
        errors.mobilizerCode = 'Peer Mobilizer Code: expected format 101-001'

    if (!values.quantity) errors.quantity = 'Number of coupons is required'
    else if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY)
        errors.quantity = `Number of coupons: enter a whole number between 1 and ${MAX_QUANTITY}`

    if (!values.expiryDate) errors.expiryDate = 'Coupon expiry date is required'
    else if (values.expiryDate <= today) errors.expiryDate = 'Coupon expiry date must be after today'

    return errors
}

type Props = {
    errors: CouponFormErrors
    loading: boolean
    onGenerate: () => void
}

export const CouponForm = ({ errors, loading, onGenerate }: Props) => {
    const messages = Object.values(errors).filter(Boolean)

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
                <Button primary loading={loading} disabled={loading} onClick={onGenerate}>
                    Generate coupons
                </Button>
            </div>
        </div>
    )
}
