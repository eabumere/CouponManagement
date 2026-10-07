// src/Plugin.tsx
// EPOA coupon generator: Capture form field plugin for the EPOA program stage.
import { CircularLoader, NoticeBox } from '@dhis2/ui'
import React, { useEffect, useMemo, useState } from 'react'
import {
    CouponForm,
    CouponFormErrors,
    CouponFormValues,
    validateCouponForm,
} from './components/CouponForm'
import { CouponSheetView } from './components/CouponSheetView'
import { CouponConfig } from './constants'
import { useConfig } from './hooks/useConfig'
import { useIssuedCoupons } from './hooks/useIssuedCoupons'
import { useServerInfo } from './hooks/useServerInfo'
import {
    buildCouponNumbers,
    parseCoupons,
    serializeCoupons,
    summarizeIssued,
    toCouponRecords,
} from './lib/coupons'
import { buildCouponPdf, couponPdfFileName, CouponSheet } from './lib/couponPdf'
import { addMonths, parseDate, startOfToday, toFormDate, toIsoDate } from './lib/dates'
import { loadLogos } from './lib/logos'
import { IDataEntryPluginProps } from './Plugin.types'

const asString = (value: unknown) => (value == null ? '' : String(value))
const isoFromFormDate = (value: unknown) => {
    const date = parseDate(value)
    return date ? toIsoDate(date) : ''
}

const createPdf = async (sheet: CouponSheet, config: CouponConfig) =>
    buildCouponPdf(sheet, await loadLogos(), config.pdf, config.dateLocale)

const pdfFileName = (sheet: CouponSheet, config: CouponConfig) =>
    couponPdfFileName(sheet.mobilizerCode, sheet.generationDate, config.pdf.fileNamePrefix)

const Plugin = ({
    values,
    fieldsMetadata,
    setFieldValue,
    orgUnitId,
}: IDataEntryPluginProps) => {
    // Settings: dataStore overrides merged over the defaults in constants.ts
    const { config, loading: configLoading } = useConfig()
    const FIELDS = config.fields
    const { cboName, dateFormat, loading: serverLoading } = useServerInfo(orgUnitId)
    const loading = configLoading || serverLoading
    const getIssuedCoupons = useIssuedCoupons(
        fieldsMetadata?.[FIELDS.mobilizerCode] ?? {},
        fieldsMetadata?.[FIELDS.couponNumbers] ?? {},
        config.orgUnitMode
    )

    const configured = useMemo(() => new Set(Object.keys(fieldsMetadata ?? {})), [fieldsMetadata])
    const missingAliases = Object.values(FIELDS).filter((alias) => !configured.has(alias))

    const storedCode = asString(values?.[FIELDS.mobilizerCode])
    const storedQuantity = asString(values?.[FIELDS.quantity])
    const storedExpiry = isoFromFormDate(values?.[FIELDS.expiryDate])
    const couponRecords = parseCoupons(values?.[FIELDS.couponNumbers])
    const coupons = couponRecords.map((c) => c.clientCoupon)
    const generated = coupons.length > 0

    // Inputs live in the regular Capture fields mapped to the plugin; read them as-is
    const form: CouponFormValues = {
        mobilizerCode: storedCode,
        quantity: storedQuantity,
        expiryDate: storedExpiry,
    }
    // Required fields (config.requiredBeforeGenerate) that are still empty; unknown keys are ignored
    const labels = config.pdf.labels
    const fieldLabels: Record<string, string> = {
        mobilizerCode: labels.mobilizerCode,
        quantity: labels.couponCount,
        expiryDate: labels.expiryDate,
        generationDate: labels.generationDate,
    }
    const missingRequired = config.requiredBeforeGenerate
        .filter((key) => key in FIELDS)
        .filter((key) => !asString(values?.[FIELDS[key as keyof typeof FIELDS]]).trim())
        .map((key) => fieldLabels[key] ?? key)

    // Validation messages show after the first Generate click and update as fields change
    const [attempted, setAttempted] = useState(false)
    const formErrors: CouponFormErrors = attempted
        ? validateCouponForm(form, toIsoDate(startOfToday()), config)
        : {}
    const [busy, setBusy] = useState(false)
    // True only when coupons were generated in this form session (i.e. not yet saved);
    // a saved event reopened later starts with this false
    const [generatedNow, setGeneratedNow] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const setField = (alias: string, value: any) => {
        if (configured.has(alias)) setFieldValue({ fieldId: alias, value })
    }

    // Default the expiry date to config.expiryMonths after today; still editable in its Capture field
    useEffect(() => {
        if (loading || generated || storedExpiry) return
        const expiry = addMonths(startOfToday(), config.expiryMonths)
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
        if (Object.keys(validateCouponForm(form, toIsoDate(today), config)).length > 0) return

        run(async () => {
            const code = form.mobilizerCode.trim().toUpperCase()
            const quantity = Number(form.quantity)
            // Continue numbering and avoid reused codes, based on earlier events for this parent
            const format = config.couponCode
            const issued = await getIssuedCoupons(code)
            const { lastNumber, usedCodes } = summarizeIssued(code, issued, format)
            const { coupons: newCoupons } = buildCouponNumbers(code, lastNumber + 1, quantity, usedCodes, {
                format,
            })

            setField(FIELDS.generationDate, toFormDate(today, dateFormat))
            setField(FIELDS.couponNumbers, serializeCoupons(toCouponRecords(newCoupons)))
            setGeneratedNow(true)
        })
    }

    const openPdf = (download: boolean) =>
        run(async () => {
            if (!sheet) return
            const blob = await createPdf(sheet, config)
            const url = URL.createObjectURL(blob)
            if (download) {
                const link = document.createElement('a')
                link.href = url
                link.download = pdfFileName(sheet, config)
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
                <CouponForm
                    errors={formErrors}
                    loading={busy}
                    missing={missingRequired}
                    hideUntilReady={config.hideGenerateUntilReady}
                    onGenerate={handleGenerate}
                />
            )}

            {error && (
                <NoticeBox error title="Coupon generation failed">
                    {error}
                </NoticeBox>
            )}


            {sheet && (
                <CouponSheetView
                    sheet={sheet}
                    records={couponRecords}
                    config={config}
                    busy={busy}
                    unsaved={generatedNow}
                    onPreview={() => openPdf(false)}
                    onDownload={() => openPdf(true)}
                />
            )}

            {generatedNow && !busy && (
                <NoticeBox error title="Remember to save">
                    Coupons are stored with this event once you save it.
                </NoticeBox>
            )}
        </div>
    )
}

export default Plugin
