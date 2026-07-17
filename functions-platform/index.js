/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

/**
 * functions-platform — cell routing, /v1 apiGateway, admin + analytics.
 * Domain sources are copied into this package by scripts/bundle-functions.cjs.
 * Load order: bootstrapAdmin → tenantUtils → cellRouter → apiGateway (and rest).
 * apiGateway pulls partnerHandlers/hotelRebates.js which calls admin.firestore()
 * at module load — bootstrap must run first (see docs/FUNCTIONS_DEPLOY.md).
 */
require('./bootstrapAdmin');
require('./tenantUtils');
require('./cellRouter');

const cellBootstrapHandlers = require('./cellBootstrap');
exports.bootstrapCellRegistry = cellBootstrapHandlers.bootstrapCellRegistry;
exports.registerDedicatedCell = cellBootstrapHandlers.registerDedicatedCell;
exports.activateCell = cellBootstrapHandlers.activateCell;

const cellProvisioningHandlers = require('./cellProvisioning');
exports.provisionTenantCell = cellProvisioningHandlers.provisionTenantCell;
exports.peekTenantCell = cellProvisioningHandlers.peekTenantCell;

const cellMigrationHandlers = require('./cellMigration');
exports.startTenantMigration = cellMigrationHandlers.startTenantMigration;
exports.markExportComplete = cellMigrationHandlers.markExportComplete;
exports.markImportComplete = cellMigrationHandlers.markImportComplete;
exports.verifyTenantOnCell = cellMigrationHandlers.verifyTenantOnCell;
exports.executeCutover = cellMigrationHandlers.executeCutover;
exports.rollbackTenantMigration = cellMigrationHandlers.rollbackTenantMigration;

const cellObservabilityHandlers = require('./cellObservability');
exports.flagTenantForPromotion = cellObservabilityHandlers.flagTenantForPromotion;
exports.acknowledgePromotionFlag = cellObservabilityHandlers.acknowledgePromotionFlag;
exports.evaluateCellPromotions = cellObservabilityHandlers.evaluateCellPromotions;
exports.purgeGatewayCaches = cellObservabilityHandlers.purgeGatewayCaches;

const cellSeedHandlers = require('./cellSeed');
exports.seedSyntheticTenant = cellSeedHandlers.seedSyntheticTenant;
exports.purgeSyntheticTenant = cellSeedHandlers.purgeSyntheticTenant;

const apiGatewayHandlers = require('./apiGateway');
exports.apiGateway = apiGatewayHandlers.apiGateway;

const analyticsTriggers = require('./analytics');
exports.onAnalyticsUserWritten = analyticsTriggers.onUserWritten;
exports.onAnalyticsClubWritten = analyticsTriggers.onClubWritten;
exports.onAnalyticsLicenseWritten = analyticsTriggers.onLicenseWritten;

const adminOps = require('./src/domains/adminOps');
exports.syncUserClaims = adminOps.syncUserClaims;
exports.listTeamsForClub = adminOps.listTeamsForClub;
exports.listJoinableClubs = adminOps.listJoinableClubs;
exports.resolveDispatchCode = adminOps.resolveDispatchCode;
exports.logSecurityAudit = adminOps.logSecurityAudit;
exports.generateLicense = adminOps.generateLicense;
exports.directorSaveClubBranding = adminOps.directorSaveClubBranding;
exports.directorInviteCoach = adminOps.directorInviteCoach;
exports.claimCoachInvite = adminOps.claimCoachInvite;
exports.secureAllocateTeamSeats = adminOps.secureAllocateTeamSeats;
exports.secureAddPlayer = adminOps.secureAddPlayer;
exports.secureBulkAddPlayers = adminOps.secureBulkAddPlayers;
exports.secureRemovePlayer = adminOps.secureRemovePlayer;
exports.secureUpdateJersey = adminOps.secureUpdateJersey;
exports.directorUpsertField = adminOps.directorUpsertField;
exports.secureBookField = adminOps.secureBookField;
exports.assignTenantClaims = adminOps.assignTenantClaims;
exports.executeSupportCommand = adminOps.executeSupportCommand;

const operativeOps = require('./src/domains/operativeOps');
exports.impersonateUserFn = operativeOps.impersonateUserFn;
exports.purgeUserDataFn = operativeOps.purgeUserDataFn;

const interoperabilityOps = require('./src/domains/interoperabilityOps');
exports.extractTenantData = interoperabilityOps.extractTenantData;
exports.vampireIngestRows = interoperabilityOps.vampireIngestRows;
