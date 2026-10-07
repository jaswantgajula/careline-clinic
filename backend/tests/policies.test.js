import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { slotsFor, canChange, canComplete } from '../services/policies.js';
import { validSignature } from '../services/payment.service.js';
const d = { days: [1, 2, 3, 4, 5, 6], start: 9, end: 17, breakStart: 13, breakEnd: 14, leave: [] };
test('slot generation follows clinic timezone and removes lunch', () => {
  const slots = slotsFor(d, '2026-10-08', new Date('2026-10-07T00:00Z'));
  assert.equal(slots.length, 14);
  assert.equal(slots[0], '2026-10-08T03:30:00.000Z');
  assert.ok(!slots.includes('2026-10-08T07:30:00.000Z'));
});
test('rejects leave, closed days, invalid dates and dates beyond horizon', () => {
  const now = new Date('2026-10-07T00:00Z');
  assert.deepEqual(slotsFor({ ...d, leave: ['2026-10-08'] }, '2026-10-08', now), []);
  assert.deepEqual(slotsFor(d, '2026-10-11', now), []);
  assert.deepEqual(slotsFor(d, '2026-12-01', now), []);
  assert.deepEqual(slotsFor(d, '2026-02-31', now), []);
});
test('cutoff is inclusive at two hours; completion requires end of slot', () => {
  const now = new Date('2026-10-07T10:00Z');
  assert.equal(canChange('2026-10-07T12:00Z', now), true);
  assert.equal(canChange('2026-10-07T11:59Z', now), false);
  assert.equal(canComplete('2026-10-07T09:31Z', now), false);
  assert.equal(canComplete('2026-10-07T09:30Z', now), true);
});
test('payment verification rejects altered payloads and malformed signatures', () => {
  const secret = 'secret';
  const sig = crypto.createHmac('sha256', secret).update('order|payment').digest('hex');
  assert.ok(validSignature('order|payment', sig, secret));
  assert.equal(validSignature('other|payment', sig, secret), false);
  assert.equal(validSignature('order|payment', 'bad', secret), false);
  assert.equal(validSignature('order|payment', sig, ''), false);
});
