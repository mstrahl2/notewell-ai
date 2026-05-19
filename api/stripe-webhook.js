// api/stripe-webhook.js
import { buffer } from "micro";
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  FieldValue,
} from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export const config = {
  api: {
    bodyParser: false,
  },
};

async function findUserBySubscriptionId(subscriptionId) {
  const snapshot = await db
    .collection("users")
    .where("subscription.stripeSubscriptionId", "==", subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  return snapshot.docs[0];
}

function getTierFromSubscription(subscription) {
  const amount = subscription?.items?.data?.[0]?.price?.unit_amount;

  if (amount === 1900) return "unlimited";
  if (amount === 900) return "pro";

  return "paid";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  let rawBody;

  try {
    rawBody = await buffer(req);
  } catch (err) {
    console.error("Failed to read request buffer:", err);
    return res.status(400).send("Invalid request body");
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).send("Missing Stripe signature header");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const {
        userId,
        priceId,
        planName = "paid",
        billingPeriod = "monthly",
        userEmail = "unknown",
      } = session.metadata || {};

      if (!userId || !priceId || !session.subscription) {
        return res.status(400).send("Missing required checkout metadata");
      }

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription
      );

      const cleanPlanName = planName.toLowerCase();
      const tier =
        cleanPlanName === "pro" || cleanPlanName === "unlimited"
          ? cleanPlanName
          : getTierFromSubscription(subscription);

      const subscriptionData = {
        status: subscription.status || "active",
        priceId,
        planName: tier,
        billingPeriod,
        userEmail,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        current_period_end: subscription.current_period_end
          ? Timestamp.fromMillis(subscription.current_period_end * 1000)
          : null,
        startedAt: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(userId).set(
        {
          tier,
          subscription: subscriptionData,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.status(200).send("Subscription recorded");
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object;
      const userDoc = await findUserBySubscriptionId(subscription.id);

      if (!userDoc) {
        return res.status(200).send("No matching user");
      }

      const isDeleted = event.type === "customer.subscription.deleted";
      const tier = isDeleted ? "free" : getTierFromSubscription(subscription);

      const updateData = {
        tier,
        subscription: {
          status: subscription.status,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer,
          planName: tier,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          current_period_end: subscription.current_period_end
            ? Timestamp.fromMillis(subscription.current_period_end * 1000)
            : null,
          canceled_at: subscription.canceled_at
            ? Timestamp.fromMillis(subscription.canceled_at * 1000)
            : null,
          ended_at: subscription.ended_at
            ? Timestamp.fromMillis(subscription.ended_at * 1000)
            : null,
          lastUpdated: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      };

      await userDoc.ref.set(updateData, { merge: true });

      return res.status(200).send("Subscription updated");
    }

    return res.status(200).send("Webhook received");
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).send(err.message || "Webhook handler failed");
  }
}