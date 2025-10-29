
javascript
// This is server-side code for Vercel (Node.js)
// File: /api/create-checkout.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Set CORS headers to allow requests from your website
  res.setHeader('Access-Control-Allow-Origin', '*'); // For production, replace '*' with your website's domain
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { items, email } = req.body;

      // Format items for Stripe's API
      const lineItems = items.map(item => {
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.name,
            },
            unit_amount: item.price * 100, // Price in cents
          },
          quantity: 1,
        };
      });

      // Create a checkout session with Stripe
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${req.headers.origin}/?success=true`, // Redirect back to your site on success
        cancel_url: `${req.headers.origin}/?canceled=true`, // Redirect back on cancellation
        customer_email: email,
      });
      
      // Send the session URL back to the frontend
      res.status(200).json({ url: session.url });

    } catch (err) {
      console.error('Stripe Error:', err.message);
      res.status(500).json({ error: { message: err.message } });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
