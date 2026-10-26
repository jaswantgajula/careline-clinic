import Razorpay from 'razorpay';
export function paymentsReady() {
  return !!(
    process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') && process.env.RAZORPAY_KEY_SECRET
  );
}
export function razorpay() {
  if (!paymentsReady())
    throw Object.assign(new Error('Razorpay test payments are not configured yet.'), {
      status: 503,
    });
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}
