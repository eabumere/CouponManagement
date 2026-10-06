import epicLogoUrl from '../assets/epic-logo.png'
import usaFlagUrl from '../assets/usaid-flag.png'

export type Logo = { dataUrl: string; width: number; height: number }
export type Logos = { left?: Logo; right?: Logo }

const loadLogo = (url: string): Promise<Logo | undefined> =>
    new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            canvas.getContext('2d')?.drawImage(img, 0, 0)
            resolve({
                dataUrl: canvas.toDataURL('image/png'),
                width: img.naturalWidth,
                height: img.naturalHeight,
            })
        }
        // A missing logo should not block PDF generation
        img.onerror = () => resolve(undefined)
        img.src = url
    })

let cached: Promise<Logos> | undefined

export const loadLogos = (): Promise<Logos> => {
    cached ??= Promise.all([loadLogo(usaFlagUrl), loadLogo(epicLogoUrl)]).then(
        ([left, right]) => ({ left, right })
    )
    return cached
}
