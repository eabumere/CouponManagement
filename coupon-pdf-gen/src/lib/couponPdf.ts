import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { DEFAULT_CONFIG, PdfConfig } from '../constants'
import { formatLong, toIsoDate } from './dates'
import { Logo, Logos } from './logos'

export type CouponSheet = {
    cboName: string
    generationDate: Date
    mobilizerCode: string
    coupons: string[]
    expiryDate: Date
}

// A4 portrait, millimetres
const MARGIN_X = 25
const CONTENT_WIDTH = 210 - MARGIN_X * 2
const BODY_SIZE = 14
const LINE_HEIGHT = 8

const drawLogo = (doc: jsPDF, logo: Logo | undefined, x: number, width: number, alignRight = false) => {
    if (!logo) return
    const height = (logo.height / logo.width) * width
    doc.addImage(logo.dataUrl, 'PNG', alignRight ? x - width : x, 8, width, height)
}

// "Label: value" with a bold label; the value wraps onto following lines
const drawLabelValue = (
    doc: jsPDF,
    label: string,
    value: string,
    y: number,
    fontSize = BODY_SIZE,
    lineHeight = LINE_HEIGHT
): number => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', 'bold')
    doc.text(label, MARGIN_X, y)
    const labelWidth = doc.getTextWidth(label)
    doc.setFont('helvetica', 'normal')

    let x = MARGIN_X + labelWidth
    let line = ''
    const lines: { text: string; x: number }[] = []
    for (const word of `: ${value}`.split(' ')) {
        const candidate = line ? `${line} ${word}` : word
        const available = MARGIN_X + CONTENT_WIDTH - x
        if (line && doc.getTextWidth(candidate) > available) {
            lines.push({ text: line, x })
            line = word
            x = MARGIN_X
        } else {
            line = candidate
        }
    }
    lines.push({ text: line, x })

    lines.forEach((l, i) => doc.text(l.text, l.x, y + i * lineHeight))
    return y + lines.length * lineHeight
}

export const buildCouponPdf = (
    sheet: CouponSheet,
    logos: Logos,
    pdf: PdfConfig = DEFAULT_CONFIG.pdf,
    locale = DEFAULT_CONFIG.dateLocale
): Blob => {
    const { labels } = pdf
    const [r = 0, g = 0, b = 0] = pdf.titleColor
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })

    drawLogo(doc, logos.left, 19, 56)
    drawLogo(doc, logos.right, 193, 50, true)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.setTextColor(r, g, b)
    doc.text(pdf.title, 105, 40, { align: 'center' })
    doc.setTextColor(0, 0, 0)

    let y = drawLabelValue(doc, `${labels.cbo} `, sheet.cboName, 64)
    y = drawLabelValue(doc, labels.generationDate, formatLong(sheet.generationDate, locale), y + 14)
    y = drawLabelValue(doc, labels.mobilizerCode, sheet.mobilizerCode, y + 3)
    drawLabelValue(doc, labels.couponCount, String(sheet.coupons.length), y + 3)

    autoTable(doc, {
        startY: y + 17,
        margin: { left: MARGIN_X, right: MARGIN_X },
        head: [[labels.tableNumber, labels.tableCoupon]],
        body: sheet.coupons.map((coupon, i) => [String(i + 1), coupon]),
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 13,
            textColor: 0,
            lineColor: 0,
            lineWidth: 0.2,
            cellPadding: { top: 1.3, bottom: 1.3, left: 1.5, right: 1.5 },
        },
        headStyles: { fillColor: 255, textColor: 0, fontStyle: 'bold', fontSize: 14 },
        columnStyles: { 0: { cellWidth: 13 } },
    })

    const tableEnd = (doc as any).lastAutoTable.finalY as number
    y = tableEnd + 17
    if (y > 250) {
        doc.addPage()
        y = 30
    }
    y = drawLabelValue(doc, labels.expiryDate, formatLong(sheet.expiryDate, locale), y)
    drawLabelValue(doc, labels.notice, pdf.notice, y + 12, 11, 6)

    return doc.output('blob')
}

export const couponPdfFileName = (
    mobilizerCode: string,
    generationDate: Date,
    prefix = DEFAULT_CONFIG.pdf.fileNamePrefix
) => `${prefix}_${mobilizerCode}_${toIsoDate(generationDate)}.pdf`
