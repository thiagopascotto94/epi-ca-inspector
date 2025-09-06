import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

admin.initializeApp();

const stripe = new Stripe(functions.config().stripe.secret, {
    apiVersion: "2024-06-20",
});

export const createCheckoutSession = functions.https.onCall(async (data, context) => {
    const { planId } = data;
    const uid = context.auth?.uid;

    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    try {
        const planDoc = await admin.firestore().collection("plans").doc(planId).get();
        if (!planDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Plan not found.");
        }
        const plan = planDoc.data() as any;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: plan.name,
                        description: plan.description,
                    },
                    unit_amount: plan.price * 100, // Price in cents
                },
                quantity: 1,
            }],
            mode: "subscription",
            success_url: "http://localhost:5173/subscription?success=true", // Replace with your success URL
            cancel_url: "http://localhost:5173/subscription?canceled=true", // Replace with your cancel URL
            client_reference_id: uid,
            subscription_data: {
                metadata: {
                    planId: planId,
                    userId: uid,
                }
            }
        });

        return { sessionId: session.id };
    } catch (error) {
        console.error("Stripe session creation failed:", error);
        throw new functions.https.HttpsError("internal", "Could not create checkout session.");
    }
});

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = functions.config().stripe.webhook_secret;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err: any) {
        console.error("Webhook signature verification failed.", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
            event.data.object.id,
            {
                expand: ['line_items'],
            }
        );
        const lineItems = sessionWithLineItems.line_items;
        if (!lineItems) {
            console.error("No line items found in session");
            res.status(400).send("No line items found");
            return
        }
        const planId = lineItems.data[0].price?.id;
        const userId = session.client_reference_id as string;

        if (userId && planId) {
            const paymentData = {
                userId: userId,
                planId: planId,
                amount: session.amount_total ? session.amount_total / 100 : 0,
                currency: session.currency,
                status: session.payment_status,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                stripePaymentId: session.payment_intent
            };

            try {
                // Update user's plan
                await admin.firestore().collection("users").doc(userId).update({
                    planId: planId,
                });
                console.log(`Successfully updated plan for user ${userId} to ${planId}`);

                // Create payment record
                await admin.firestore().collection("payments").add(paymentData);
                console.log(`Successfully created payment record for user ${userId}`);

            } catch (error) {
                console.error(`Failed to update plan or create payment for user ${userId}:`, error);
            }
        }
    }

    res.status(200).send();
});
