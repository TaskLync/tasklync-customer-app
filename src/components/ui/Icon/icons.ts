/**
 * TaskLync icon registry — the single source of every icon in the app.
 *
 * All glyphs are Hugeicons (free "stroke rounded" set) for one consistent visual language.
 * Each glyph is deep-imported individually so only the icons listed here reach the bundle.
 *
 * Usage:   <SearchIcon size={iconSize.body} color={colors.textSecondary} />
 * Filled:  <StarIcon size={12} color={colors.warning} fill={colors.warning} />
 * Weight:  strokeWidth is on the app weight scale (2 = regular) — see toHugeiconsStrokeWidth.
 *
 * To add an icon: pick a glyph from https://hugeicons.com (free, stroke rounded), import it below
 * by its deep path and export it with a purpose-based name (`<Purpose>Icon`).
 */
import { createAppIcon } from './AppIcon';

import HiArrowLeft02 from '@hugeicons/core-free-icons/ArrowLeft02Icon';
import HiArrowRight02 from '@hugeicons/core-free-icons/ArrowRight02Icon';
import HiArrowUp02 from '@hugeicons/core-free-icons/ArrowUp02Icon';
import HiArrowDown02 from '@hugeicons/core-free-icons/ArrowDown02Icon';
import HiArrowUpRight01 from '@hugeicons/core-free-icons/ArrowUpRight01Icon';
import HiArrowLeft01 from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import HiArrowRight01 from '@hugeicons/core-free-icons/ArrowRight01Icon';
import HiArrowDown01 from '@hugeicons/core-free-icons/ArrowDown01Icon';
import HiArrowUp01 from '@hugeicons/core-free-icons/ArrowUp01Icon';
import HiLinkSquare02 from '@hugeicons/core-free-icons/LinkSquare02Icon';
import HiArrowExpandDiagonal01 from '@hugeicons/core-free-icons/ArrowExpandDiagonal01Icon';
import HiCancel01 from '@hugeicons/core-free-icons/Cancel01Icon';
import HiAdd01 from '@hugeicons/core-free-icons/Add01Icon';
import HiMinusSign from '@hugeicons/core-free-icons/MinusSignIcon';
import HiTick02 from '@hugeicons/core-free-icons/Tick02Icon';
import HiTickDouble02 from '@hugeicons/core-free-icons/TickDouble02Icon';
import HiSearch01 from '@hugeicons/core-free-icons/Search01Icon';
import HiFilterHorizontal from '@hugeicons/core-free-icons/FilterHorizontalIcon';
import HiSortingAZ01 from '@hugeicons/core-free-icons/SortingAZ01Icon';
import HiPencilEdit02 from '@hugeicons/core-free-icons/PencilEdit02Icon';
import HiDelete02 from '@hugeicons/core-free-icons/Delete02Icon';
import HiCopy01 from '@hugeicons/core-free-icons/Copy01Icon';
import HiShare08 from '@hugeicons/core-free-icons/Share08Icon';
import HiDownload04 from '@hugeicons/core-free-icons/Download04Icon';
import HiRefresh from '@hugeicons/core-free-icons/RefreshIcon';
import HiReload from '@hugeicons/core-free-icons/ReloadIcon';
import HiMoreHorizontal from '@hugeicons/core-free-icons/MoreHorizontalIcon';
import HiLogout03 from '@hugeicons/core-free-icons/Logout03Icon';
import HiFlag02 from '@hugeicons/core-free-icons/Flag02Icon';
import HiUnavailable from '@hugeicons/core-free-icons/UnavailableIcon';
import HiQrCode from '@hugeicons/core-free-icons/QrCodeIcon';
import HiLayers01 from '@hugeicons/core-free-icons/Layers01Icon';
import HiGridView from '@hugeicons/core-free-icons/GridViewIcon';
import HiCheckmarkCircle02 from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import HiCancelCircle from '@hugeicons/core-free-icons/CancelCircleIcon';
import HiAlertCircle from '@hugeicons/core-free-icons/AlertCircleIcon';
import HiAlert02 from '@hugeicons/core-free-icons/Alert02Icon';
import HiInformationCircle from '@hugeicons/core-free-icons/InformationCircleIcon';
import HiHelpCircle from '@hugeicons/core-free-icons/HelpCircleIcon';
import HiSecurityCheck from '@hugeicons/core-free-icons/SecurityCheckIcon';
import HiShield01 from '@hugeicons/core-free-icons/Shield01Icon';
import HiSecurityWarning from '@hugeicons/core-free-icons/SecurityWarningIcon';
import HiCheckmarkBadge01 from '@hugeicons/core-free-icons/CheckmarkBadge01Icon';
import HiSquareLock02 from '@hugeicons/core-free-icons/SquareLock02Icon';
import HiWifiOff01 from '@hugeicons/core-free-icons/WifiOff01Icon';
import HiCloudOff from '@hugeicons/core-free-icons/CloudOffIcon';
import HiSparkles from '@hugeicons/core-free-icons/SparklesIcon';
import HiFlash from '@hugeicons/core-free-icons/FlashIcon';
import HiFire from '@hugeicons/core-free-icons/FireIcon';
import HiChartIncrease from '@hugeicons/core-free-icons/ChartIncreaseIcon';
import HiStar from '@hugeicons/core-free-icons/StarIcon';
import HiFavourite from '@hugeicons/core-free-icons/FavouriteIcon';
import HiLocation01 from '@hugeicons/core-free-icons/Location01Icon';
import HiLocationOffline01 from '@hugeicons/core-free-icons/LocationOffline01Icon';
import HiNavigation03 from '@hugeicons/core-free-icons/Navigation03Icon';
import HiGps01 from '@hugeicons/core-free-icons/Gps01Icon';
import HiHome03 from '@hugeicons/core-free-icons/Home03Icon';
import HiBuilding03 from '@hugeicons/core-free-icons/Building03Icon';
import HiBriefcase01 from '@hugeicons/core-free-icons/Briefcase01Icon';
import HiGlobe02 from '@hugeicons/core-free-icons/Globe02Icon';
import HiClock01 from '@hugeicons/core-free-icons/Clock01Icon';
import HiHistory from '@hugeicons/core-free-icons/HistoryIcon';
import HiCalendar03 from '@hugeicons/core-free-icons/Calendar03Icon';
import HiCalendar01 from '@hugeicons/core-free-icons/Calendar01Icon';
import HiCalendarCheckIn01 from '@hugeicons/core-free-icons/CalendarCheckIn01Icon';
import HiCalendarClock from '@hugeicons/core-free-icons/CalendarClockIcon';
import HiCalendarRemove01 from '@hugeicons/core-free-icons/CalendarRemove01Icon';
import HiTask01 from '@hugeicons/core-free-icons/Task01Icon';
import HiTaskDone01 from '@hugeicons/core-free-icons/TaskDone01Icon';
import HiTaskRemove01 from '@hugeicons/core-free-icons/TaskRemove01Icon';
import HiUser from '@hugeicons/core-free-icons/UserIcon';
import HiUserGroup from '@hugeicons/core-free-icons/UserGroupIcon';
import HiUserCheck01 from '@hugeicons/core-free-icons/UserCheck01Icon';
import HiUserRemove01 from '@hugeicons/core-free-icons/UserRemove01Icon';
import HiHeartHandshake from '@hugeicons/core-free-icons/HeartHandshakeIcon';
import HiMessage01 from '@hugeicons/core-free-icons/Message01Icon';
import HiBubbleChat from '@hugeicons/core-free-icons/BubbleChatIcon';
import HiCall from '@hugeicons/core-free-icons/CallIcon';
import HiSmartPhone01 from '@hugeicons/core-free-icons/SmartPhone01Icon';
import HiMail01 from '@hugeicons/core-free-icons/Mail01Icon';
import HiMailOpen01 from '@hugeicons/core-free-icons/MailOpen01Icon';
import HiNotification01 from '@hugeicons/core-free-icons/Notification01Icon';
import HiNotificationOff01 from '@hugeicons/core-free-icons/NotificationOff01Icon';
import HiCustomerSupport from '@hugeicons/core-free-icons/CustomerSupportIcon';
import HiLifebuoy from '@hugeicons/core-free-icons/LifebuoyIcon';
import HiCamera01 from '@hugeicons/core-free-icons/Camera01Icon';
import HiImage01 from '@hugeicons/core-free-icons/Image01Icon';
import HiVideo01 from '@hugeicons/core-free-icons/Video01Icon';
import HiPlayCircle from '@hugeicons/core-free-icons/PlayCircleIcon';
import HiAttachment01 from '@hugeicons/core-free-icons/Attachment01Icon';
import HiCloudUpload from '@hugeicons/core-free-icons/CloudUploadIcon';
import HiFile02 from '@hugeicons/core-free-icons/File02Icon';
import HiFileEdit from '@hugeicons/core-free-icons/FileEditIcon';
import HiFileVerified from '@hugeicons/core-free-icons/FileVerifiedIcon';
import HiFileRemove from '@hugeicons/core-free-icons/FileRemoveIcon';
import HiCreditCard from '@hugeicons/core-free-icons/CreditCardIcon';
import HiBanknote from '@hugeicons/core-free-icons/BanknoteIcon';
import HiWallet01 from '@hugeicons/core-free-icons/Wallet01Icon';
import HiTag01 from '@hugeicons/core-free-icons/Tag01Icon';
import HiCoupon01 from '@hugeicons/core-free-icons/Coupon01Icon';
import HiDiscount from '@hugeicons/core-free-icons/DiscountIcon';
import HiShoppingBag01 from '@hugeicons/core-free-icons/ShoppingBag01Icon';
import HiSettings02 from '@hugeicons/core-free-icons/Settings02Icon';
import HiMoon02 from '@hugeicons/core-free-icons/Moon02Icon';
import HiWrench01 from '@hugeicons/core-free-icons/Wrench01Icon';
import HiHammer01 from '@hugeicons/core-free-icons/Hammer01Icon';
import HiDroplet from '@hugeicons/core-free-icons/DropletIcon';
import HiSnowflake from '@hugeicons/core-free-icons/SnowflakeIcon';
import HiPaintRoller from '@hugeicons/core-free-icons/PaintRollerIcon';
import HiCar01 from '@hugeicons/core-free-icons/Car01Icon';
import HiScissor01 from '@hugeicons/core-free-icons/Scissor01Icon';

