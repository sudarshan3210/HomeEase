// upload_providers_debug.js
const admin = require("firebase-admin");
const fs = require("fs");

// ✅ Load Firebase credentials
let serviceAccount;
try {
  serviceAccount = require("./serviceAccountKey.json");
  console.log("✅ serviceAccountKey.json loaded successfully.");
} catch (err) {
  console.error("❌ Could not load serviceAccountKey.json:", err);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ✅ Read providers.json
let providers;
try {
  providers = JSON.parse(fs.readFileSync("providers.json", "utf8"));
  console.log(`✅ providers.json loaded. Total records: ${providers.length}`);
} catch (err) {
  console.error("❌ Could not read providers.json:", err);
  process.exit(1);
}

// ✅ Upload data
async function uploadProviders() {
  console.log(`Uploading ${providers.length} provider records to Firestore...`);

  const batch = db.batch();
  const collectionRef = db.collection("providers");

  providers.forEach((provider, index) => {
    const docRef = collectionRef.doc(); // auto-ID
    batch.set(docRef, {
      name: provider.name || "Unknown",
      city: provider.city || "Unknown",
      department: provider.service || provider.department || "Unknown",
      email: provider.email || "",
      phone: provider.phone || "",
      rate: provider.rate ? `₹${provider.rate}/hour` : "",
      available: provider.available || false,
      rating: provider.rating || 0,
      experience: provider.experience || 0,
      photoURL: provider.photo || "",
      about: provider.about || "",
      role: "provider",
      verified: false,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if ((index + 1) % 50 === 0) console.log(`Queued ${index + 1} records...`);
  });

  try {
    await batch.commit();
    console.log("✅ Upload complete!");
  } catch (err) {
    console.error("❌ Error uploading batch:", err);
  }
}

uploadProviders().catch((err) => {
  console.error("❌ Unexpected error:", err);
});
