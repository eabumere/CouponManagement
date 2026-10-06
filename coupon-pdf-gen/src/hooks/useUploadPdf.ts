import { useDataEngine } from '@dhis2/app-runtime'
import { useCallback } from 'react'

// Uploads a file as a DHIS2 fileResource (multipart) and returns the value
// format Capture uses for FILE_RESOURCE fields: { name, value: fileResourceId }
export const useUploadPdf = () => {
    const engine = useDataEngine()

    return useCallback(
        async (blob: Blob, fileName: string) => {
            const file = new File([blob], fileName, { type: 'application/pdf' })
            const result: any = await engine.mutate({
                resource: 'fileResources',
                type: 'create',
                data: { file },
            })
            const fileResource = result?.response?.fileResource
            if (!fileResource?.id) {
                throw new Error('Upload of the coupon PDF did not return a file resource id')
            }
            return { name: fileResource.name ?? fileName, value: fileResource.id as string }
        },
        [engine]
    )
}
