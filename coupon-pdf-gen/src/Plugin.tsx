// src/Plugin.tsx
// EPOA coupon generator: Capture form field plugin for the EPOA program stage.
import { Button, CircularLoader, NoticeBox } from '@dhis2/ui'
import React, { useEffect, useMemo, useState } from 'react'
import {
    CouponForm,
    CouponFormErrors,
    CouponFormValues,
    validateCouponForm,
} from './components/CouponForm'
import { CouponSheetView } from './components/CouponSheetView'
import { EXPIRY_MONTHS, FIELDS } from './constants'
import { useCouponCounter } from './hooks/useCouponCounter'
import { useServerInfo } from './hooks/useServerInfo'
import { useUploadPdf } from './hooks/useUploadPdf'
import { buildCouponNumbers, parseCouponNumbers, serializeCouponNumbers } from './lib/coupons'
import { buildCouponPdf, couponPdfFileName, CouponSheet } from './lib/couponPdf'
import { addMonths, parseDate, startOfToday, toFormDate, toIsoDate } from './lib/dates'
import { loadLogos } from './lib/logos'
import { IDataEntryPluginProps } from './Plugin.types'

const asString = (value: unknown) => (value == null ? '' : String(value))
const isoFromFormDate = (value: unknown) => {
    const date = parseDate(value)
    return date ? toIsoDate(date) : ''
}

const createPdf = async (sheet: CouponSheet) => buildCouponPdf(sheet, await loadLogos())

const Plugin = ({
    values,
    fieldsMetadata,
    setFieldValue,
    orgUnitId,
}: IDataEntryPluginProps) => {
    const { cboName, dateFormat, loading } = useServerInfo(orgUnitId)
    const { reserve } = useCouponCounter()
    const uploadPdf = useUploadPdf()

    const configured = useMemo(() => new Set(Object.keys(fieldsMetadata ?? {})), [fieldsMetadata])
    const missingAliases = Object.values(FIELDS).filter((alias) => !configured.has(alias))

    const storedCode = asString(values?.[FIELDS.mobilizerCode])
    const storedQuantity = asString(values?.[FIELDS.quantity])
    const storedExpiry = isoFromFormDate(values?.[FIELDS.expiryDate])
    const coupons = parseCouponNumbers(values?.[FIELDS.couponNumbers])
    const hasPdf = !!values?.[FIELDS.couponPdf]
    const generated = coupons.length > 0

    // Inputs live in the regular Capture fields mapped to the plugin; read them as-is
    const form: CouponFormValues = {
        mobilizerCode: storedCode,
        quantity: storedQuantity,
        expiryDate: storedExpiry,
    }
    // Validation messages show after the first Generate click and update as fields change
    const [attempted, setAttempted] = useState(false)
    const formErrors: CouponFormErrors = attempted
        ? validateCouponForm(form, toIsoDate(startOfToday()))
        : {}
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const setField = (alias: string, value: any) => {
        if (configured.has(alias)) setFieldValue({ fieldId: alias, value })
    }

    // Default the expiry date to EXPIRY_MONTHS after today; still editable in its Capture field
    useEffect(() => {
        if (loading || generated || storedExpiry) return
        const expiry = addMonths(startOfToday(), EXPIRY_MONTHS)
        setField(FIELDS.expiryDate, toFormDate(expiry, dateFormat))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading])

    const sheet: CouponSheet | null = generated
        ? {
              cboName,
              mobilizerCode: storedCode,
              coupons,
              generationDate: parseDate(values?.[FIELDS.generationDate]) ?? startOfToday(),
              expiryDate: parseDate(values?.[FIELDS.expiryDate]) ?? startOfToday(),
          }
        : null

    const attachPdf = async (couponSheet: CouponSheet) => {
        const blob = await createPdf(couponSheet)
        const fileName = couponPdfFileName(couponSheet.mobilizerCode, couponSheet.generationDate)
        setField(FIELDS.couponPdf, await uploadPdf(blob, fileName))
    }

    const run = async (task: () => Promise<void>) => {
        setBusy(true)
        setError(null)
        try {
            await task()
        } catch (e: any) {
            setError(e?.message ?? String(e))
        } finally {
            setBusy(false)
        }
    }

    const handleGenerate = () => {
        const today = startOfToday()
        setAttempted(true)
        if (Object.keys(validateCouponForm(form, toIsoDate(today))).length > 0) return

        run(async () => {
            const code = form.mobilizerCode.trim()
            const quantity = Number(form.quantity)
            const start = await reserve(code, quantity)
            const newCoupons = buildCouponNumbers(code, start, quantity)

            setField(FIELDS.generationDate, toFormDate(today, dateFormat))
            setField(FIELDS.couponNumbers, serializeCouponNumbers(newCoupons))

            await attachPdf({
                cboName,
                mobilizerCode: code,
                coupons: newCoupons,
                generationDate: today,
                expiryDate: parseDate(form.expiryDate) as Date,
            })
        })
    }

    const openPdf = (download: boolean) =>
        run(async () => {
            if (!sheet) return
            const blob = await createPdf(sheet)
            const url = URL.createObjectURL(blob)
            if (download) {
                const link = document.createElement('a')
                link.href = url
                link.download = couponPdfFileName(sheet.mobilizerCode, sheet.generationDate)
                link.click()
            } else {
                window.open(url, '_blank')
            }
            setTimeout(() => URL.revokeObjectURL(url), 60_000)
        })

    if (loading) return <CircularLoader small />

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 8 }}>
            {missingAliases.length > 0 && (
                <NoticeBox warning title="Plugin configuration incomplete">
                    Map these plugin aliases in the Tracker Plugin Configurator: {missingAliases.join(', ')}
                </NoticeBox>
            )}

            {!generated && (
                <CouponForm errors={formErrors} loading={busy} onGenerate={handleGenerate} />
            )}

            {error && (
                <NoticeBox error title="Coupon generation failed">
                    {error}
                </NoticeBox>
            )}

            {sheet && !hasPdf && !busy && (
                <NoticeBox warning title="Coupon PDF not attached">
                    Coupon numbers were generated, but the PDF was not uploaded.{' '}
                    <Button small onClick={() => run(() => attachPdf(sheet))}>
                        Upload PDF again
                    </Button>
                </NoticeBox>
            )}

            {sheet && (
                <CouponSheetView
                    sheet={sheet}
                    busy={busy}
                    onPreview={() => openPdf(false)}
                    onDownload={() => openPdf(true)}
                />
            )}

            {generated && !busy && (
                <NoticeBox title="Remember to save">
                    Coupons are stored with this event once you save it.
                </NoticeBox>
            )}
        </div>
    )
}

export default Plugin
