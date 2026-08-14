import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronsUp,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  FlaskConical,
  Info,
  Loader2,
  Minus,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { PRIORITY_STYLES, STATUS_STYLES } from "../lib/constants.js";
import { initials } from "../lib/format.js";

const BADGE = "badge ring-1 ring-inset";

/* A glyph per value reads faster than colour alone, and keeps the badges
   distinguishable for readers who cannot separate the hues. */
const PRIORITY_ICONS = {
  Critical: ChevronsUp,
  High: ArrowUp,
  Medium: Minus,
  Low: ArrowDown,
};

const STATUS_ICONS = {
  New: Sparkles,
  "In Progress": CircleDashed,
  Testing: FlaskConical,
  Resolved: CircleCheck,
  Closed: CircleSlash,
};

export function PriorityBadge({ value }) {
  const Icon = PRIORITY_ICONS[value] || PRIORITY_ICONS.Low;
  return (
    <span className={`${BADGE} ${PRIORITY_STYLES[value] || PRIORITY_STYLES.Low}`}>
      <Icon className="size-3 shrink-0" aria-hidden="true" strokeWidth={2.5} />
      {value}
    </span>
  );
}

export function StatusBadge({ value }) {
  const Icon = STATUS_ICONS[value] || STATUS_ICONS.New;
  return (
    <span className={`${BADGE} ${STATUS_STYLES[value] || STATUS_STYLES.New}`}>
      <Icon className="size-3 shrink-0" aria-hidden="true" strokeWidth={2.5} />
      {value}
    </span>
  );
}

export function Tag({ value, onRemove }) {
  return (
    <span className="chip">
      <span className="text-fg-subtle">#</span>
      {value}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="-mr-0.5 rounded-xs p-0.5 text-fg-subtle transition-colors hover:text-danger-fg"
          aria-label={`Remove tag ${value}`}
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export function Avatar({ user, size = 28, title }) {
  if (!user) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-fg-subtle"
        style={{ width: size, height: size }}
        title={title || "Unassigned"}
      >
        <UserRound style={{ width: size * 0.5, height: size * 0.5 }} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-raised"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: user.avatarColor || "var(--fg-subtle)",
      }}
      title={title || `${user.name} · ${user.role}`}
    >
      {initials(user.name)}
    </span>
  );
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div
      className="flex items-center justify-center gap-2.5 py-16 text-sm text-fg-muted"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="spin size-4 text-brand" aria-hidden="true" />
      {label}
    </div>
  );
}

/*
 * Grey block that stands in for content while it loads. Always give it the size
 * of the thing it replaces — the skeleton screens exist to stop layout shift,
 * not just to look busy.
 */
export function Skeleton({ className = "", style, index = 0 }) {
  return (
    <span
      className={`skeleton block ${className}`}
      style={{ "--i": index, ...style }}
      aria-hidden="true"
    />
  );
}

export function EmptyState({ title, hint, action, icon: Icon = Sparkles }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {/* Concentric rings read as an illustration without shipping an asset. */}
      <span className="relative grid size-16 place-items-center rounded-full bg-brand-soft">
        <span className="absolute inset-0 rounded-full ring-1 ring-brand-line" aria-hidden="true" />
        <span
          className="absolute -inset-3 rounded-full ring-1 ring-line opacity-70"
          aria-hidden="true"
        />
        <Icon className="size-7 text-brand-fg" aria-hidden="true" strokeWidth={1.6} />
      </span>
      <p className="mt-1 text-base font-semibold text-fg">{title}</p>
      {hint && <p className="max-w-sm text-sm text-fg-muted">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

const ALERT_TONES = {
  error: { className: "border-danger-line bg-danger-soft text-danger-fg", Icon: AlertTriangle },
  success: { className: "border-success-line bg-success-soft text-success-fg", Icon: CircleCheck },
  info: { className: "border-info-line bg-info-soft text-info-fg", Icon: Info },
};

export function Alert({ children, tone = "error" }) {
  if (!children) return null;
  const { className, Icon } = ALERT_TONES[tone] || ALERT_TONES.error;
  return (
    <div
      className={`fade flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm ${className}`}
      role="alert"
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
