// api/cancel-subscription.js
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  Timestamp,
  FieldValue,
} from "firebase-admin/firestore";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const userData = userSnap.data();
    const subscription = userData.subscription;

    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({ error: "No active subscription found." });
    }

    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    await userRef.set(
      {
        subscription: {
          ...subscription,
          status: updatedSubscription.status,
          cancel_at_period_end:
            updatedSubscription.cancel_at_period_end || false,
          current_period_end: updatedSubscription.current_period_end
            ? Timestamp.fromMillis(updatedSubscription.current_period_end * 1000)
            : null,
          canceled_at: updatedSubscription.canceled_at
            ? Timestamp.fromMillis(updatedSubscription.canceled_at * 1000)
            : null,
          cancelRequestedAt: FieldValue.serverTimestamp(),
          lastUpdated: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({
      message: "Subscription cancellation scheduled for period end.",
    });
  } catch (err) {
    console.error("Cancel Subscription Error:", err);
    return res.status(500).json({
      error: err.message || "Internal Server Error",
    });
  }
}