// src/DevHarness.tsx
// Local test page: renders the plugin with mock Capture app props,
// so it can be exercised with `npm start` outside the Capture app.
// Note: generating coupons here updates the real dataStore counter on the proxied server.
import { useDataQuery } from '@dhis2/app-runtime'
import React, { useState } from 'react'
import { FIELDS } from './constants'
import Plugin from './Plugin'
import { SetFieldValueProps } from './Plugin.types'

const fieldsMetadata = Object.fromEntries(Object.values(FIELDS).map((alias) => [alias, {} as any]))

// Use the current user's first org unit as the event org unit (CBO)
const meQuery = { me: { resource: 'me', params: { fields: 'organisationUnits[id]' } } }

export default function DevHarness() {
    const [values, setValues] = useState<Record<string, any>>({})
    const [key, setKey] = useState(0)
    const { data } = useDataQuery<{ me: { organisationUnits: { id: string }[] } }>(meQuery)
    const orgUnitId = data?.me?.organisationUnits?.[0]?.id

    const setFieldValue = ({ fieldId, value }: SetFieldValueProps) => {
        console.log('setFieldValue', fieldId, value)
        setValues((prev) => ({ ...prev, [fieldId]: value }))
    }

    const newEvent = () => {
        setValues({})
        setKey((k) => k + 1)
    }

    return (
        <div style={{ padding: 16 }}>
            <h3>Plugin test harness</h3>
            <button type="button" onClick={newEvent}>
                New event
            </button>
            {/* Stand-ins for the regular Capture fields that are mapped to the plugin */}
            <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
                {[FIELDS.mobilizerCode, FIELDS.quantity, FIELDS.expiryDate].map((alias) => (
                    <label key={alias} style={{ display: 'flex', flexDirection: 'column' }}>
                        {alias}
                        <input
                            value={values[alias] ?? ''}
                            onChange={(e) => setFieldValue({ fieldId: alias, value: e.target.value })}
                        />
                    </label>
                ))}
            </div>
            {data && (
                <Plugin
                    key={key}
                    values={values}
                    errors={{}}
                    warnings={{}}
                    formSubmitted={false}
                    fieldsMetadata={fieldsMetadata}
                    orgUnitId={orgUnitId}
                    setFieldValue={setFieldValue}
                    setContextFieldValue={(v) => console.log('setContextFieldValue', v)}
                />
            )}
            <pre>{JSON.stringify(values, null, 2)}</pre>
        </div>
    )
}
