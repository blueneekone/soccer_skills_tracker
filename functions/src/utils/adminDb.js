const admin = require('firebase-admin');
exports.getAdminDb = () => admin.firestore();
