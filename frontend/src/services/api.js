export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_ORIGIN}/api${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the clinic server. Please try again.');
  }
  const data = await response
    .json()
    .catch(() => ({ message: 'The server could not complete this request.' }));
  if (!response.ok) throw new Error(data.message || 'Please try again.');
  return data;
}
export async function checkout(config, user) {
  if (!window.Razorpay)
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load secure checkout.'));
      document.body.appendChild(script);
    });
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: config.key,
      order_id: config.order.id,
      amount: config.order.amount,
      currency: 'INR',
      name: 'Careline Clinic',
      description: 'Consultation · test payment',
      prefill: { name: user.name, email: user.email },
      theme: { color: '#3569ed' },
      handler: resolve,
      modal: {
        ondismiss: () =>
          reject(new Error('Checkout closed. Your reservation expires in 10 minutes.')),
      },
    });
    rzp.on('payment.failed', () =>
      reject(new Error('Payment failed. Your reservation will expire automatically.')),
    );
    rzp.open();
  });
}
