/**
 * Semantic icon registry — the single source of truth for icon identity.
 *
 * ALL icon usage in the codebase must go through this registry.
 * Keys are domain tokens (e.g. 'status.verified'); values are Lucide-style components (Lucide-derived or bespoke SVGs wired to the same props contract).
 * This design enables tree-shaking and enforces a 1.5px stroke-width contract
 * via the Icon.svelte wrapper.
 *
 * Phosphor → Lucide migration map is documented inline for traceability.
 */

// Status / feedback
import CircleCheck from 'lucide-svelte/icons/circle-check';
import CircleAlert from 'lucide-svelte/icons/circle-alert';
import CircleX from 'lucide-svelte/icons/circle-x';
import CircleDot from 'lucide-svelte/icons/circle-dot';
import CirclePlus from 'lucide-svelte/icons/circle-plus';
import CirclePlay from 'lucide-svelte/icons/circle-play';
import ShieldCheck from 'lucide-svelte/icons/shield-check';
import ShieldAlert from 'lucide-svelte/icons/shield-alert';
import ShieldPlus from 'lucide-svelte/icons/shield-plus';
import ShieldBan from 'lucide-svelte/icons/shield-ban';
import ShieldX from 'lucide-svelte/icons/shield-x';
import Shield from 'lucide-svelte/icons/shield';
import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
import OctagonAlert from 'lucide-svelte/icons/octagon-alert';
import BadgeCheck from 'lucide-svelte/icons/badge-check';
import Info from 'lucide-svelte/icons/info';
import Check from 'lucide-svelte/icons/check';
import SquareCheck from 'lucide-svelte/icons/square-check';
import LoaderCircle from 'lucide-svelte/icons/loader-circle';
import Loader from 'lucide-svelte/icons/loader';
import Coffee from 'lucide-svelte/icons/coffee';

// Navigation / UI shell
import Home from 'lucide-svelte/icons/home';
import Menu from 'lucide-svelte/icons/menu';
import PanelLeft from 'lucide-svelte/icons/panel-left';
import ChevronDown from 'lucide-svelte/icons/chevron-down';
import ChevronLeft from 'lucide-svelte/icons/chevron-left';
import ChevronRight from 'lucide-svelte/icons/chevron-right';
import ChevronsUpDown from 'lucide-svelte/icons/chevrons-up-down';
import ArrowDown from 'lucide-svelte/icons/arrow-down';
import ArrowLeft from 'lucide-svelte/icons/arrow-left';
import ArrowRight from 'lucide-svelte/icons/arrow-right';
import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
import ArrowLeftRight from 'lucide-svelte/icons/arrow-left-right';
import ArrowDownUp from 'lucide-svelte/icons/arrow-down-up';
import ExternalLink from 'lucide-svelte/icons/external-link';
import LogIn from 'lucide-svelte/icons/log-in';
import LogOut from 'lucide-svelte/icons/log-out';
import Undo2 from 'lucide-svelte/icons/undo-2';
import RotateCw from 'lucide-svelte/icons/rotate-cw';
import RotateCcw from 'lucide-svelte/icons/rotate-ccw';
import RefreshCw from 'lucide-svelte/icons/refresh-cw';
import Maximize2 from 'lucide-svelte/icons/maximize-2';
import Minimize2 from 'lucide-svelte/icons/minimize-2';
import EllipsisVertical from 'lucide-svelte/icons/ellipsis-vertical';
import Ellipsis from 'lucide-svelte/icons/ellipsis';
import ToggleRight from 'lucide-svelte/icons/toggle-right';
import ToggleLeft from 'lucide-svelte/icons/toggle-left';
import Crosshair from 'lucide-svelte/icons/crosshair';

// User / org
import User from 'lucide-svelte/icons/user';
import UserCheck from 'lucide-svelte/icons/user-check';
import UserPlus from 'lucide-svelte/icons/user-plus';
import UserCog from 'lucide-svelte/icons/user-cog';
import CircleUser from 'lucide-svelte/icons/circle-user';
import Users from 'lucide-svelte/icons/users';
import UsersRound from 'lucide-svelte/icons/users-round';
import Building2 from 'lucide-svelte/icons/building-2';

