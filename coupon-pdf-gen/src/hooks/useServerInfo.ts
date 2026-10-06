import { useDataQuery } from '@dhis2/app-runtime'
import { DateFormat } from '../lib/dates'

const orgUnitQuery = {
    orgUnit: {
        resource: 'organisationUnits',
        id: ({ orgUnitId }: { orgUnitId: string }) => orgUnitId,
        params: { fields: 'displayName' },
    },
}

const dateFormatQuery = {
    dateFormat: { resource: 'systemSettings/keyDateFormat' },
}

// Organisation unit (CBO) name and the system date format used by Capture's form values
export const useServerInfo = (orgUnitId?: string) => {
    const orgUnit = useDataQuery<{ orgUnit: { displayName: string } }>(orgUnitQuery, {
        variables: { orgUnitId },
        lazy: !orgUnitId,
    })
    const settings = useDataQuery<{ dateFormat: { keyDateFormat?: string } | string }>(
        dateFormatQuery
    )

    const raw = settings.data?.dateFormat
    const rawFormat = typeof raw === 'string' ? raw : raw?.keyDateFormat
    const dateFormat: DateFormat = rawFormat === 'dd-MM-yyyy' ? 'dd-MM-yyyy' : 'yyyy-MM-dd'

    return {
        cboName: orgUnit.data?.orgUnit?.displayName ?? '',
        dateFormat,
        loading: settings.loading || (!!orgUnitId && orgUnit.loading),
    }
}