export type { AppIconComponent, AppIconProps } from './AppIcon';

// ── Navigation & direction ────────────────────────────────────────────────
/** Header back */
export const ArrowLeftIcon = createAppIcon('ArrowLeftIcon', HiArrowLeft02);
/** Forward CTA */
export const ArrowRightIcon = createAppIcon('ArrowRightIcon', HiArrowRight02);
/** Send / sort ascending */
export const ArrowUpIcon = createAppIcon('ArrowUpIcon', HiArrowUp02);
/** Sort descending */
export const ArrowDownIcon = createAppIcon('ArrowDownIcon', HiArrowDown02);
/** Open / jump to */
export const ArrowUpRightIcon = createAppIcon('ArrowUpRightIcon', HiArrowUpRight01);
/** Back / previous */
export const ChevronLeftIcon = createAppIcon('ChevronLeftIcon', HiArrowLeft01);
/** Row disclosure */
export const ChevronRightIcon = createAppIcon('ChevronRightIcon', HiArrowRight01);
/** Expand / dropdown */
export const ChevronDownIcon = createAppIcon('ChevronDownIcon', HiArrowDown01);
/** Collapse */
export const ChevronUpIcon = createAppIcon('ChevronUpIcon', HiArrowUp01);
/** Opens outside the app */
export const ExternalLinkIcon = createAppIcon('ExternalLinkIcon', HiLinkSquare02);
/** Full-screen preview */
export const ExpandIcon = createAppIcon('ExpandIcon', HiArrowExpandDiagonal01);

