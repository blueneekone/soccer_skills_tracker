const admin = require('firebase-admin');

/**
 * Lazy accessor — defers Firestore init until first handler invocation
 * @returns {import('firebase-admin').firestore.Firestore}
 */
function getAdminDb() {
    return admin.firestore();
}

module.exports = {
    getAdminDb,
};
