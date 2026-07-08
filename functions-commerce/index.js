/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

/**
 * functions-commerce — Stripe Connect, ticketing, subscriptions, rebates.
 * Domain sources are copied into this package by scripts/bundle-functions.cjs.
 */
require('./bootstrapAdmin');
const commerceHandlers = require('./commerce');
exports.createRegistrationIntent = commerceHandlers.createRegistrationIntent;
exports.handleRegistrationWebhook = commerceHandlers.handleRegistrationWebhook;
exports.createConnectOnboarding = commerceHandlers.createConnectOnboarding;
exports.initiateStripeConnect = commerceHandlers.initiateStripeConnect;
exports.getRegistrationStatus = commerceHandlers.getRegistrationStatus;

const ticketingHandlers = require('./ticketing');
exports.createTicketSaleIntent = ticketingHandlers.createTicketSaleIntent;
exports.handleTicketingWebhook = ticketingHandlers.handleTicketingWebhook;
exports.upsertTournamentEvent = ticketingHandlers.upsertTournamentEvent;
exports.publishTournamentEvent = ticketingHandlers.publishTournamentEvent;
exports.verifyScanToken = ticketingHandlers.verifyScanToken;

const ticketReceiptsHandlers = require('./ticketReceipts');
exports.sendTicketReceiptOnCreate = ticketReceiptsHandlers.sendTicketReceiptOnCreate;

const webhooksOps = require('./src/domains/webhooksOps');
exports.stripeWebhook = webhooksOps.stripeWebhook;
exports.createStripeCheckoutSession = webhooksOps.createStripeCheckoutSession;

const subscriptionHandlers = require('./subscription');
exports.createSubscription = subscriptionHandlers.createSubscription;

const legacyBillingHandlers = require('./legacyBillingOps');
exports.sunsetLegacySubscription = legacyBillingHandlers.sunsetLegacySubscription;
exports.sweepLegacySubscriptions = legacyBillingHandlers.sweepLegacySubscriptions;

const hotelRebateHandlers = require('./hotelRebates');
exports.submitHotelRebateRecord = hotelRebateHandlers.submitHotelRebateRecord;
exports.approveHotelRebatePayout = hotelRebateHandlers.approveHotelRebatePayout;

const hotelPartnerOpsHandlers = require('./hotelPartnerOps');
exports.provisionHotelPartner = hotelPartnerOpsHandlers.provisionHotelPartner;
exports.rotateHotelPartnerKeys = hotelPartnerOpsHandlers.rotateHotelPartnerKeys;
exports.setHotelPartnerStatus = hotelPartnerOpsHandlers.setHotelPartnerStatus;

const recruiterBillingHandlers = require('./recruiterBilling');
exports.recordRecruiterExport = recruiterBillingHandlers.recordRecruiterExport;
exports.cancelRecruiterAccount = recruiterBillingHandlers.cancelRecruiterAccount;

const pricingPolicyOps = require('./pricingPolicyOps');
exports.bootstrapPricingPolicy = pricingPolicyOps.bootstrapPricingPolicy;
exports.updatePricingPolicy = pricingPolicyOps.updatePricingPolicy;

const dunningOps = require('./src/domains/dunningOps');
exports.dunningCommsDispatch = dunningOps.dunningCommsDispatch;
