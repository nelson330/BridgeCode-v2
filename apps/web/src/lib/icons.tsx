import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faAlignLeft,
  faArrowDown,
  faArrowDownUpAcrossLine,
  faArrowLeft,
  faArrowRight,
  faArrowRotateLeft,
  faArrowUp,
  faArrowUpRightFromSquare,
  faArrowsRotate,
  faAward,
  faBan,
  faBars,
  faBolt,
  faBookOpen,
  faBrain,
  faBullseye,
  faCalendarDays,
  faCaretUp,
  faCat,
  faChartColumn,
  faChartSimple,
  faCheck,
  faChevronDown,
  faChevronRight,
  faChevronUp,
  faCircle,
  faCircleCheck,
  faCircleExclamation,
  faCircleQuestion,
  faCircleXmark,
  faClipboardList,
  faClock,
  faComment,
  faCommentDots,
  faCompress,
  faCopy,
  faCrown,
  faDatabase,
  faDiamond,
  faDownload,
  faDragon,
  faExpand,
  faEye,
  faEyeSlash,
  faFileLines,
  faFire,
  faFloppyDisk,
  faFont,
  faGamepad,
  faGem,
  faGlobe,
  faGraduationCap,
  faHeart,
  faImage,
  faKey,
  faKeyboard,
  faKhanda,
  faLayerGroup,
  faLightbulb,
  faLink,
  faListOl,
  faLocationDot,
  faLock,
  faMagnifyingGlass,
  faMedal,
  faMoon,
  faPaperPlane,
  faPenNib,
  faPenToSquare,
  faPlay,
  faPlus,
  faPrint,
  faQrcode,
  faRightFromBracket,
  faRightToBracket,
  faRobot,
  faRocket,
  faShareNodes,
  faShieldHalved,
  faShuffle,
  faSliders,
  faSpinner,
  faSquare,
  faSquareCheck,
  faStar,
  faStopwatch,
  faSun,
  faTableColumns,
  faTag,
  faThumbtack,
  faTowerBroadcast,
  faTrashCan,
  faTriangleExclamation,
  faTrophy,
  faTv,
  faUpload,
  faUser,
  faUserCheck,
  faUserPlus,
  faUsers,
  faVolumeHigh,
  faVolumeXmark,
  faWandMagicSparkles,
  faWaveSquare,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon, type FontAwesomeIconProps } from '@fortawesome/react-fontawesome'

