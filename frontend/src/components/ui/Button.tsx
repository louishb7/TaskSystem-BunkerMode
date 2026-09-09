import React, { forwardRef } from "react"

const variants = {
  primary:
    "border-action bg-action text-on-action enabled:hover:border-action-hover enabled:hover:bg-action-hover",
  secondary:
    "border-control-border bg-transparent text-text-primary enabled:hover:bg-surface-subtle",
  danger:
    "border-transparent bg-transparent text-danger enabled:hover:border-danger/30 enabled:hover:bg-danger-soft enabled:hover:text-danger-hover",
  ghost:
    "border-transparent bg-transparent text-text-secondary enabled:hover:bg-surface-subtle enabled:hover:text-text-primary",
}

const sizes = {
  default: "min-h-11 px-4 py-2 text-sm",
  small: "min-h-9 px-3 py-1.5 text-xs",
}

type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  loading?: boolean
  size?: keyof typeof sizes
  variant?: keyof typeof variants
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className = "",
    disabled = false,
    loading = false,
    size = "default",
    type = "button",
    variant = "primary",
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading

  return (
    <button
      {...props}
      ref={ref}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-control border font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${sizes[size] || sizes.default} ${className}`}
      disabled={isDisabled}
      type={type}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      <span>{children}</span>
    </button>
  )
})

export default Button
