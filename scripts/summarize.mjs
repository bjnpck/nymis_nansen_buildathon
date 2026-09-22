import { readFileSync } from 'node:fs'

const path = process.argv.slice(2).find(value => value !== '--')
if (!path) throw new Error('Usage: pnpm summary -- output/calls.jsonl')
const calls = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
const success = calls.filter(row => row.status >= 200 && row.status < 300)
const latency = success.map(row => row.latencyMs).sort((a, b) => a - b)
const countBy = (rows, key) => rows.reduce((out, row) => ((out[key(row)] = (out[key(row)] ?? 0) + 1), out), {})
console.log(JSON.stringify({ calls: calls.length, successes: success.length, failures: calls.length - success.length, endpointCounts: countBy(calls, row => row.endpoint), latency: latency.length ? { median: latency[Math.floor((latency.length - 1) * .5)], p95: latency[Math.floor((latency.length - 1) * .95)], max: latency.at(-1) } : null }, null, 2))
