// api/create-checkout-session.js
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed" });
  }

  try {
    const { priceId, planName = "unknown", billingPeriod = "monthly" } = req.body;
    const authHeader = req.headers.authorization;

    if (!priceId) {
      return res.status(400).json({ error: "Missing priceId in request body" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(500).json({ error: "Missing FIREBASE_SERVICE_ACCOUNT" });
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or malformed Authorization header" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VITE_PUBLIC_BASE_URL ||
      "https://notewellai.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        priceId,
        planName,
        billingPeriod,
        userEmail,
      },
      success_url: `${baseUrl}/upgrade-success?plan=${planName}&billingPeriod=${billingPeriod}`,
      cancel_url: `${baseUrl}/upgrade-cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe Checkout Session Error:", err);
    return res.status(500).json({
      error: err.message || "Failed to create checkout session",
    });
  }
}