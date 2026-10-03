// Standard Razorpay Checkout (no pre-created order) only returns a payment id to
// the client, so the server must confirm it was actually captured before trusting it.
export async function verifyRazorpayPayment(
  paymentId: string,
  expectedAmountCents: number,
  keyId: string,
  keySecret: string
): Promise<boolean> {
  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return false;
    const payment = await res.json();
    return (payment.status === "captured" || payment.status === "authorized") && payment.amount === expectedAmountCents;
  } catch {
    return false;
  }
}
