import assert from 'node:assert/strict'
import { classifyRelated, relationshipType } from '../src/classify.mjs'
import { normalizeChain, validatePair } from '../src/chains.mjs'

const wallet = '0x0000000000000000000000000000000000000001'
assert.equal(normalizeChain('ETH'), 'ethereum')
assert.equal(validatePair({ wallet, chain: 'gnosis' }, 'related-wallets').ok, false)
assert.equal(validatePair({ wallet, chain: 'gnosis' }, 'transactions').ok, false)
assert.equal(validatePair({ wallet: 'example.eth', chain: 'ethereum' }, 'transactions').reason.includes('ENS'), true)
assert.equal(validatePair({ wallet, chain: 'ethereum' }, 'related-wallets').ok, true)
assert.equal(relationshipType('Multisig Signer of'), 'Safe signer / co-signer / historical signer')
const classified = classifyRelated([{ address: wallet, relation: 'First Funder' }, { address: '0x0000000000000000000000000000000000000002', relation: 'Contract Creator' }], { knownAddresses: [wallet] })
assert.deepEqual(classified.counts, { alreadyKnown: 1, newUseful: 0, noise: 1, other: 0 })
console.log('self-check: ok')
