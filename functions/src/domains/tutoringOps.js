const functions = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');
const { getStripe } = require('../../commerce'); // Assuming standard getStripe from commerce or we can just require stripe

// Based on blueprint
exports.bookTutoringSession = onCall(
    { secrets: ['STRIPE_SECRET_KEY'] },
    async (request) => {
    // 🛡 SafeSport and Authenticated Context Verification
    const admin = await import('firebase-admin');
    if (!admin.apps.length) admin.initializeApp();
    const db = admin.firestore();
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Verification failed.');
    }

    const { tutorEmail, hours } = request.data;
    const parentEmail = request.auth.token.email;

    // 1. Enforce Persona Rules
    const parentSnap = await db.collection('users').doc(parentEmail).get();
    const parentRole = parentSnap.data().role;
    if (parentRole === 'player' || parentRole === 'admin' || parentRole === 'commissioner') {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized persona.');
    }

    // 2. Fetch Tutor Profile & Scopes
    const tutorSnap = await db.collection('users').doc(tutorEmail).get();
    const tutorData = tutorSnap.data();
    if (!tutorSnap.exists || tutorData.role !== 'tutor') {
        throw new functions.https.HttpsError('not-found', 'Tutor profile not found.');
    }

    // Enforce sport-containment boundaries
    if (tutorData.sport !== parentSnap.data().sport) {
        throw new functions.https.HttpsError('invalid-argument', 'Tutors are restricted to active sport branches.');
    }

    const hourlyRate = tutorData.tutorProfile.ratePerHour;
    const totalGross = hourlyRate * hours;

    // 3. Calculate SSTracker Transaction Microcharge (2.5% platform fee)
    const platformFee = Math.round(totalGross * 0.025 * 100); // Mapped in cents

    // 4. Dispatch Stripe Destination Charge (Microcharge remains in Platform Vault)
    const paymentIntent = await stripe.paymentIntents.create({
        amount: totalGross * 100, // Cents
        currency: 'usd',
        payment_method_types: ['card'],
        application_fee_amount: platformFee, // SSTracker Microcharge
        transfer_data: {
            destination: tutorData.tutorProfile.stripeConnectedAccountId, // Tutor Payout Account
        },
        metadata: {
            parentEmail,
            tutorEmail,
            sport: tutorData.sport
        }
    });

    return {
        clientSecret: paymentIntent.client_secret,
        amountGross: totalGross,
        platformFee: platformFee / 100
    };
});
