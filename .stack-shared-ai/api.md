# Public API

### `src/lib/actions/swipe.ts`

- swipe(node: HTMLElement, options: SwipeOptions): ActionReturn<SwipeOptions, SwipeAttributes>

### `src/lib/components/coach/TacticalEngine.svelte.ts`

- createTacticalWarRoom(host: TacticalGridHost): { pitchSvgEl: SVGSVGElement; activeRouteColor: ...

### `src/lib/components/phone/PhoneLinkEngine.svelte.ts`

class PhoneLinkEngine
  - state: PhoneLinkState
  - errorMessage: string
  - sentToPhone: string
  - verifiedPhone: string
  - #otpAbort: AbortController
  - #confirmationResult: ConfirmationResult
  - #mirrorFn: HttpsCallable<MirrorPhoneVerificationInput, Mir...
  - async sendCode(phoneE164: string, verifier: RecaptchaVerifier): Promise<void>
  - async confirm(code: string): Promise<void>
  - reset(): void
  - setOtpAbort(ctrl: AbortController): void
  - startWebOtpListener(): void
  - #abortOtpListener(): void
  - #handleError(err: unknown): void

### `src/lib/components/player/skill-tree/SkillTreeEngine.svelte.ts`

class SkillTreeEngine
  - #armory: ArmoryEngine
  - selectedNodeId: string
  - focusedBranch: string | number | symbol
  - hoveredNodeId: string
  - revealedTransitions: Set<string>
  - isNodeVisible(nodeId: string): boolean
  - accentForBranch(_attr: string | number | symbol): string
  - selectNode(id: string): void
  - focusBranch(attr: string | number | symbol): void
  - hoverNode(id: string): void
  - #nodeState(progress: number, threshold: number): NodeState
  - #nodeStateById(nodeId: string): NodeState
  - #computeEdge(node: SyntheticNode, axisDeg: number): { edgeX1: number; edgeY1: number; edgePath: str...

### `src/lib/components/player/skill-tree/snowflakeGeometry.ts`

- bezierEdgePath(x1: number, y1: number, x2: number, y2: number): string
- branchAxisAngle(attr: string | number | symbol): number
- hexPolygonPoints(cx: number, cy: number, r: number, rotateDeg: number): string
- nodePosition(rank: 1 | 2 | 3, fanOffsetDeg: number, axisDeg: number): { x: number; y: number; }
- spokeEndpoints(attr: string | number | symbol, prismEdgeR: number, outerR: number): { x1: number; y1: number; x2: number; y2: numbe...

### `src/lib/components/uplink/UplinkRedeemEngine.svelte.ts`

class UplinkRedeemEngine
  - state: RedeemState
  - errorMessage: string
  - redirectTo: string
  - #redeemFn: HttpsCallable<RedeemMagicUplinkPayload, RedeemM...
  - async redeem(token: string): Promise<void>

### `src/lib/services/apiClient.svelte.ts`

class ApiError extends Error
  - status: number
  - body: unknown

class RateLimitError extends Error
  - scope: "uid" | "cell"
  - retryAfter: number

### `src/lib/services/commerce.svelte.ts`

class CommerceEngine
  - registration: RegistrationRecord
  - paymentStatus: PaymentStatus
  - clientSecret: string
  - registrationId: string
  - feeAmountCents: number
  - isLoading: boolean
  - isConfirming: boolean
  - error: string
  - isPaid: boolean
  - needsPayment: boolean
  - feeLabel: string
  - init(): void
  - destroy(): void
  - async createIntent(feeAmountDollars: number): Promise<void>
  - async confirmPayment(cardElement: unknown, billingName: string): Promise<void>

### `src/lib/services/comms.svelte.ts`

class CommsEngine
  - phase: SendPhase
  - lastResult: BroadcastResult
  - error: string
  - isSending: boolean
  - lastSendSucceeded: boolean
  - async broadcastMessage(input: BroadcastMessageInput): Promise<BroadcastResult>
  - reset(): void

class SafeSportViolation extends Error

### `src/lib/services/dopamine.svelte.ts`

- async dopamineExplosion(kind: DopamineKind, origin: { x: number; y: number; }): Promise<void>
- async dopamineOnCallable(callablePromise: Promise<T>, opts: DopamineOpts): Promise<T>
- async dopamineOnCommit(writePromise: Promise<BatchWriteResult>, opts: DopamineOpts): Promise<BatchWriteResult>

### `src/lib/services/feeLedger.svelte.ts`

class FeeLedgerEngine
  - ytdGrossCents: number
  - ytdFeesCents: number
  - ytdTxnCount: number
  - recentEntries: PlatformFeeLedgerEntry[]
  - monthlySparkline: MonthlySparklinePoint[]
  - loading: boolean
  - error: string
  - effectiveRateBp: number
  - breakdownByType: FeeBreakdownRow[]
  - hasData: boolean
  - connect(tenantId: string): void
  - disconnect(): void
  - legacySubscriptionYtdCostCents(): number
  - savingsCentsVsLegacy(): number

### `src/lib/services/inviteService.ts`

- async consumeInviteCode(code: string): Promise<ConsumeInviteResult>
- async generateInviteCode(targetRole: TenantRole, tenantId: string, teamId: string, usageLimit: number): Promise<GenerateInviteResult>

### `src/lib/services/league.svelte.ts`

class LeagueManager
  - seasons: LeagueSchema.Season[]
  - fixtures: LeagueSchema.Fixture[]
  - fixturesHasMore: boolean
  - fixturesLoadingMore: boolean
  - opponents: LeagueSchema.Opponent[]
  - matchResults: Record<string, LeagueSchema.MatchResult>
  - loading: boolean
  - error: string
  - activeSeason: any
  - upcomingFixtures: LeagueSchema.Fixture[]
  - completedFixtures: LeagueSchema.Fixture[]
  - opponentMap: any
  - enrichedUpcoming: any[]
  - enrichedCompleted: any[]
  - opponentsWithThreat: any[]
  - FIXTURE_PAGE_SIZE: 20
  - connect(tenantId: string, teamId: string): void
  - async loadMoreFixtures(): Promise<void>
  - async createFixture(fixtureData: CreateFixtureInput): Promise<string>
  - async completeMatch(fixtureId: string, results: CompleteMatchInput): Promise<CompleteMatchResult>
  - async archiveSeason(seasonId: string): Promise<void>
  - async getOpponentHistory(opponentId: string): Promise<LeagueSchema.MatchResult[]>
  - destroy(): void

### `src/lib/services/messaging.svelte.ts`

class FcmService
  - permission: NotificationPermission | "unsupported" | "loading"
  - token: string
  - lastMessage: { title: string; body: string; category?: strin...
  - isRegistering: boolean
  - error: string
  - isGranted: boolean
  - isDenied: boolean
  - isPending: boolean
  - isSupported: boolean
  - init(): void
  - async requestAndRegister(): Promise<void>
  - async deregisterDevice(): Promise<void>

### `src/lib/services/org.svelte.ts`

class OrgManager
  - org: any
  - teams: TenantTeam[]
  - activeMissions: ActiveMissionDoc[]
  - invites: InviteDoc[]
  - playerCount: number
  - avgVanRating: number
  - loading: boolean
  - error: string
  - mutationError: string
  - metrics: OrgMetrics
  - activeInvites: InviteDoc[]
  - coachInvites: InviteDoc[]
  - playerInvites: InviteDoc[]
  - initializing: boolean
  - connect(tenantId: string): void
  - async createTeam(input: CreateTeamInput): Promise<string>
  - async assignCoach({ teamId, coachEmail }: AssignCoachInput): Promise<void>
  - async generateInvite(targetRole: TenantRole, teamId: string, usageLimit: number): Promise<{ code: string; expiresAt: Date; }>
  - destroy(): void

### `src/lib/services/pricingEngine.svelte.ts`

- computePlatformFee(args: ComputeFeeArgs): ComputeFeeResult

### `src/lib/services/recaptchaService.svelte.ts`

- createInvisibleRecaptcha(containerId: string): RecaptchaVerifier
- tearDownRecaptcha(verifier: RecaptchaVerifier): void

### `src/lib/services/scholar.svelte.ts`

- computeEligibility(gpa: number): EligibilityStatus
- gpaTrend(points: GpaTrendPoint[]): "up" | "down" | "stable"

class ScholarEngine
  - record: AcademicRecord
  - loading: boolean
  - error: string
  - gpa: number
  - studyHours: number
  - eligibility: EligibilityStatus
  - hasScholarBadge: boolean
  - trend: "up" | "down" | "stable"
  - gpaLabel: string
  - subscribe(): void
  - unsubscribe(): void
  - async saveRecord(data: Partial<Omit<AcademicRecord, "playerEmail" | "u...): Promise<void>

class TutorRosterEngine
  - studentEmails: string[]
  - engines: ScholarEngine[]
  - loading: boolean
  - error: string
  - avgGpa: number
  - eligibleCount: number
  - probationCount: number
  - ineligibleCount: number
  - scholarsCount: number
  - init(tutorEmail: string): void
  - destroy(): void

### `src/lib/services/ticketCheckout.svelte.ts`

- createTicketCheckout(): { readonly state: TicketCheckoutState; init: (e...

### `src/lib/services/ticketScanner.svelte.ts`

- createTicketScanner(eventId: string, mountId: string): { readonly state: ScannerState; start: () => Pr...

### `src/lib/services/weather.svelte.ts`

class WeatherAegis
  - snapshot: WeatherSnapshot
  - loading: boolean
  - error: string
  - active: boolean
  - lastDangerAt: number
  - allClearCountdownSecs: number
  - alertLevel: AlertLevel
  - allClearActive: boolean
  - hasConcern: boolean
  - allClearLabel: string
  - lightningLabel: string
  - deploymentStatus: DeploymentStatus
  - init(lat: number, lng: number, role: string): void
  - destroy(): void
  - async refresh(): Promise<void>

### `src/lib/services/writes.svelte.ts`

- async commitDrillCompletion(payload: DrillCompletionPayload): Promise<BatchWriteResult>
- async commitGritAward(payload: GritAwardPayload): Promise<BatchWriteResult>
- async commitMatchResult(payload: MatchCompletionPayload): Promise<BatchWriteResult>
- async commitWorkoutCompletion(payload: WorkoutCompletionPayload): Promise<BatchWriteResult>

### `src/lib/states/ArmoryEngine.svelte.ts`

class ArmoryEngine
  - userId: string
  - totalXP: number
  - playerStats: ScoutsSix
  - xpHistory: XpHistoryEntry[]
  - lastActiveUtc: string
  - decayState: any
  - streakFreeze: any
  - freezeClaimPending: boolean
  - lastBoostSponsor: string
  - lastBoostMultiplier: number
  - lastBoostAt: string
  - async loadPlayerData(userId: string): Promise<void>
  - awardXP(amount: number, reason: string): void
  - updateStat(statName: keyof ScoutsSix, newValue: string | number): void
  - hydrateStats(partial: Partial<ScoutsSix>): void
  - reset(): void
  - async consumeStreakFreeze(): Promise<void>

### `src/lib/states/CoOpEngine.svelte.ts`

class CoOpEngine
  - bounties: BountyDoc[]
  - fundingSource: any
  - householdChildren: ChildArmorySnapshot[]
  - loading: boolean
  - error: string
  - mutating: boolean
  - householdId: string
  - parentEmail: string
  - #bountyUnsub: Unsubscribe
  - bountyProgress(b: BountyDoc): number
  - async init(parentEmail: string, householdId: string, childEmails: string[]): Promise<void>
  - destroy(): void
  - #subscribeToBounties(): void
  - async #loadHousehold(householdId: string): Promise<void>
  - async #loadChildArmory(childEmails: string[]): Promise<void>
  - async linkFundingSource(fundingSourceId: string): Promise<TremendousFundingSourceDoc>
  - async createBounty(input: CreateBountyInput): Promise<string>
  - async voidBounty(bountyId: string): Promise<void>
  - async activateBoost(playerEmail: string, presetId: string): Promise<{ boostId: string; expiresAt: string; m...
  - async listFundingSources(): Promise<{ id: string; label: string; method: st...

### `src/lib/states/SimulatorEngine.svelte.ts`

class SimulatorEngine
  - isPlaying: boolean
  - currentTime: number
  - maxDuration: number
  - playbackSpeed: number
  - timelineAuthorCapMs: number
  - isLoadingCartridge: boolean
  - cartridgeSweepEpoch: number
  - startTime: number
  - animationFrameId: number
  - sweepClearTimer: NodeJS.Timeout
  - tick: () => void
  - loadCartridge(payload: TacticalCartridge): void
  - togglePlay(): void
  - play(): void
  - pause(): void
  - reset(): void
  - scrub(timeMs: number): void

### `src/lib/states/TrajectoryEngine.svelte.ts`

class TrajectoryEngine
  - gvi: number
  - monthsActive: number
  - currentMonthXp: number
  - lastMonthXp: number
  - lastComputedAt: string
  - capsules: MemoryCapsuleDoc[]
  - loading: boolean
  - error: string
  - ackPending: boolean
  - #userKey: string
  - #unsubTrajectory: () => void
  - #unsubCapsules: () => void
  - connect(userKey: string): void
  - async acknowledgeCapsule(capsuleId: string): Promise<void>
  - destroy(): void
  - #subscribeTrajectory(userKey: string): void
  - #subscribeCapsules(userKey: string): void
  - #unsubAll(): void

### `src/lib/states/war-room/TacticalInputEngine.svelte.ts`

- createTacticalInputEngine(host: TacticalPointerHost): { onRouteStrokePointerDown: (ev: PointerEvent, ...

### `src/lib/states/war-room/routeModel.ts`

- midCtrl(x1: number, y1: number, x2: number, y2: number): { cx: number; cy: number; }
- normalizeRoute(r: unknown): TacticalRoute
- routePathD(r: TacticalRoute): string
- sampleRoutePointAt(r: TacticalRoute, u: number): { x: number; y: number; }

### `src/lib/states/war-room/tacticalGridPlayback.svelte.ts`

- applyStaggeredPlayback(host: TacticalPlaybackHost, elapsedLoop: number, opts: { playing: boolean; applyPositionKinetics?: boo...): void
- orchestrationCycleMs(drawnRoutesRaw: unknown[]): number
- wireTacticalPlayback(simulator: SimulatorEngine, host: TacticalPlaybackHost): void

### `src/lib/states/war-room/tacticalGridRadial.svelte.ts`

- createTacticalRadialHub(deps: TacticalRadialDeps): { readonly radialOpen: boolean; readonly radial...

### `src/lib/types/backgroundCheck.ts`

- clearanceLabel(c: ClearanceDoc): { label: string; tone: "pending" | "cleared" | ...
- requiresClearance(role: unknown): boolean

### `src/lib/types/cells.ts`

- isDefaultCell(cellId: string): boolean
- resolveCellId(raw: unknown): string

### `src/lib/types/league.ts`

- computeThreatAssessment(stats: LeagueSchema.OpponentStats): LeagueSchema.ThreatAssessment
- formatFixtureDate(val: AnyDate, facilityTimezone: string): string
- toTimestampMs(val: AnyDate): number

### `src/lib/types/pricing.ts`

- bpToPercentLabel(rateBp: number): string
- centsToUsd(cents: number): string

### `src/lib/types/tournamentEvent.ts`

- isEventOpen(event: TournamentEventDoc): boolean
- labelToTierId(label: string): string
- totalRemainingCapacity(event: TournamentEventDoc): number

### `src/lib/utils/phoneUtils.ts`

- isValidPhone(raw: string, country: string): boolean
- prefixAndNationalToE164(prefix: string, national: string): string
- toE164(raw: string, country: string): string

### `src/lib/utils/scoutsSixNormalise.ts`

- normaliseAllScoutsSix(stats: ScoutsSix): Record<string | number | symbol, number>
- normaliseScoutsSix(key: string | number | symbol, raw: string): number

### `src/lib/utils/time.ts`

- formatFixtureDate(val: AnyDate, facilityTimezone: string): string
- formatFixtureDateFull(val: AnyDate, facilityTimezone: string): FixtureDateDisplay
- getBrowserTimezone(): string
- getTzAbbr(tz: string, date: Date): string
- isValidTimezone(tz: string): boolean
- relativeTime(val: AnyDate): string
- toMs(val: AnyDate): number
- toUtcFirestoreTimestamp(val: AnyDate): { seconds: number; nanoseconds: number; }

### `src/routes/(app)/admin/rl-policy/RlPolicyEngine.svelte.ts`

class RlPolicyEngine
  - policyState: any
  - trainingRuns: RlTrainingRunDoc[]
  - safetyOverrideCount7d: number
  - isLoading: boolean
  - saveState: SaveState
  - saveError: string
  - draftAbPercent: number
  - draftRollbackVersion: number
  - frozen: any
  - abPercent: any
  - policyVersion: any
  - subscribe(): void
  - unsubscribe(): void
  - async setAbPercent(abPercent: number): Promise<void>
  - async toggleFreeze(): Promise<void>
  - async rollback(targetVersion: number): Promise<void>

### `src/routes/(app)/admin/sports-configs/SportsConfigEditorEngine.svelte.ts`

class SportsConfigEditorEngine
  - viewMode: ViewMode
  - selectedConfig: any
  - dirtyBuffer: any
  - saveState: SaveState
  - saveError: string
  - configs: SportsConfigDoc[]
  - isLoading: boolean
  - showArchived: boolean
  - schemaBumpWarning: boolean
  - latestAuditReport: AuditReport
  - fns: Functions
  - db: Firestore
  - async loadConfigs(): Promise<void>
  - selectConfig(cfg: SportsConfigDoc): void
  - startCreate(): void
  - cancelEdit(): void
  - updateAttribute(index: number, field: string, value: string): void
  - updatePalette(field: "fg" | "glow" | "ring", value: string): void
  - checkSchemaBump(): void
  - async save(): Promise<void>
  - async archive(sportId: string): Promise<void>
  - async loadLatestAuditReport(): Promise<void>

### `src/routes/(app)/coach/assignments/IntentEngine.svelte.ts`

class IntentEngine
  - intents: IntentDoc[]
  - roster: RosterEntry[]
  - isLoadingIntents: boolean
  - isLoadingRoster: boolean
  - error: string
  - draftAttributeId: string
  - draftRequiredXp: number
  - draftDurationDays: number
  - draftScope: IntentScope
  - draftTargetUids: string[]
  - draftPriority: number
  - deployPhase: DeployPhase
  - deployError: string
  - mutationError: string
  - enrichedIntents: EnrichedIntent[]
  - canDeploy: boolean
  - attributes: { id: string; name: string; hexColor: string; }[]
  - connect(teamId: string, tenantId: string, clubId: string, sportId: string): void
  - destroy(): void
  - toggleDraftUid(uid: string): void
  - selectAllRosterUids(): void
  - clearRosterSelection(): void
  - resetDraft(): void
  - async deployIntent(): Promise<void>
  - async cancelIntent(intentId: string): Promise<void>
  - async extendIntent(intentId: string, additionalDays: number): Promise<void>

### `src/routes/(app)/parent/dashboard/CarRideEngine.svelte.ts`

class CarRideEngine
  - pendingFixtureId: string
  - publicScore: PublicScore
  - lockedMetrics: LockedMetrics
  - attested: boolean
  - conversationAnchor: string
  - isLoading: boolean
  - isAttesting: boolean
  - error: string
  - shouldIntercept: boolean
  - async init(linkedPlayerEmail: string, tenantId: string, clubId: string, urlFixtureId: string): Promise<void>
  - async attest(): Promise<void>

### `src/routes/api/ingest/+server.ts`

- async POST({ request }: { request: any; }): Promise<Response>

### `src/routes/api/v1/[...path]/+server.ts`

- DELETE(event: any): Promise<Response>
- GET(event: any): Promise<Response>
- PATCH(event: any): Promise<Response>
- POST(event: any): Promise<Response>
- PUT(event: any): Promise<Response>
