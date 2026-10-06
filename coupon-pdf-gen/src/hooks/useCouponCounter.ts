import { useDataEngine } from '@dhis2/app-runtime'
import { useCallback } from 'react'
import { DATASTORE_NAMESPACE } from '../constants'

type CounterValue = { lastNumber: number; updatedAt: string }

const isNotFound = (error: any) => error?.details?.httpStatusCode === 404

// Reserves `quantity` consecutive coupon numbers for a peer mobilizer and
// returns the first one. The last issued number is kept in the dataStore
// (dataStore/couponManagement/<mobilizerCode>) so numbering continues across events.
export const useCouponCounter = () => {
    const engine = useDataEngine()

    const reserve = useCallback(
        async (mobilizerCode: string, quantity: number): Promise<number> => {
            const key = encodeURIComponent(mobilizerCode)
            const resource = `dataStore/${DATASTORE_NAMESPACE}/${key}`

            let current: CounterValue | null = null
            try {
                const result = await engine.query({ counter: { resource } })
                current = result.counter as CounterValue
            } catch (error) {
                if (!isNotFound(error)) throw error
            }

            const lastNumber = current?.lastNumber ?? 0
            const data: CounterValue = {
                lastNumber: lastNumber + quantity,
                updatedAt: new Date().toISOString(),
            }
            if (current) {
                await engine.mutate({
                    resource: `dataStore/${DATASTORE_NAMESPACE}`,
                    id: key,
                    type: 'replace',
                    data,
                })
            } else {
                await engine.mutate({ resource, type: 'create', data })
            }

            return lastNumber + 1
        },
        [engine]
    )

    return { reserve }
}