// ── Actions ───────────────────────────────────────────────────────────────
/** Close / dismiss / clear */
export const CloseIcon = createAppIcon('CloseIcon', HiCancel01);
/** Add / increment */
export const PlusIcon = createAppIcon('PlusIcon', HiAdd01);
/** Decrement */
export const MinusIcon = createAppIcon('MinusIcon', HiMinusSign);
/** Selected / confirmed */
export const CheckIcon = createAppIcon('CheckIcon', HiTick02);
/** Message read receipt */
export const CheckDoubleIcon = createAppIcon('CheckDoubleIcon', HiTickDouble02);
/** Search */
export const SearchIcon = createAppIcon('SearchIcon', HiSearch01);
/** Filters */
export const FilterIcon = createAppIcon('FilterIcon', HiFilterHorizontal);
/** Sort */
export const SortIcon = createAppIcon('SortIcon', HiSortingAZ01);
/** Edit */
export const EditIcon = createAppIcon('EditIcon', HiPencilEdit02);
/** Delete / remove */
export const DeleteIcon = createAppIcon('DeleteIcon', HiDelete02);
/** Copy to clipboard */
export const CopyIcon = createAppIcon('CopyIcon', HiCopy01);
/** Share */
export const ShareIcon = createAppIcon('ShareIcon', HiShare08);
/** Download / save */
export const DownloadIcon = createAppIcon('DownloadIcon', HiDownload04);
/** Refresh / reload data */
export const RefreshIcon = createAppIcon('RefreshIcon', HiRefresh);
/** Retry a failed upload */
export const RetryIcon = createAppIcon('RetryIcon', HiReload);
/** Overflow menu */
export const MoreIcon = createAppIcon('MoreIcon', HiMoreHorizontal);
/** Sign out */
export const LogoutIcon = createAppIcon('LogoutIcon', HiLogout03);
/** Report */
export const FlagIcon = createAppIcon('FlagIcon', HiFlag02);
/** Block */
export const BlockIcon = createAppIcon('BlockIcon', HiUnavailable);
/** Booking QR code */
export const QrCodeIcon = createAppIcon('QrCodeIcon', HiQrCode);
/** Category suggestion */
export const LayersIcon = createAppIcon('LayersIcon', HiLayers01);
/** All categories */
export const GridIcon = createAppIcon('GridIcon', HiGridView);

