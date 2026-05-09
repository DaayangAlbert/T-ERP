import { forwardRef, ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

type Variant = "primary" | "default" | "success" | "danger" | "ghost" | "link";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary-500 text-white border-primary-500 hover:bg-primary-600 hover:shadow-brand active:scale-[.97]",
  default:
    "bg-white text-ink border-line-2 hover:bg-surface-alt hover:border-primary-300",
  success:
    "bg-success text-white border-success hover:bg-green-700",
  danger:
    "bg-danger text-white border-danger hover:bg-red-700",
  ghost:
    "bg-transparent text-ink border-transparent hover:bg-surface-alt",
  link:
    "bg-transparent text-primary-600 border-transparent hover:underline p-0",
};

const sizes: Record<Size, string> = {
  xs: "h-6 px-2 text-[11px]",
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-4 text-[13px]",
  lg: "h-11 px-5 text-[14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "sm", loading, fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center gap-1.5",
          "rounded-md border font-medium",
          "transition-all duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          loading && "cursor-wait",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
