import {
    Button,
    ButtonStrip,
    DataTable,
    DataTableBody,
    DataTableCell,
    DataTableColumnHeader,
    DataTableHead,
    DataTableRow,
} from '@dhis2/ui'
import React from 'react'
import { CouponConfig } from '../constants'
import { CouponSheet } from '../lib/couponPdf'
import { formatLong } from '../lib/dates'

type Props = {
    sheet: CouponSheet
    config: CouponConfig
    busy: boolean
    // Coupons generated but the event not saved yet: no preview/download
    unsaved: boolean
    onPreview: () => void
    onDownload: () => void
}

const Detail = ({ label, value }: { label: string; value: string }) => (
    <div>
        <strong>{label}:</strong> {value}
    </div>
)

export const CouponSheetView = ({ sheet, config, busy, unsaved, onPreview, onDownload }: Props) => {
    const { labels } = config.pdf
    const formatDate = (date: Date) => formatLong(date, config.dateLocale)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Detail label={labels.cbo} value={sheet.cboName || '-'} />
                <Detail label={labels.generationDate} value={formatDate(sheet.generationDate)} />
                <Detail label={labels.mobilizerCode} value={sheet.mobilizerCode} />
                <Detail label={labels.couponCount} value={String(sheet.coupons.length)} />
                <Detail label={labels.expiryDate} value={formatDate(sheet.expiryDate)} />
            </div>

            <DataTable layout="fixed" width="420px">
                <DataTableHead>
                    <DataTableRow>
                        <DataTableColumnHeader width="60px">
                            {labels.tableNumber}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader>{labels.tableCoupon}</DataTableColumnHeader>
                    </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                    {sheet.coupons.map((coupon, i) => (
                        <DataTableRow key={coupon}>
                            <DataTableCell>{i + 1}</DataTableCell>
                            <DataTableCell>{coupon}</DataTableCell>
                        </DataTableRow>
                    ))}
                </DataTableBody>
            </DataTable>

            <ButtonStrip>
                <Button disabled={busy || unsaved} onClick={onPreview}>
                    Preview PDF
                </Button>
                <Button disabled={busy || unsaved} onClick={onDownload}>
                    Download PDF
                </Button>
            </ButtonStrip>
            {unsaved && (
                <div style={{ fontSize: 13, color: '#6c7787' }}>
                    Save the event to preview or download the PDF
                </div>
            )}
        </div>
    )
}
