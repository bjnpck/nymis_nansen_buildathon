import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { classify } from '../src/classify.mjs'
import { validatePair } from '../src/chains.mjs'
import { callNansen } from '../src/nansen-client.mjs'

const args = parseArgs(process.argv.slice(2))
const cohortPath = resolve(args.cohort ?? 'data/cohort.example.json')
const out = resolve(args.out ?? 'output')
const relatedTarget = numberArg(args.related, 140)
const transactionTarget = numberArg(args.transactions, 60)
const dryRun = Boolean(args['dry-run'])
const concurrency = Math.min(2, numberArg(args.concurrency, 2))
const BATCH_SIZE = 50

loadDotEnv()
const candidates = JSON.parse(readFileSync(cohortPath, 'utf8'))
if (!Array.isArray(candidates)) throw new Error('Cohort JSON must be an array')
const plan = buildPlan(candidates, relatedTarget, transactionTarget, dryRun)
if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, totalCandidatePairs: candidates.length * 2, validPairs: plan.calls.length, skippedPairs: plan.skipped.length, skippedByReason: countBy(plan.skipped, row => row.reason), requestedRelatedWallets: relatedTarget, requestedTransactions: transactionTarget, expectedRelatedWallets: plan.calls.filter(row => row.endpoint === 'related-wallets').length, expectedTransactions: plan.calls.filter(row => row.endpoint === 'transactions').length, expectedCreditConsumption: plan.calls.length, uniqueWallets: new Set(plan.calls.map(row => row.candidate.wallet)).size }, null, 2))
  process.exit(0)
}
if (!process.env.NANSEN_API_KEY) throw new Error('NANSEN_API_KEY is required for live calls')
if (concurrency < 1) throw new Error('concurrency must be at least 1')
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'skipped-pairs.jsonl'), plan.skipped.map(row => JSON.stringify({ ...row, timestamp: new Date().toISOString() })).join('\n') + (plan.skipped.length ? '\n' : ''))

const callsPath = join(out, 'calls.jsonl')
const batches = []
for (let start = 0; start < plan.calls.length; start += BATCH_SIZE) {
  const batch = await mapConcurrent(plan.calls.slice(start, start + BATCH_SIZE), concurrency, async item => {
    const result = await callNansen({ apiKey: process.env.NANSEN_API_KEY, ...item })
    const classification = result.status >= 200 && result.status < 300 ? classify(item.endpoint, result.rows, item.candidate) : null
    return { timestamp: new Date().toISOString(), cohort: item.candidate.cohort, ...withoutRows(result), resultRowCount: result.rows.length, classification }
  })
  for (const row of batch) appendFileSync(callsPath, `${JSON.stringify(row)}\n`)
  const successful = batch.filter(row => row.status >= 200 && row.status < 300)
  const errors = batch.filter(row => row.status < 200 || row.status >= 300)
  const summary = { checkpoint: batches.length + 1, completed: start + batch.length, successes: successful.length, failures: errors.length, rateLimits: batch.filter(row => row.status === 429).length, endpointCounts: countBy(batch, row => row.endpoint), latency: latency(batch), expectedCredits: successful.length, observedCredits: successful.reduce((sum, row) => sum + (row.creditsCharged ?? 0), 0) }
  batches.push(summary)
  writeFileSync(join(out, 'batch-summary.json'), `${JSON.stringify(batches, null, 2)}\n`)
  console.log(JSON.stringify(summary))
  if (summary.failures || summary.rateLimits || summary.observedCredits !== summary.expectedCredits) throw new Error('Campaign stopped: HTTP failure, rate limit, or unexpected endpoint pricing')
}
writeFileSync(join(out, 'campaign-summary.json'), `${JSON.stringify({ status: 'complete', requestedCalls: plan.calls.length, endpointCounts: countBy(plan.calls, row => row.endpoint), batches: batches.length }, null, 2)}\n`)

function buildPlan(candidates, relatedTarget, transactionTarget, allowShortage = false) {
  const skipped = []
  const valid = { 'related-wallets': [], transactions: [] }
  for (const endpoint of Object.keys(valid)) for (const source of candidates) {
    const result = validatePair(source, endpoint)
    if (!result.ok) { skipped.push({ wallet: source.wallet, requestedChain: source.chain, endpoint, normalizedChain: result.normalizedChain, reason: result.reason }); continue }
    valid[endpoint].push({ ...source, wallet: result.wallet, chain: result.chain })
  }
  const related = select(valid['related-wallets'], relatedTarget, 'related-wallets', allowShortage)
  const transactions = select(valid.transactions, transactionTarget, 'transactions', allowShortage)
  return { skipped, calls: interleave(related, transactions) }
}

function select(candidates, count, endpoint, allowShortage) {
  if (!candidates.length) throw new Error(`No valid ${endpoint} cohort entries`)
  const unique = [...new Map(candidates.map(candidate => [`${candidate.wallet}:${candidate.chain}`, candidate])).values()]
  if (unique.length < count && !allowShortage) throw new Error(`Insufficient distinct valid ${endpoint} pairs: ${unique.length}/${count}`)
  return unique.slice(0, count).map(candidate => ({ endpoint, candidate }))
}
function interleave(related, transactions) { const out = []; let r = 0; let t = 0; while (r < related.length || t < transactions.length) { for (let i = 0; i < 7 && r < related.length; i++) out.push(related[r++]); for (let i = 0; i < 3 && t < transactions.length; i++) out.push(transactions[t++]); } return out }
function withoutRows({ rows, ...result }) { return result }
function countBy(values, key) { return values.reduce((out, value) => ((out[key(value)] = (out[key(value)] ?? 0) + 1), out), {}) }
function latency(rows) { const values = rows.map(row => row.latencyMs).sort((a, b) => a - b); return values.length ? { median: values[Math.floor((values.length - 1) * .5)], p95: values[Math.floor((values.length - 1) * .95)], max: values.at(-1) } : null }
async function mapConcurrent(items, limit, task) { const out = []; let next = 0; await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (next < items.length) { const item = items[next++]; out.push(await task(item)) } })); return out }
function parseArgs(values) { const out = {}; for (let i = 0; i < values.length; i++) { const key = values[i]; if (!key.startsWith('--')) continue; out[key.slice(2)] = values[i + 1]?.startsWith('--') || values[i + 1] === undefined ? true : values[++i] } return out }
function numberArg(value, fallback) { const parsed = Number(value ?? fallback); if (!Number.isInteger(parsed) || parsed < 0) throw new Error('Call targets must be non-negative integers'); return parsed }
function loadDotEnv() { if (!existsSync('.env')) return; for (const line of readFileSync('.env', 'utf8').split('\n')) { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim() } }
