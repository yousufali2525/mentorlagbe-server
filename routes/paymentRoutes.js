
import express from "express";
import Stripe from "stripe";
import { getAppDb } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key is missing");
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

router.post("/create-checkout-session", verifyToken, async (req, res) => {
  try {
    const user = req.user;

    const frontendUrl = (
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      ""
    )
      .split(",")[0]
      .trim()
      .replace(/\/+$/, "");

    if (!frontendUrl) {
      throw new Error("Frontend URL is missing");
    }

    if (!["student", "tutor"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only students and tutors can upgrade their plan",
      });
    }

    if (user.plan === "pro") {
      return res.status(400).json({
        success: false,
        message: "You already have a Pro plan",
      });
    }

    const amount = user.role === "tutor" ? 1500 : 1000;
    const planName = user.role === "tutor" ? "Pro Tutor" : "Pro Student";

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planName,
              description: "MentorLagbe Pro Membership",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        userName: user.name || "",
        userEmail: user.email || "",
        role: user.role,
        plan: "pro",
        planName,
      },
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancel`,
    });

    return res.status(200).json({
      success: true,
      message: "Checkout session created",
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create checkout session",
    });
  }
});

router.post("/webhook", async (req, res) => {
  let event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("Stripe webhook secret is missing");
    }

    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook Signature Error:", error.message);

    return res.status(400).json({
      success: false,
      message: "Webhook signature verification failed",
    });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.payment_status !== "paid") {
        return res.status(200).json({ received: true });
      }

      const {
        userId,
        userName,
        userEmail,
        role,
        plan,
        planName,
      } = session.metadata || {};

      if (
        !userId ||
        !["student", "tutor"].includes(role) ||
        plan !== "pro" ||
        session.mode !== "payment"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid checkout metadata",
        });
      }

      const expectedAmount = role === "tutor" ? 1500 : 1000;

      if (
        session.amount_total !== expectedAmount ||
        session.currency !== "usd"
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment amount or currency verification failed",
        });
      }

      const db = getAppDb();

      const userResult = await db.collection("users").updateOne(
        {
          _id: userId,
          role,
          isActive: { $ne: false },
        },
        {
          $set: {
            plan: "pro",
            updatedAt: new Date(),
          },
        }
      );

      if (userResult.matchedCount === 0) {
        return res.status(400).json({
          success: false,
          message: "User not found or role verification failed",
        });
      }

      const paidAt = session.created
        ? new Date(session.created * 1000)
        : new Date();

      const paymentEmail =
        userEmail ||
        session.customer_details?.email ||
        session.customer_email ||
        "";

      const paymentName =
        userName ||
        session.customer_details?.name ||
        "Unknown User";

      const transactionId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || session.id;

      await db.collection("payments").updateOne(
        { stripeSessionId: session.id },
        {
          $setOnInsert: {
            userId,
            userName: paymentName,
            userEmail: paymentEmail,
            userRole: role,
            planName:
              planName || (role === "tutor" ? "Pro Tutor" : "Pro Student"),
            amount: expectedAmount / 100,
            currency: session.currency,
            transactionId,
            stripeSessionId: session.id,
            paymentStatus: "paid",
            paidAt,
            email: paymentEmail,
            role,
            plan,
            createdAt: paidAt,
          },
        },
        { upsert: true }
      );
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook Processing Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
});

router.get("/my-payments", verifyToken, async (req, res) => {
  try {
    const payments = await getAppDb()
      .collection("payments")
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      total: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Payment History Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
    });
  }
});

export default router;
