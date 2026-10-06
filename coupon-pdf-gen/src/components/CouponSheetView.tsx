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
import { CouponSheet } from '../lib/couponPdf'
import { formatLong } from '../lib/dates'

type Props = {
    sheet: CouponSheet
    busy: boolean
    onPreview: () => void
    onDownload: () => void
}

const Detail = ({ label, value }: { label: string; value: string }) => (
    <div>
        <strong>{label}:</strong> {value}
    </div>
)

export const CouponSheetView = ({ sheet, busy, onPreview, onDownload }: Props) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Detail label="Community-Based Organization (CBO)" value={sheet.cboName || '-'} />
            <Detail label="Date of generation" value={formatLong(sheet.generationDate)} />
            <Detail label="Peer Mobilizer Code" value={sheet.mobilizerCode} />
            <Detail label="Number of Coupons Generated" value={String(sheet.coupons.length)} />
            <Detail label="Coupon Expiry Date" value={formatLong(sheet.expiryDate)} />
        </div>

        <DataTable layout="fixed" width="420px">
            <DataTableHead>
                <DataTableRow>
                    <DataTableColumnHeader width="60px">No.</DataTableColumnHeader>
                    <DataTableColumnHeader>Coupon Number</DataTableColumnHeader>
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
            <Button disabled={busy} onClick={onPreview}>
                Preview PDF
            </Button>
            <Button disabled={busy} onClick={onDownload}>
                Download PDF
            </Button>
        </ButtonStrip>
    </div>
)