// ── Status & feedback ─────────────────────────────────────────────────────
/** Success */
export const CheckCircleIcon = createAppIcon('CheckCircleIcon', HiCheckmarkCircle02);
/** Failed / cancelled */
export const CloseCircleIcon = createAppIcon('CloseCircleIcon', HiCancelCircle);
/** Error */
export const AlertCircleIcon = createAppIcon('AlertCircleIcon', HiAlertCircle);
/** Warning */
export const WarningIcon = createAppIcon('WarningIcon', HiAlert02);
/** Information */
export const InfoIcon = createAppIcon('InfoIcon', HiInformationCircle);
/** Help / FAQ */
export const HelpCircleIcon = createAppIcon('HelpCircleIcon', HiHelpCircle);
/** Verified / protected */
export const ShieldCheckIcon = createAppIcon('ShieldCheckIcon', HiSecurityCheck);
/** Safety */
export const ShieldIcon = createAppIcon('ShieldIcon', HiShield01);
/** Dispute / safety issue */
export const ShieldAlertIcon = createAppIcon('ShieldAlertIcon', HiSecurityWarning);
/** Verified pro badge */
export const VerifiedIcon = createAppIcon('VerifiedIcon', HiCheckmarkBadge01);
/** Secure / locked */
export const LockIcon = createAppIcon('LockIcon', HiSquareLock02);
/** Offline */
export const WifiOffIcon = createAppIcon('WifiOffIcon', HiWifiOff01);
/** Sync / network error */
export const CloudOffIcon = createAppIcon('CloudOffIcon', HiCloudOff);
/** New / featured / cleaning */
export const SparklesIcon = createAppIcon('SparklesIcon', HiSparkles);
/** Instant / electrician */
export const FlashIcon = createAppIcon('FlashIcon', HiFlash);
/** Popular / hot */
export const FireIcon = createAppIcon('FireIcon', HiFire);
/** Trending */
export const TrendingUpIcon = createAppIcon('TrendingUpIcon', HiChartIncrease);
/** Rating (supports fill) */
export const StarIcon = createAppIcon('StarIcon', HiStar);
/** Favourite (supports fill) */
export const HeartIcon = createAppIcon('HeartIcon', HiFavourite);

