// Kept separate because Nansen validates these endpoint schemas independently.
export const RELATED_WALLET_CHAINS = new Set([
  'arbitrum', 'avalanche', 'base', 'bitcoin', 'bnb', 'ethereum', 'iotaevm',
  'linea', 'mantle', 'monad', 'near', 'optimism', 'plasma', 'polygon', 'ronin',
  'scroll', 'sei', 'solana', 'sonic', 'starknet', 'sui', 'ton', 'tron',
])
export const TRANSACTION_CHAINS = new Set([...RELATED_WALLET_CHAINS, 'all', 'hyperevm'])

const ALIASES = { eth: 'ethereum', mainnet: 'ethereum', arb: 'arbitrum', op: 'optimism', matic: 'polygon', bsc: 'bnb', xdai: 'gnosis' }

export function normalizeChain(value) {
  const key = String(value ?? '').trim().toLowerCase().replace(/[ _-]+/g, '')
  return key ? (ALIASES[key] ?? key) : null
}

export function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value ?? ''))
}

export function validatePair({ wallet, chain }, endpoint) {
  const normalizedChain = normalizeChain(chain)
  if (!isAddress(wallet)) {
    return { ok: false, normalizedChain, reason: String(wallet).includes('.') ? 'ENS/root name requires resolution before address-only endpoint dispatch' : 'malformed address' }
  }
  if (!normalizedChain) return { ok: false, normalizedChain, reason: 'missing chain' }
  const supported = endpoint === 'related-wallets' ? RELATED_WALLET_CHAINS : TRANSACTION_CHAINS
  if (!supported.has(normalizedChain)) return { ok: false, normalizedChain, reason: `unsupported Nansen ${endpoint} chain: ${normalizedChain}` }
  return { ok: true, wallet: String(wallet).toLowerCase(), chain: normalizedChain }
}
