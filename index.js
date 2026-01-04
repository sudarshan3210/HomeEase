const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ✅ 1. Log admin verification actions
exports.logAdminActions = functions.firestore
  .document("providers/{providerId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // If provider is verified now but wasn’t before
    if (!before.verified && after.verified) {
      await db.collection("audit_logs").add({
        admin: "admin@fewdot.com",
        action: "Verified provider",
        target: after.email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Logged admin verification for ${after.email}`);
    }
  });

// ✅ 2. Notify provider when a new booking is made
exports.notifyProviderOnBooking = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const providerEmail = data.providerEmail;

    await db.collection("notifications").add({
      to: providerEmail,
      message: `New booking from ${data.userEmail} for ${data.department}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
    console.log(`Notification created for ${providerEmail}`);
  });

// ✅ 3. Auto update provider’s total earnings when booking completed
exports.updateEarningsOnCompletion = functions.firestore
  .document("bookings/{bookingId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== "Completed" && after.status === "Completed") {
      const providerEmail = after.providerEmail;
      const rate = after.rate || 0;

      const providerRef = db.collection("providers").where("email", "==", providerEmail);
      const snapshot = await providerRef.get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.update({
          totalEarnings: admin.firestore.FieldValue.increment(rate),
          completedJobs: admin.firestore.FieldValue.increment(1),
        });
        console.log(`Updated earnings for ${providerEmail}`);
      }
    }
  });