// ── Location & map ────────────────────────────────────────────────────────
/** Address / location */
export const LocationIcon = createAppIcon('LocationIcon', HiLocation01);
/** Location unavailable */
export const LocationOffIcon = createAppIcon('LocationOffIcon', HiLocationOffline01);
/** Directions / current location */
export const NavigationIcon = createAppIcon('NavigationIcon', HiNavigation03);
/** Use my location */
export const MyLocationIcon = createAppIcon('MyLocationIcon', HiGps01);
/** Home tab / home address */
export const HomeIcon = createAppIcon('HomeIcon', HiHome03);
/** Company / office address */
export const BuildingIcon = createAppIcon('BuildingIcon', HiBuilding03);
/** Work address */
export const BriefcaseIcon = createAppIcon('BriefcaseIcon', HiBriefcase01);
/** Language / website */
export const GlobeIcon = createAppIcon('GlobeIcon', HiGlobe02);

// ── Time & booking ────────────────────────────────────────────────────────
/** Time / duration */
export const ClockIcon = createAppIcon('ClockIcon', HiClock01);
/** Recent */
export const HistoryIcon = createAppIcon('HistoryIcon', HiHistory);
/** Date / bookings tab */
export const CalendarIcon = createAppIcon('CalendarIcon', HiCalendar03);
/** Schedule */
export const CalendarDaysIcon = createAppIcon('CalendarDaysIcon', HiCalendar01);
/** Booking confirmed */
export const CalendarCheckIcon = createAppIcon('CalendarCheckIcon', HiCalendarCheckIn01);
/** Reschedule / reminder */
export const CalendarClockIcon = createAppIcon('CalendarClockIcon', HiCalendarClock);
/** Booking cancelled */
export const CalendarRemoveIcon = createAppIcon('CalendarRemoveIcon', HiCalendarRemove01);
/** Job details */
export const TaskIcon = createAppIcon('TaskIcon', HiTask01);
/** Job completed */
export const TaskDoneIcon = createAppIcon('TaskDoneIcon', HiTaskDone01);
/** Job rejected */
export const TaskRemoveIcon = createAppIcon('TaskRemoveIcon', HiTaskRemove01);

// ── People ────────────────────────────────────────────────────────────────
/** Profile / account */
export const UserIcon = createAppIcon('UserIcon', HiUser);
/** Team */
export const UsersIcon = createAppIcon('UsersIcon', HiUserGroup);
/** Worker assigned */
export const UserCheckIcon = createAppIcon('UserCheckIcon', HiUserCheck01);
/** Worker no-show / blocked */
export const UserRemoveIcon = createAppIcon('UserRemoveIcon', HiUserRemove01);
/** Care / goodwill */
export const HandshakeIcon = createAppIcon('HandshakeIcon', HiHeartHandshake);

