import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type TestPageProps = {
  user: User
}

const coerceBigintParam = (value: string): number | string => {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return 0
  }

  const numeric = Number(trimmed)
  if (Number.isSafeInteger(numeric)) {
    return numeric
  }

  return trimmed
}

const coerceIdList = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return []
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return []
    }
    return trimmed.split(/[,;|]/g).map((entry) => entry.trim())
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => coerceIdList(entry))
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return [String(Math.trunc(value))]
  }

  if (typeof value === 'bigint') {
    return [value.toString()]
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((entry) => coerceIdList(entry))
  }

  return []
}

const extractCompanyMappingIdsFromUserMeta = (user: User): string[] => {
  const sources: Record<string, unknown>[] = []

  if (user.app_metadata && typeof user.app_metadata === 'object') {
    sources.push(user.app_metadata)
  }

  if (user.user_metadata && typeof user.user_metadata === 'object') {
    sources.push(user.user_metadata)
  }

  const keys = [
    'company_mapping_id',
    'company_mapping_ids',
    'customer_mapping_id',
    'customer_mapping_ids',
    'company_id',
    'company_ids',
    'customer_id',
    'customer_ids',
  ]

  const result = new Set<string>()

  for (const source of sources) {
    for (const key of keys) {
      const value = source[key]
      if (value === null || value === undefined) {
        continue
      }
      for (const candidate of coerceIdList(value)) {
        if (candidate.length > 0) {
          result.add(candidate)
        }
      }
    }
  }

  return Array.from(result)
}

function TestPage({ user }: TestPageProps) {
  const [companyIds, setCompanyIds] = useState<string[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)

  const companyIdOptions = useMemo(
    () => companyIds.map((value) => ({ value, label: value })),
    [companyIds],
  )

  const handleDiscoverCompanyIds = async () => {
    if (!supabase) {
      setError('Supabase client is not configured.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const discovered = new Set<string>(extractCompanyMappingIdsFromUserMeta(user))

      const { data: userRecord, error: userRecordError } = await supabase
        .from('users')
        .select('company_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (userRecordError && userRecordError.code !== 'PGRST116') {
        throw userRecordError
      }

      const rawCompanyId =
        (userRecord?.company_id as string | number | bigint | null | undefined) ?? null
      if (rawCompanyId !== null && rawCompanyId !== undefined) {
        discovered.add(String(rawCompanyId))
      }

      const resolved = Array.from(discovered).filter((value) => value.trim().length > 0)
      if (resolved.length === 0) {
        throw new Error('No company mapping IDs linked to your account.')
      }

      resolved.sort()
      setCompanyIds(resolved)
      setSelectedCompanyId((previous) => {
        if (previous && resolved.includes(previous)) {
          return previous
        }
        return resolved[0] ?? ''
      })
      setResult(null)
    } catch (discoverError) {
      console.error('Unable to resolve company mapping IDs', discoverError)
      const message =
        discoverError instanceof Error && discoverError.message.length > 0
          ? discoverError.message
          : 'Unable to resolve company mapping IDs.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!supabase) {
      setError('Supabase client is not configured.')
      return
    }

    const trimmedId = selectedCompanyId.trim()
    if (trimmedId.length === 0) {
      setError('Select or enter a company mapping ID.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const rpcParam = coerceBigintParam(trimmedId)

      const appClient = supabase.schema('app')
      const { data, error: rpcError } = await appClient.rpc('fn_company_licensing', {
        p_company_mapping_id: rpcParam,
      })

      if (rpcError) {
        throw rpcError
      }

      setResult(data)
    } catch (rpcCatchError) {
      console.error('fn_company_licensing failed', rpcCatchError)
      const message =
        rpcCatchError instanceof Error && rpcCatchError.message.length > 0
          ? rpcCatchError.message
          : 'Unexpected error fetching data.'
      setError(message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>fn_company_licensing tester</h1>
      <p>
        Select one of your linked <code>company_mapping_id</code> values or enter an ID manually to call the RPC
        <code> app.fn_company_licensing</code> and inspect the response.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: '260px' }}>
          <span style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Company Mapping ID</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              placeholder="Enter company mapping id..."
              style={{
                flexGrow: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #d0d5dd',
                fontSize: '1rem',
              }}
              list="company-id-options"
            />
            <button
              type="button"
              onClick={handleDiscoverCompanyIds}
              disabled={loading}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #0f172a',
                backgroundColor: '#fff',
                color: '#0f172a',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Find IDs
            </button>
          </div>
          <datalist id="company-id-options">
            {companyIdOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </datalist>
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{
            alignSelf: 'flex-end',
            padding: '0.65rem 1.2rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: 600,
            backgroundColor: '#0f172a',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Loading…' : 'Run RPC'}
        </button>
      </form>
      {error ? (
        <div
          style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            marginBottom: '1.5rem',
          }}
        >
          <strong>Error:</strong> {error}
          <p style={{ marginTop: '0.5rem' }}>
            Ensure you are authenticated and the selected ID is linked to your account (role-based access applies).
          </p>
        </div>
      ) : null}
      <section
        style={{
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          padding: '1rem',
          minHeight: '320px',
          overflow: 'auto',
        }}
      >
        <pre
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          {result ? JSON.stringify(result, null, 2) : 'Submit a company mapping ID to see results here.'}
        </pre>
      </section>
    </main>
  )
}

export default TestPage
