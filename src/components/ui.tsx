import Link from "next/link";
import { forwardRef } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { WorkPriority, WorkStatus } from "@/types";

// ---------------------------------------------------------------------------
// Shared vocabulary: one button shape, one form-control vocabulary,
// one pill style. Radius caps at 12px; pills are the only full-round shape.
// Motion is state-only, 150–250ms, with reduced-motion handled globally.
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "default" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-onprimary hover:bg-primarystrong active:bg-primarystrong disabled:bg-surface2 disabled:text-muted",
  secondary:
    "bg-surface text-ink border border-line hover:bg-surface2 active:bg-surface2 disabled:text-muted",
  danger:
    "bg-danger text-ondanger hover:opacity-90 active:opacity-90 disabled:opacity-50",
  ghost: "text-ink hover:bg-surface active:bg-surface disabled:text-muted",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "min-h-[44px] px-4 py-2 text-sm",
  sm: "min-h-[36px] px-3 py-1.5 text-xs",
};

export function Button({
  variant = "primary",
  size = "default",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-200 disabled:cursor-not-allowed ${buttonStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "default",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-200 ${buttonStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

const inputBase =
  "w-full min-h-[44px] rounded-md border border-line bg-bg px-3 py-2 text-base text-ink transition-colors duration-200 hover:border-muted disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted aria-[invalid=true]:border-danger";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
    return <input ref={ref} {...props} className={`${inputBase} ${props.className ?? ""}`} />;
  },
);

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${inputBase} min-h-[88px] ${props.className ?? ""}`} />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

// ---------------------------------------------------------------------------
// Pills: priority + status share one shape; meaning comes from solid color,
// never from side stripes or gradients.
// ---------------------------------------------------------------------------

const priorityStyles: Record<WorkPriority, string> = {
  CRITICAL: "bg-danger text-ondanger",
  HIGH: "bg-accent text-onaccent",
  NORMAL: "bg-surface2 text-ink",
  LOW: "bg-surface text-muted border border-line",
};

export function PriorityPill({ value }: { value: WorkPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${priorityStyles[value]}`}
    >
      {value}
    </span>
  );
}

const statusStyles: Record<WorkStatus, string> = {
  NOT_STARTED: "bg-surface text-muted border border-line",
  IN_PROGRESS: "bg-warningbg text-warningink",
  COMPLETED: "bg-success text-onsuccess",
  BLOCKED: "bg-danger text-ondanger",
  DELAYED: "bg-accent text-onaccent",
};

const statusLabels: Record<WorkStatus, string> = {
  NOT_STARTED: "ยังไม่เริ่ม",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  BLOCKED: "ติดขัด/รอแก้ไข",
  DELAYED: "ล่าช้ากว่าแผน",
};

export function StatusPill({ value }: { value: WorkStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[value]}`}
    >
      {statusLabels[value]}
    </span>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface2 px-2.5 py-1 text-xs font-semibold">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page structure + states
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-line bg-surface px-5 py-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface2 text-muted">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-sm text-muted">{body}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-warningbg px-3 py-2 text-sm font-medium text-warningink">
      {message}
    </p>
  );
}
