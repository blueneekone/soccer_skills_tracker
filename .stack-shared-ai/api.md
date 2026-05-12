# Public API

### `src/lib/actions/swipe.ts`

- swipe(node: HTMLElement, options: SwipeOptions): ActionReturn<SwipeOptions, SwipeAttributes>

### `src/lib/components/coach/TacticalEngine.svelte.ts`

- createTacticalWarRoom(host: TacticalGridHost): { pitchSvgEl: SVGSVGElement; activeRouteColor: ...

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
  - async completeMatch(fixtureId: string, results: CompleteMatchInput): Promise<void>
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

### `src/lib/states/ArmoryEngine.svelte.ts`

class ArmoryEngine
  - userId: string
  - totalXP: number
  - playerStats: ScoutsSix
  - xpHistory: XpHistoryEntry[]
  - async loadPlayerData(userId: string): Promise<void>
  - awardXP(amount: number, reason: string): void
  - updateStat(statName: keyof ScoutsSix, newValue: string | number): void
  - hydrateStats(partial: Partial<ScoutsSix>): void
  - reset(): void

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

### `src/lib/types/league.ts`

- computeThreatAssessment(stats: LeagueSchema.OpponentStats): LeagueSchema.ThreatAssessment
- formatFixtureDate(val: AnyDate, facilityTimezone: string): string
- toTimestampMs(val: AnyDate): number

### `src/lib/utils/time.ts`

- formatFixtureDate(val: AnyDate, facilityTimezone: string): string
- formatFixtureDateFull(val: AnyDate, facilityTimezone: string): FixtureDateDisplay
- getBrowserTimezone(): string
- getTzAbbr(tz: string, date: Date): string
- isValidTimezone(tz: string): boolean
- relativeTime(val: AnyDate): string
- toMs(val: AnyDate): number
- toUtcFirestoreTimestamp(val: AnyDate): { seconds: number; nanoseconds: number; }

### `src/routes/api/ingest/+server.ts`

- async POST({ request }: { request: any; }): Promise<Response>