export type IconProps = Omit<FontAwesomeIconProps, 'icon' | 'size'> & { size?: number | string }
function createIcon(icon: IconDefinition) {
  return function Icon({ size, style, ...props }: IconProps) {
    return (
      <FontAwesomeIcon
        icon={icon}
        style={{ ...(size ? { width: size, height: size } : {}), ...style }}
        {...props}
      />
    )
  }
}
export const Activity = createIcon(faWaveSquare)
export const AlertCircle = createIcon(faCircleExclamation)
export const AlertTriangle = createIcon(faTriangleExclamation)
export const AlignLeft = createIcon(faAlignLeft)
export const ArrowDown = createIcon(faArrowDown)
export const ArrowDownUp = createIcon(faArrowDownUpAcrossLine)
export const ArrowLeft = createIcon(faArrowLeft)
export const ArrowRight = createIcon(faArrowRight)
export const ArrowUp = createIcon(faArrowUp)
export const Award = createIcon(faAward)
export const Ban = createIcon(faBan)
export const BarChart = createIcon(faChartSimple)
export const BarChart3 = createIcon(faChartColumn)
export const BookOpen = createIcon(faBookOpen)
export const Bot = createIcon(faRobot)
export const BrainCircuit = createIcon(faBrain)
export const Calendar = createIcon(faCalendarDays)
export const Check = createIcon(faCheck)
export const CheckCircle2 = createIcon(faCircleCheck)
export const CheckSquare = createIcon(faSquareCheck)
export const ChevronDown = createIcon(faChevronDown)
export const ChevronRight = createIcon(faChevronRight)
export const ChevronUp = createIcon(faChevronUp)
export const Circle = createIcon(faCircle)
export const ClipboardList = createIcon(faClipboardList)
export const Clock = createIcon(faClock)
export const Copy = createIcon(faCopy)
export const Crown = createIcon(faCrown)
export const Database = createIcon(faDatabase)
export const Diamond = createIcon(faDiamond)
export const Download = createIcon(faDownload)
export const Edit3 = createIcon(faPenToSquare)
export const ExternalLink = createIcon(faArrowUpRightFromSquare)
export const Eye = createIcon(faEye)
export const EyeOff = createIcon(faEyeSlash)
export const FileText = createIcon(faFileLines)
export const Flame = createIcon(faFire)
export const Gamepad2 = createIcon(faGamepad)
export const Globe = createIcon(faGlobe)
export const GraduationCap = createIcon(faGraduationCap)
export const Heart = createIcon(faHeart)
export const HelpCircle = createIcon(faCircleQuestion)
export const Image = createIcon(faImage)
export const Key = createIcon(faKey)
export const Keyboard = createIcon(faKeyboard)
export const Layers = createIcon(faLayerGroup)
export const LayoutDashboard = createIcon(faTableColumns)
export const Lightbulb = createIcon(faLightbulb)
export const Link = createIcon(faLink)
export const Link2 = createIcon(faLink)
export const ListOrdered = createIcon(faListOl)
export const Loader2 = createIcon(faSpinner)
export const Lock = createIcon(faLock)
export const LogIn = createIcon(faRightToBracket)
export const LogOut = createIcon(faRightFromBracket)
export const MapPin = createIcon(faLocationDot)
export const Maximize = createIcon(faExpand)
export const Medal = createIcon(faMedal)
export const Menu = createIcon(faBars)
export const MessageSquare = createIcon(faComment)
export const MessageSquareQuote = createIcon(faCommentDots)
export const Minimize = createIcon(faCompress)
export const Moon = createIcon(faMoon)
export const PenTool = createIcon(faPenNib)
export const Pin = createIcon(faThumbtack)
export const Play = createIcon(faPlay)
export const Plus = createIcon(faPlus)
export const Printer = createIcon(faPrint)
export const QrCode = createIcon(faQrcode)
export const Radio = createIcon(faTowerBroadcast)
export const RefreshCw = createIcon(faArrowsRotate)
export const RotateCcw = createIcon(faArrowRotateLeft)
export const Save = createIcon(faFloppyDisk)
export const Search = createIcon(faMagnifyingGlass)
export const Send = createIcon(faPaperPlane)
export const Share2 = createIcon(faShareNodes)
export const Shield = createIcon(faShieldHalved)
export const ShieldCheck = createIcon(faShieldHalved)
export const Shuffle = createIcon(faShuffle)
export const Sliders = createIcon(faSliders)
export const SlidersHorizontal = createIcon(faSliders)
export const Sparkles = createIcon(faWandMagicSparkles)
export const Square = createIcon(faSquare)
export const Star = createIcon(faStar)
export const Sun = createIcon(faSun)
export const Swords = createIcon(faKhanda)
export const Tag = createIcon(faTag)
export const Timer = createIcon(faStopwatch)
export const Trash2 = createIcon(faTrashCan)
export const Triangle = createIcon(faCaretUp)
export const Trophy = createIcon(faTrophy)
export const Tv = createIcon(faTv)
export const Type = createIcon(faFont)
export const Upload = createIcon(faUpload)
export const User = createIcon(faUser)
export const UserCheck = createIcon(faUserCheck)
export const UserPlus = createIcon(faUserPlus)
export const Users = createIcon(faUsers)
export const Volume2 = createIcon(faVolumeHigh)
export const VolumeX = createIcon(faVolumeXmark)
export const X = createIcon(faXmark)
export const XCircle = createIcon(faCircleXmark)
export const Zap = createIcon(faBolt)
export const Rocket = createIcon(faRocket)
export const Cat = createIcon(faCat)
export const Dragon = createIcon(faDragon)
export const Bullseye = createIcon(faBullseye)
export const Gem = createIcon(faGem)
