import { useDataQuery } from '@dhis2/app-runtime'
import { useMemo } from 'react'
import { CONFIG_DATASTORE, DEFAULT_CONFIG } from '../constants'
import { mergeConfig } from '../lib/config'

const query = {
    config: { resource: `dataStore/${CONFIG_DATASTORE.namespace}/${CONFIG_DATASTORE.key}` },
}

// Settings from the dataStore merged over the defaults in constants.ts.
// If the entry does not exist or cannot be read, the defaults are used.
export const useConfig = () => {
    const { data, loading, error } = useDataQuery<{ config: unknown }>(query)

    const config = useMemo(() => {
        if (error) {
            if ((error as any)?.details?.httpStatusCode !== 404) {
                console.warn('Coupon plugin: could not read dataStore config, using defaults', error)
            }
            return DEFAULT_CONFIG
        }
        return mergeConfig(data?.config)
    }, [data, error])

    return { config, loading }
}
