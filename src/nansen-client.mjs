const BASE_URL = 'https://api.nansen.ai'

export function requestBody(endpoint, wallet, chain, now = new Date()) {
  const pagination = { page: 1, per_page: 20 }
  if (endpoint === 'related-wallets') return { address: wallet, chain, pagination }
  return {
    address: wallet,
    chain,
    date: { from: '2025-01-01T00:00:00Z', to: now.toISOString() },
    hide_spam_token: true,
    pagination,
  }
}

export async function callNansen({ apiKey, endpoint, wallet, chain, fetchImpl = fetch }) {
  const path = endpoint === 'related-wallets'
    ? '/api/v1/profiler/address/related-wallets'
    : '/api/v1/profiler/address/transactions'
  const body = requestBody(endpoint, wallet, chain)
  const started = Date.now()
  let response
  let text = ''
  try {
    response = await fetchImpl(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    })
    text = await response.text()
  } catch (error) {
    return { endpoint, path, wallet, chain, request: body, status: 0, latencyMs: Date.now() - started, rows: [], creditsCharged: null, creditsRemaining: null, error: error instanceof Error ? error.message : String(error) }
  }
  let payload = {}
  try { payload = JSON.parse(text) } catch { /* Raw responses are deliberately not retained. */ }
  const rows = Array.isArray(payload.data) ? payload.data : []
  return {
    endpoint, path, wallet, chain, request: body, status: response.status,
    latencyMs: Date.now() - started, rows,
    creditsCharged: numericHeader(response.headers, 'x-nansen-credits-cost'),
    creditsRemaining: numericHeader(response.headers, 'x-nansen-credits-remaining'),
    error: response.ok ? null : (payload.error ?? payload.message ?? `HTTP ${response.status}`),
  }
}

function numericHeader(headers, name) {
  const value = Number(headers.get(name) ?? '')
  return Number.isFinite(value) ? value : null
}