// Communication
import Mail from 'lucide-svelte/icons/mail';
import MailOpen from 'lucide-svelte/icons/mail-open';
import MessageCircle from 'lucide-svelte/icons/message-circle';
import MessagesSquare from 'lucide-svelte/icons/messages-square';
import Phone from 'lucide-svelte/icons/phone';
import Bell from 'lucide-svelte/icons/bell';
import Send from 'lucide-svelte/icons/send';
import Share2 from 'lucide-svelte/icons/share-2';
import Radio from 'lucide-svelte/icons/radio';

// Actions / CRUD
import Plus from 'lucide-svelte/icons/plus';
import Pencil from 'lucide-svelte/icons/pencil';
import Trash2 from 'lucide-svelte/icons/trash-2';
import Copy from 'lucide-svelte/icons/copy';
import Save from 'lucide-svelte/icons/save';
import Download from 'lucide-svelte/icons/download';
import Upload from 'lucide-svelte/icons/upload';
import Search from 'lucide-svelte/icons/search';
import Filter from 'lucide-svelte/icons/filter';
import Eraser from 'lucide-svelte/icons/eraser';

// Data / charts
import ChartBar from 'lucide-svelte/icons/chart-bar';
import ChartLine from 'lucide-svelte/icons/chart-line';
import ChartPie from 'lucide-svelte/icons/chart-pie';
import TrendingUp from 'lucide-svelte/icons/trending-up';
import Activity from 'lucide-svelte/icons/activity';
import HeartPulse from 'lucide-svelte/icons/heart-pulse';
import Radar from 'lucide-svelte/icons/radar';
import Target from 'lucide-svelte/icons/target';

// Files / content
import List from 'lucide-svelte/icons/list';
import ListChecks from 'lucide-svelte/icons/list-checks';
import BookOpen from 'lucide-svelte/icons/book-open';
import Library from 'lucide-svelte/icons/library';
import Film from 'lucide-svelte/icons/film';
import Type from 'lucide-svelte/icons/type';
import Grid2x2 from 'lucide-svelte/icons/grid-2x2';
import Package from 'lucide-svelte/icons/package';
import Globe from 'lucide-svelte/icons/globe';

// Misc / decorative
import Star from 'lucide-svelte/icons/star';
import Trophy from 'lucide-svelte/icons/trophy';
import Medal from 'lucide-svelte/icons/medal';
import Crown from 'lucide-svelte/icons/crown';
import Gift from 'lucide-svelte/icons/gift';
import Award from 'lucide-svelte/icons/award';
import Diamond from 'lucide-svelte/icons/diamond';
import Triangle from 'lucide-svelte/icons/triangle';
import Square from 'lucide-svelte/icons/square';
import Flag from 'lucide-svelte/icons/flag';
import Sparkles from 'lucide-svelte/icons/sparkles';
import Zap from 'lucide-svelte/icons/zap';
import Flame from 'lucide-svelte/icons/flame';
import Ghost from 'lucide-svelte/icons/ghost';
import Sword from 'lucide-svelte/icons/sword';
import Rocket from 'lucide-svelte/icons/rocket';
import Infinity from 'lucide-svelte/icons/infinity';
import Moon from 'lucide-svelte/icons/moon';
import Wind from 'lucide-svelte/icons/wind';
import Snowflake from 'lucide-svelte/icons/snowflake';
import Volleyball from 'lucide-svelte/icons/volleyball';
import Disc2 from 'lucide-svelte/icons/disc-2';
import Binoculars from 'lucide-svelte/icons/binoculars';
import Hourglass from 'lucide-svelte/icons/hourglass';
import Timer from 'lucide-svelte/icons/timer';
import Clock from 'lucide-svelte/icons/clock';
import Calendar from 'lucide-svelte/icons/calendar';

