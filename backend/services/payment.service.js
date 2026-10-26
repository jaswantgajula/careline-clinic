import crypto from 'node:crypto';
import { Payment } from '../models/index.js';
import { razorpay, paymentsReady } from '../config/razorpay.js';
import { capturedPayment } from './booking.service.js';
export function validSignature(payload, signature, secret) {
  if (!signature || !secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}
let busy = false;
export async function reconcilePayments() {
  if (busy || !paymentsReady()) return;
  busy = true;
  try {
    const gateway = razorpay();
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    // Mark old uncaptured payments whose hold expired as failed so we don't query gateway forever
    await Payment.updateMany(
      { status: 'created', createdAt: { $lt: cutoff } },
      { $set: { status: 'failed' } },
    );
    for (const p of await Payment.find({
      status: 'created',
      orderId: { $exists: true },
      createdAt: { $gte: cutoff },
    })
      .sort({ lastCheckedAt: 1 })
      .limit(100)) {
      try {
        const list = await gateway.orders.fetchPayments(p.orderId);
        const paid = list.items.find((x) => x.status === 'captured');
        if (paid) await capturedPayment(paid);
      } catch (e) {
        console.error('Payment reconciliation failed:', e.message);
      } finally {
        await Payment.updateOne({ _id: p._id }, { $set: { lastCheckedAt: new Date() } });
      }
    }
    for (const p of await Payment.find({
      status: 'refund-pending',
      refundAttempts: { $lt: 5 },
    })
      .sort({ updatedAt: 1 })
      .limit(100)) {
      try {
        p.refundAttempts = (p.refundAttempts || 0) + 1;
        // Reuse an existing refund after a timeout or process restart.
        const existing = await gateway.payments.fetchMultipleRefund(p.paymentId, { count: 100 });
        let refund = existing.items.find(
          (x) => x.notes?.carelinePayment === String(p._id) && x.status !== 'failed',
        );
        if (!refund)
          refund = await gateway.payments.refund(p.paymentId, {
            amount: p.amount,
            notes: { carelinePayment: String(p._id) },
          });
        p.refundId = refund.id;
        p.refundError = undefined;
        if (refund.status === 'processed') p.status = 'refunded';
        await p.save();
      } catch (e) {
        p.refundError =
          p.refundAttempts >= 5
            ? 'Refund requires manual review after maximum automated retries.'
            : 'Refund could not be completed; retry scheduled.';
        await p.save();
        console.error('Refund retry:', e.message);
      }
    }
  } finally {
    busy = false;
  }
}
