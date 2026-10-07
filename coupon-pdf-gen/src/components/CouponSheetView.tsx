import {
    Button,
    ButtonStrip,
    DataTable,
    DataTableBody,
    DataTableCell,
    DataTableColumnHeader,
    DataTableHead,
    DataTableRow,
    Tag,
} from '@dhis2/ui'
import React from 'react'
import { CouponConfig } from '../constants'
import { CouponSheet } from '../lib/couponPdf'
import { CouponRecord } from '../lib/coupons'
import { formatLong, parseDate } from '../lib/dates'

type Props = {
    sheet: CouponSheet
    // Coupons with redemption status, as stored in couponNumbers
    records: CouponRecord[]
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

export const CouponSheetView = ({
    sheet,
    records,
    config,
    busy,
    unsaved,
    onPreview,
    onDownload,
}: Props) => {
    const { labels } = config.pdf
    const viewLabels = config.view.labels
    const formatDate = (date: Date) => formatLong(date, config.dateLocale)
    const formatRedeemedAt = (value: string | null) => {
        if (!value) return '–'
        const date = parseDate(value)
        return date ? formatDate(date) : value
    }
    const redeemedCount = records.filter((r) => r.redeemed).length
    const summary = viewLabels.summary
        .replace('{count}', String(redeemedCount))
        .replace('{total}', String(records.length))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Detail label={labels.cbo} value={sheet.cboName || '-'} />
                <Detail label={labels.generationDate} value={formatDate(sheet.generationDate)} />
                <Detail label={labels.mobilizerCode} value={sheet.mobilizerCode} />
                <Detail label={labels.couponCount} value={String(sheet.coupons.length)} />
                <Detail label={labels.expiryDate} value={formatDate(sheet.expiryDate)} />
            </div>

            <div>{summary}</div>

            <div style={{ maxWidth: 720 }}>
                <DataTable layout="fixed" width="100%">
                    <DataTableHead>
                        <DataTableRow>
                            <DataTableColumnHeader width="60px">
                                {labels.tableNumber}
                            </DataTableColumnHeader>
                            <DataTableColumnHeader>{labels.tableCoupon}</DataTableColumnHeader>
                            <DataTableColumnHeader width="120px">
                                {viewLabels.redeemed}
                            </DataTableColumnHeader>
                            <DataTableColumnHeader width="180px">
                                {viewLabels.redeemedAt}
                            </DataTableColumnHeader>
                        </DataTableRow>
                    </DataTableHead>
                    <DataTableBody>
                        {records.map((record, i) => (
                            <DataTableRow key={record.clientCoupon}>
                                <DataTableCell>{i + 1}</DataTableCell>
                                <DataTableCell>{record.clientCoupon}</DataTableCell>
                                <DataTableCell>
                                    {record.redeemed ? (
                                        <Tag positive>{viewLabels.yes}</Tag>
                                    ) : (
                                        <Tag>{viewLabels.no}</Tag>
                                    )}
                                </DataTableCell>
                                <DataTableCell>{formatRedeemedAt(record.redeemedAt)}</DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                </DataTable>
            </div>

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