// System / access
import Settings from 'lucide-svelte/icons/settings';
import Settings2 from 'lucide-svelte/icons/settings-2';
import Key from 'lucide-svelte/icons/key';
import LockKeyhole from 'lucide-svelte/icons/lock-keyhole';
import LockKeyholeOpen from 'lucide-svelte/icons/lock-keyhole-open';
import Lock from 'lucide-svelte/icons/lock';
import Fingerprint from 'lucide-svelte/icons/fingerprint';
import Eye from 'lucide-svelte/icons/eye';
import EyeOff from 'lucide-svelte/icons/eye-off';
import CreditCard from 'lucide-svelte/icons/credit-card';
import Landmark from 'lucide-svelte/icons/landmark';
import LifeBuoy from 'lucide-svelte/icons/life-buoy';
import Route from 'lucide-svelte/icons/route';
import Network from 'lucide-svelte/icons/network';
import MapPin from 'lucide-svelte/icons/map-pin';
import Plug from 'lucide-svelte/icons/plug';
import PlugZap from 'lucide-svelte/icons/plug-zap';
import Server from 'lucide-svelte/icons/server';
import CircleDollarSign from 'lucide-svelte/icons/circle-dollar-sign';
import ShieldHalf from 'lucide-svelte/icons/shield-half';
import BarChart2 from 'lucide-svelte/icons/bar-chart-2';
import Wifi from 'lucide-svelte/icons/wifi';
import WifiOff from 'lucide-svelte/icons/wifi-off';
import CloudSun from 'lucide-svelte/icons/cloud-sun';
import AudioWaveform from 'lucide-svelte/icons/audio-waveform';
import Sprout from 'lucide-svelte/icons/sprout';
import Footprints from 'lucide-svelte/icons/footprints';
import Hammer from 'lucide-svelte/icons/hammer';
import Palette from 'lucide-svelte/icons/palette';
import PaintBucket from 'lucide-svelte/icons/paint-bucket';
import Dumbbell from 'lucide-svelte/icons/dumbbell';
import Hexagon from 'lucide-svelte/icons/hexagon';
import Ban from 'lucide-svelte/icons/ban';
import X from 'lucide-svelte/icons/x';
import Heart from 'lucide-svelte/icons/heart';
import Minus from 'lucide-svelte/icons/minus';
import SquareDashed from 'lucide-svelte/icons/square-dashed';
import CircleQuestionMark from 'lucide-svelte/icons/circle-question-mark';
import Circle from 'lucide-svelte/icons/circle';

import SportSoccerBallIcon from '$lib/icons/custom/SportSoccerBallIcon.svelte';

// ────────────────────────────────────────────────────────────────
// Registry — semantic token → Lucide component
// ────────────────────────────────────────────────────────────────

