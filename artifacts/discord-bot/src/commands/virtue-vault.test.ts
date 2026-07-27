import test from 'node:test';
import assert from 'node:assert/strict';
import { getDepositVirtueGain, getWithdrawalVirtuePenalty } from './virtue-vault.js';

test('deposit grants one virtue per 5 million', () => {
  assert.equal(getDepositVirtueGain(4_999_999), 0);
  assert.equal(getDepositVirtueGain(5_000_000), 1);
  assert.equal(getDepositVirtueGain(12_000_000), 2);
});

test('withdrawal applies the correct virtue penalty', () => {
  assert.equal(getWithdrawalVirtuePenalty(99_999), 20);
  assert.equal(getWithdrawalVirtuePenalty(100_000), 50);
  assert.equal(getWithdrawalVirtuePenalty(1_000_000), 50);
  assert.equal(getWithdrawalVirtuePenalty(1_000_001), Number.POSITIVE_INFINITY);
});
