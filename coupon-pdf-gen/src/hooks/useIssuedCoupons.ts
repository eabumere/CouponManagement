import { useDataEngine } from '@dhis2/app-runtime'
import { useCallback } from 'react'
import { parseCoupons } from '../lib/coupons'

type FieldRef = { name?: string; code?: string }
type Ids = { mobilizerDe: string; couponsDe: string; stages: { id: string; program: string }[] }

// Capture does not pass ids to the plugin, so look the data elements up by code (if set)
// or name, then find the program stage(s) that hold the couponNumbers data element.
const resolveIds = async (engine: any, mobilizer: FieldRef, coupons: FieldRef): Promise<Ids> => {
    const filterFor = (field: FieldRef) =>
        field.code ? `code:eq:${field.code}` : `displayName:eq:${field.name}`
    const matches = (field: FieldRef) => (de: any) =>
        field.code ? de.code === field.code : de.displayName === field.name

    const { dataElements } = await engine.query({
        dataElements: {
            resource: 'dataElements',
            params: {
                fields: 'id,code,displayName',
                filter: [filterFor(mobilizer), filterFor(coupons)],
                rootJunction: 'OR',
                paging: false,
            },
        },
    })
    const list = dataElements?.dataElements ?? []
    const mobilizerDe = list.find(matches(mobilizer))?.id
    const couponsDe = list.find(matches(coupons))?.id
    if (!mobilizerDe || !couponsDe) {
        throw new Error('Could not find the Peer Mobilizer Code / coupon numbers data elements')
    }

    const { programStages } = await engine.query({
        programStages: {
            resource: 'programStages',
            params: {
                fields: 'id,program[id]',
                filter: `programStageDataElements.dataElement.id:eq:${couponsDe}`,
                paging: false,
            },
        },
    })
    const stages = (programStages?.programStages ?? []).map((s: any) => ({
        id: s.id,
        program: s.program?.id,
    }))
    return { mobilizerDe, couponsDe, stages }
}

let cachedIds: Promise<Ids> | undefined

// Returns every coupon already issued to `parent`, read from the couponNumbers of
// saved EPOA events whose Peer Mobilizer Code equals `parent`.
// Only events the user can access are searched, and unsaved events are not visible.
export const useIssuedCoupons = (mobilizer: FieldRef, coupons: FieldRef, orgUnitMode: string) => {
    const engine = useDataEngine()

    return useCallback(
        async (parent: string): Promise<string[]> => {
            cachedIds ??= resolveIds(engine, mobilizer, coupons).catch((error) => {
                cachedIds = undefined
                throw error
            })
            const { mobilizerDe, couponsDe, stages } = await cachedIds

            const issued: string[] = []
            for (const stage of stages) {
                const { events } = await engine.query({
                    events: {
                        resource: 'tracker/events',
                        params: {
                            program: stage.program,
                            programStage: stage.id,
                            ouMode: orgUnitMode,
                            filter: `${mobilizerDe}:eq:${parent}`,
                            fields: 'event,dataValues[dataElement,value]',
                            paging: false,
                        },
                    },
                })
                // `instances` (2.41+) or `events` (older tracker API)
                const list: any[] = (events as any)?.instances ?? (events as any)?.events ?? []
                for (const event of list) {
                    const value = event.dataValues?.find((dv: any) => dv.dataElement === couponsDe)?.value
                    issued.push(...parseCoupons(value).map((c) => c.clientCoupon))
                }
            }
            return issued
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [engine, mobilizer.code, mobilizer.name, coupons.code, coupons.name, orgUnitMode]
    )
}