// ── Communication ─────────────────────────────────────────────────────────
/** Messages tab / chat */
export const ChatIcon = createAppIcon('ChatIcon', HiMessage01);
/** Conversation */
export const ChatBubbleIcon = createAppIcon('ChatBubbleIcon', HiBubbleChat);
/** Call */
export const PhoneIcon = createAppIcon('PhoneIcon', HiCall);
/** Mobile / push */
export const SmartphoneIcon = createAppIcon('SmartphoneIcon', HiSmartPhone01);
/** Email */
export const MailIcon = createAppIcon('MailIcon', HiMail01);
/** Read / all caught up */
export const MailOpenIcon = createAppIcon('MailOpenIcon', HiMailOpen01);
/** Notifications */
export const BellIcon = createAppIcon('BellIcon', HiNotification01);
/** Notifications muted */
export const BellOffIcon = createAppIcon('BellOffIcon', HiNotificationOff01);
/** Customer support */
export const SupportIcon = createAppIcon('SupportIcon', HiCustomerSupport);
/** Help & assistance */
export const LifebuoyIcon = createAppIcon('LifebuoyIcon', HiLifebuoy);

// ── Media & files ─────────────────────────────────────────────────────────
/** Take photo */
export const CameraIcon = createAppIcon('CameraIcon', HiCamera01);
/** Photo / gallery */
export const ImageIcon = createAppIcon('ImageIcon', HiImage01);
/** Video */
export const VideoIcon = createAppIcon('VideoIcon', HiVideo01);
/** Play media */
export const PlayCircleIcon = createAppIcon('PlayCircleIcon', HiPlayCircle);
/** Attach file */
export const AttachmentIcon = createAppIcon('AttachmentIcon', HiAttachment01);
/** Upload */
export const CloudUploadIcon = createAppIcon('CloudUploadIcon', HiCloudUpload);
/** Invoice / document / policy */
export const DocumentIcon = createAppIcon('DocumentIcon', HiFile02);
/** Custom request draft */
export const DocumentEditIcon = createAppIcon('DocumentEditIcon', HiFileEdit);
/** Quote accepted */
export const DocumentCheckIcon = createAppIcon('DocumentCheckIcon', HiFileVerified);
/** Quote declined */
export const DocumentRemoveIcon = createAppIcon('DocumentRemoveIcon', HiFileRemove);

// ── Commerce & payment ────────────────────────────────────────────────────
/** Card payment */
export const CreditCardIcon = createAppIcon('CreditCardIcon', HiCreditCard);
/** Cash payment */
export const CashIcon = createAppIcon('CashIcon', HiBanknote);
/** Wallet */
export const WalletIcon = createAppIcon('WalletIcon', HiWallet01);
/** Price / offer tag */
export const TagIcon = createAppIcon('TagIcon', HiTag01);
/** Promo code / coupon */
export const CouponIcon = createAppIcon('CouponIcon', HiCoupon01);
/** Discount */
export const DiscountIcon = createAppIcon('DiscountIcon', HiDiscount);
/** Cart */
export const ShoppingBagIcon = createAppIcon('ShoppingBagIcon', HiShoppingBag01);

// ── Settings ──────────────────────────────────────────────────────────────
/** Settings */
export const SettingsIcon = createAppIcon('SettingsIcon', HiSettings02);
/** Dark mode */
export const MoonIcon = createAppIcon('MoonIcon', HiMoon02);

// ── Service categories ────────────────────────────────────────────────────
/** Repairs / plumbing */
export const WrenchIcon = createAppIcon('WrenchIcon', HiWrench01);
/** Carpentry */
export const HammerIcon = createAppIcon('HammerIcon', HiHammer01);
/** Plumbing */
export const DropletIcon = createAppIcon('DropletIcon', HiDroplet);
/** AC repair & cooling */
export const AcIcon = createAppIcon('AcIcon', HiSnowflake);
/** Painting */
export const PainterIcon = createAppIcon('PainterIcon', HiPaintRoller);
/** Mechanic */
export const CarIcon = createAppIcon('CarIcon', HiCar01);
/** Salon / grooming */
export const ScissorsIcon = createAppIcon('ScissorsIcon', HiScissor01);