export const REGISTRY = {
	// ── Status / feedback ──
	'status.verified':       CircleCheck,      // ph-check-circle
	'status.warning':        TriangleAlert,    // ph-warning
	'status.warning-circle': CircleAlert,      // ph-warning-circle
	'status.warning-octagon':OctagonAlert,     // ph-warning-octagon
	'status.error':          CircleX,          // ph-x-circle
	'status.pending':        CircleDot,        // ph-circle-notch (loading state)
	'status.loading':        LoaderCircle,     // ph-spinner
	'status.loader':         Loader,           // ph-spinner-gap
	'status.shield':         Shield,           // decorative shield / empty-state
	'status.shield-check':   ShieldCheck,      // ph-shield-check
	'status.shield-alert':   ShieldAlert,      // ph-shield-warning
	'status.shield-plus':    ShieldPlus,       // ph-shield-plus
	'status.shield-ban':     ShieldBan,        // ph-shield-slash
	'status.shield-x':       ShieldX,          // ph-shield-x
	'status.shield-half':    ShieldHalf,       // Player OS Command Center
	'status.seal-check':     BadgeCheck,       // ph-seal-check
	'status.info':           Info,             // ph-info
	'status.check':          Check,            // ph-check
	'status.check-square':   SquareCheck,      // ph-check-square
	'status.circle-plus':    CirclePlus,       // ph-plus-circle
	'status.circle-play':    CirclePlay,       // ph-play-circle
	'status.inbox-zero':     Coffee,

	// ── Sport icons (Lucide Phase 4 + bespoke where Lucide lacks a glyph) ──
	'sport.soccer':      SportSoccerBallIcon,
	'sport.basketball':  Dumbbell,    // training/sport weight — no basketball in Lucide
	'sport.baseball':    Disc2,       // flat disc = baseball silhouette
	'sport.football':    Medal,       // gridiron — no football shape in Lucide
	'sport.volleyball':  Volleyball,  // exact match ✓
	'sport.lacrosse':    Target,      // lacrosse head/target
	'sport.hockey':      Snowflake,   // ice skate → snowflake (cold/ice)
	'sport.generic':     Shield,      // catch-all shield

	// ── Navigation ──
	'nav.home':        Home,           // ph-house / ph-house-line
	'nav.menu':        Menu,           // ph-list (hamburger)
	'nav.sidebar':     PanelLeft,      // ph-sidebar / ph-sidebar-simple
	'nav.chevron-down':ChevronDown,    // ph-caret-down
	'nav.chevron-left':ChevronLeft,    // ph-caret-left
	'nav.chevron-right':ChevronRight,  // ph-caret-right
	'nav.sort':        ChevronsUpDown, // ph-caret-up-down
	'nav.arrow-down':  ArrowDown,      // ph-arrow-down
	'nav.arrow-left':  ArrowLeft,      // ph-arrow-left
	'nav.arrow-right': ArrowRight,     // ph-arrow-right
	'nav.arrow-up-right': ArrowUpRight,// ph-arrow-up-right
	'nav.external':    ExternalLink,   // ph-arrow-square-out
	'nav.swap':        ArrowLeftRight, // ph-swap
	'nav.sign-in':     LogIn,          // ph-sign-in
	'nav.sign-out':    LogOut,         // ph-sign-out
	'nav.undo':        Undo2,          // ph-arrow-u-up-left
	'nav.rotate-cw':   RotateCw,       // ph-arrow-clockwise
	'nav.rotate-ccw':  RotateCcw,      // ph-arrow-counter-clockwise
	'nav.refresh':     RefreshCw,      // ph-arrows-clockwise
	'nav.maximize':    Maximize2,      // ph-corners-out
	'nav.minimize':    Minimize2,      // ph-corners-in
	'nav.more':        Ellipsis,       // ph-dots-three
	'nav.more-v':      EllipsisVertical,// ph-dots-three-vertical
	'nav.toggle-on':   ToggleRight,    // ph-toggle-right
	'nav.toggle-off':  ToggleLeft,     // ph-toggle-left (added)
	'nav.sort-up-down':ArrowDownUp,    // ph-arrow-down (bidirectional)
	'nav.crosshair':   Crosshair,      // ph-crosshair

	// ── User / org ──
	'user.avatar':     CircleUser,  // ph-user-circle
	'user.profile':    User,        // ph-user-circle (alt)
	'user.check':      UserCheck,   // ph-user-check
	'user.plus':       UserPlus,    // ph-user-plus
	'user.settings':   UserCog,     // ph-user-gear / ph-user-circle-gear
	'user.group':      Users,       // ph-users / ph-users-three
	'user.group-round':UsersRound,  // ph-users (rounded)
	'org.building':    Building2,   // ph-buildings

	// ── Communication ──
	'comm.mail':       Mail,           // ph-envelope-simple
	'comm.mail-open':  MailOpen,       // ph-envelope-open / ph-envelope-simple-open
	'comm.chat':       MessageCircle,  // ph-chat-circle
	'comm.chats':      MessagesSquare, // ph-chats-circle
	'comm.phone':      Phone,          // ph-phone
	'comm.bell':       Bell,           // ph-bell
	'comm.send':       Send,           // ph-paper-plane-tilt
	'comm.share':      Share2,         // ph-share-network
	'comm.broadcast':  Radio,          // ph-broadcast

	// ── Actions / CRUD ──
	'action.add':      Plus,       // ph-plus
	'action.edit':     Pencil,     // ph-pencil-simple
	'action.delete':   Trash2,     // ph-trash
	'action.copy':     Copy,       // ph-copy
	'action.save':     Save,       // ph-floppy-disk
	'action.download': Download,   // ph-download-simple / ph-cloud-arrow-down
	'action.upload':   Upload,     // (upload)
	'action.search':   Search,     // ph-magnifying-glass
	'action.filter':   Filter,     // ph-funnel
	'action.eraser':   Eraser,     // ph-eraser

	// ── Data / analytics ──
	'data.chart-bar':  ChartBar,    // ph-chart-bar
	'data.chart-bar-2':BarChart2,   // Operative Dossier / stats
	'data.chart-line': ChartLine,   // ph-chart-line / ph-chart-line-up
	'data.chart-pie':  ChartPie,    // ph-chart-pie-slice
	'data.trending':   TrendingUp,  // ph-chart-line-up
	'data.activity':   Activity,    // ph-activity
	'data.pulse':      HeartPulse,  // ph-pulse / ph-waveform (heartbeat)
	'data.waveform':   AudioWaveform,// ph-waveform
	'data.radar':      Radar,       // ph-radar / ph-hexradar
	'data.target':     Target,      // ph-target / ph-strategy

	// ── Files / content ──
	'content.list':    List,       // ph-list
	'content.checks':  ListChecks, // ph-list-checks
	'content.books':   BookOpen,   // ph-books
	'content.library': Library,    // ph-books (alt)
	'content.film':    Film,       // ph-film-strip
	'content.text':    Type,       // ph-text-t
	'content.grid':    Grid2x2,    // ph-squares-four
	'content.package': Package,    // ph-package
	'content.globe':   Globe,      // ph-globe

	// ── Gamification / rewards ──
	'game.star':     Star,     // ph-star
	'game.trophy':   Trophy,   // ph-trophy
	'game.medal':    Medal,    // ph-medal
	'game.crown':    Crown,    // ph-crown
	'game.gift':     Gift,     // ph-gift
	'game.award':    Award,    // ph-seal-check (alt)
	'game.diamond':  Diamond,  // ph-diamond
	'game.sparkles': Sparkles, // ph-sparkle
	'game.zap':      Zap,      // ph-lightning
	'game.flame':    Flame,    // ph-fire / ph-flame
	'game.rocket':   Rocket,   // ph-rocket-launch
	'game.dumbbell': Dumbbell, // ph-barbell
	'game.sword':    Sword,    // ph-sword
	'game.ghost':    Ghost,    // ph-ghost
	'game.seedling': Sprout,   // ph-seedling
	'game.footprints':Footprints,// ph-sneaker

	// ── System / settings ──
	'sys.settings':    Settings,        // ph-gear
	'sys.settings-adv':Settings2,       // ph-gear-six
	'sys.key':         Key,             // ph-key
	'sys.lock':        LockKeyhole,     // ph-lock-key
	'sys.lock-open':   LockKeyholeOpen, // ph-lock-key-open
	'sys.lock-simple': Lock,            // ph-lock-simple
	'sys.fingerprint': Fingerprint,     // ph-fingerprint
	'sys.eye':         Eye,             // ph-eye (reveal)
	'sys.eye-off':     EyeOff,          // ph-eye-slash
	'sys.credit-card': CreditCard,      // ph-credit-card
	'sys.escrow':      Landmark,        // ph-escrow (bank/landmark)
	'sys.lifebuoy':    LifeBuoy,        // ph-lifebuoy
	'sys.route':       Route,           // ph-routing
	'sys.network':     Network,         // ph-share-network (topology)
	'sys.map-pin':     MapPin,          // ph-map-pin / ph-map-pin-line
	'sys.plug':        Plug,            // ph-plugs
	'sys.plug-zap':    PlugZap,         // ph-plugs-connected
	'sys.server':      Server,          // cell-routing / infrastructure
	'sys.dollar':      CircleDollarSign, // pricing / $0 platform fee
	'sys.flag':        Flag,            // ph-flag
	'sys.ban':         Ban,             // ph-prohibit
	'sys.close':       X,               // ph-x (close / dismiss)
	'sys.heart':       Heart,           // ph-heart
	'sys.minus':       Minus,           // ph-line-segment (line/divider)
	'sys.square-dash': SquareDashed,    // ph-rectangle-dashed
	'sys.question':    CircleQuestionMark, // ph-question
	'sys.hammer':      Hammer,          // ph-hammer
	'sys.palette':     Palette,         // ph-palette
	'sys.paint':       PaintBucket,     // ph-fill (paint fill)
	'sys.binoculars':  Binoculars,      // ph-binoculars
	'sys.hourglass':   Hourglass,       // ph-hourglass-medium
	'sys.timer':       Timer,           // ph-timer
	'sys.clock':       Clock,           // ph-clock
	'sys.calendar':    Calendar,        // ph-calendar-blank
	'sys.triangle':    Triangle,        // ph-triangle / ph-polygon / ph-vector-three
	'sys.square':      Square,          // ph-square
	'sys.circle':      Circle,          // ph-circle (plain circle shape)
	'sys.hexagon':     Hexagon,         // ph-hexradar (shape)
	'sys.infinity':    Infinity,        // ph-infinity

	// ── Environment ──
	'env.moon':    Moon,         // ph-moon-stars
	'env.wind':    Wind,         // ph-wind
	'env.snow':    Snowflake,    // ph-snowflake
	'env.weather': CloudSun,     // ph-cloud-sun
	'env.books':   Library,      // ph-books (alt)

	// ── Network / connectivity ──
	'net.online':  Wifi,        // ph-wifi
	'net.offline': WifiOff,     // ph-wifi-x
} as const;

export type IconName = keyof typeof REGISTRY;
