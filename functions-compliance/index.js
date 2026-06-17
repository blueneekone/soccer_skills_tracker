'use strict';

/**
 * functions-compliance — vault, COPPA, WebAuthn, clearance, retention.
 * Domain sources are copied into this package by scripts/bundle-functions.cjs.
 * PII_VAULT_MASTER_KEY is bound in vaultOps (secrets on vaultSealPii / vaultUnsealPii).
 */
require('./bootstrapAdmin');
const vaultOps = require('./src/domains/vaultOps');
exports.vaultSealPii = vaultOps.vaultSealPii;
exports.vaultUnsealPii = vaultOps.vaultUnsealPii;

const shredOps = require('./src/domains/shredOps');
exports.shredSensitiveData = shredOps.shredSensitiveData;

const coppaHandlers = require('./coppa');
exports.sendParentalConsentEmail = coppaHandlers.sendParentalConsentEmail;
exports.verifyParentalConsent = coppaHandlers.verifyParentalConsent;
exports.generateWebAuthnChallenge = coppaHandlers.generateWebAuthnChallenge;
exports.verifyBiometricConsent = coppaHandlers.verifyBiometricConsent;
exports.directorOutOfBandClearance = coppaHandlers.directorOutOfBandClearance;
exports.generateConsentAttestationChallenge =
  coppaHandlers.generateConsentAttestationChallenge;
exports.attestParentalConsent = coppaHandlers.attestParentalConsent;

const webauthnHandlers = require('./webauthn');
exports.webauthnRegisterStart = webauthnHandlers.webauthnRegisterStart;
exports.webauthnRegisterFinish = webauthnHandlers.webauthnRegisterFinish;
exports.webauthnLoginStart = webauthnHandlers.webauthnLoginStart;
exports.webauthnLoginFinish = webauthnHandlers.webauthnLoginFinish;

const complianceHandlers = require('./compliance');
exports.generateCheckrEmbedToken = complianceHandlers.generateCheckrEmbedToken;
exports.checkrSessionTokens = complianceHandlers.checkrSessionTokens;
exports.backgroundCheckCallback = complianceHandlers.backgroundCheckCallback;
exports.checkrWebhook = complianceHandlers.checkrWebhook;
exports.getComplianceRoster = complianceHandlers.getComplianceRoster;
exports.requestManualOverride = complianceHandlers.requestManualOverride;
exports.revokeCoachClearance = complianceHandlers.revokeCoachClearance;
exports.initiateAnkoredUplink = complianceHandlers.initiateAnkoredUplink;
exports.simulateClearance = complianceHandlers.simulateClearance;
exports.directorInitiateCoachClearance = complianceHandlers.directorInitiateCoachClearance;

const verifyDocHandlers = require('./verifyDocument');
exports.verifyDocument = verifyDocHandlers.verifyDocument;
exports.processPendingDocDeletions = verifyDocHandlers.processPendingDocDeletions;
exports.getRetentionReport = verifyDocHandlers.getRetentionReport;

const complianceOps = require('./src/domains/complianceOps');
exports.enqueueMinorRetentionPurge = complianceOps.enqueueMinorRetentionPurge;
exports.processMinorRetentionQueue = complianceOps.processMinorRetentionQueue;
exports.purgeExpiredMinorData = complianceOps.purgeExpiredMinorData;
exports.linkHousehold = complianceOps.linkHousehold;
exports.parentGrantVpcConsent = complianceOps.parentGrantVpcConsent;
exports.registrarTransferPlayer = complianceOps.registrarTransferPlayer;

const operativeOps = require('./src/domains/operativeOps');
exports.parentSignCoppaWaiver = operativeOps.parentSignCoppaWaiver;
exports.parentProvisionOperative = operativeOps.parentProvisionOperative;
exports.parentLinkOperativeToTeam = operativeOps.parentLinkOperativeToTeam;
exports.operativeSignInWithDispatch = operativeOps.operativeSignInWithDispatch;
exports.generatePlayerOTP = operativeOps.generatePlayerOTP;
exports.validatePlayerOTP = operativeOps.validatePlayerOTP;
