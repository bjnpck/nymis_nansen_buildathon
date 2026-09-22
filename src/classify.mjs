export function relationshipType(value) {
  const lower = String(value ?? '').toLowerCase()
  if (/first.*fund|fund.*first/.test(lower)) return 'First Funder'
  if (/safe|signer|co.?sign/.test(lower)) return 'Safe signer / co-signer / historical signer'
  if (/deploy|factory|create|contract/.test(lower)) return 'deployment/factory noise'
  return 'other'
}

export function classifyRelated(rows, candidate) {
  const knownAddresses = new Set((candidate.knownAddresses ?? []).map(value => String(value).toLowerCase()))
  const findings = []
  const counts = { alreadyKnown: 0, newUseful: 0, noise: 0, other: 0 }
  for (const row of rows) {
    const address = typeof row.address === 'string' ? row.address.toLowerCase() : ''
    const relation = typeof row.relation === 'string' ? row.relation : ''
    const category = relationshipType(relation)
    if (address && knownAddresses.has(address)) counts.alreadyKnown++
    else if (category === 'deployment/factory noise') counts.noise++
    else if (category === 'First Funder' || category === 'Safe signer / co-signer / historical signer') {
      counts.newUseful++
      findings.push({ category, comparison: 'candidate for independent NYMIS verification', classification: 'new useful candidate' })
    } else counts.other++
  }
  return { relationshipTypes: rows.map(row => relationshipType(row.relation)), counts, findings }
}

export function classifyTransactions(rows, candidate) {
  const knownHashes = new Set((candidate.knownHashes ?? []).map(value => String(value).toLowerCase()))
  let nymisConfirmed = 0
  let newSemanticContext = 0
  for (const row of rows) {
    const hash = typeof row.transaction_hash === 'string' ? row.transaction_hash.toLowerCase() : ''
    if (hash && knownHashes.has(hash)) nymisConfirmed++
    else if (hash && (row.source_type || (Array.isArray(row.token_transfers) && row.token_transfers.length)) && candidate.hasLocalEvidence) newSemanticContext++
  }
  return { relationshipTypes: [], counts: { nymisConfirmed, newSemanticContext }, findings: [] }
}

export function classify(endpoint, rows, candidate) {
  return endpoint === 'related-wallets' ? classifyRelated(rows, candidate) : classifyTransactions(rows, candidate)
}
