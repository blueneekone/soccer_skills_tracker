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

const cellRegistryHandlers = require("./src/domains/cellRegistry");
exports.bootstrapCellRegistry = cellRegistryHandlers.bootstrapCellRegistry;
exports.registerDedicatedCell = cellRegistryHandlers.registerDedicatedCell;
exports.activateCell = cellRegistryHandlers.activateCell;
const cellRegistryHandlers = require("./src/domains/cellRegistry");
exports.provisionTenantCell = cellRegistryHandlers.provisionTenantCell;
exports.peekTenantCell = cellRegistryHandlers.peekTenantCell;

const cellMigrationHandlers = require("./src/domains/cellMigration");
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
exports.purgeGatewayCaches = apiGatewayHandlers.purgeGatewayCaches;

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
exports.updateUserRole = adminOps.updateUserRole;
exports.syncUserClaims = require("./src/domains/claimsOps").syncUserClaims;
exports.listTeamsForClub = adminOps.listTeamsForClub;
exports.listJoinableClubs = adminOps.listJoinableClubs;
exports.resolveDispatchCode = adminOps.resolveDispatchCode;
exports.logSecurityAudit = adminOps.logSecurityAudit;
exports.generateLicense = require("../functions-commerce/commerce").generateLicense;
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
exports.assignTenantClaims = require("./src/domains/claimsOps").assignTenantClaims;
exports.executeSupportCommand = adminOps.executeSupportCommand;

const operativeOps = require('./src/domains/operativeOps');
exports.impersonateUserFn = require("./src/domains/claimsOps").impersonateUserFn;
exports.purgeUserDataFn = operativeOps.purgeUserDataFn;
const globalAdminOs = require('./src/domains/globalAdminOs');
exports.loginAs = globalAdminOs.loginAs;
exports.rightToBeForgotten = globalAdminOs.rightToBeForgotten;
exports.listAllUsers = globalAdminOs.listAllUsers;
exports.repairUserClaims = require("./src/domains/claimsOps").repairUserClaims;
exports.resetUserPassword = globalAdminOs.resetUserPassword;
exports.disableUser = globalAdminOs.disableUser;
exports.purgeUser = globalAdminOs.purgeUser;
exports.createTeam = globalAdminOs.createTeam;
exports.deleteTeam = globalAdminOs.deleteTeam;
exports.linkUserToTeam = globalAdminOs.linkUserToTeam;

const { onChannelCreated } = require('./src/onChannelCreated.js');
exports.onChannelCreated = onChannelCreated;

const weatherOps = require('./src/domains/weatherOps');
exports.processTomorrowIoAlert = weatherOps.processTomorrowIoAlert;
