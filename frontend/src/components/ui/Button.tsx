import React, { forwardRef } from "react"

const variants = {
  primary:
    "border-accent bg-accent text-text-primary hover:border-accent-hover hover:bg-accent-hover",
  secondary: "border-border bg-surface text-text-primary hover:border-control-border hover:bg-app",
  danger: "border-danger bg-danger text-white hover:border-danger-hover hover:bg-danger-hover",
  ghost: "border-transparent bg-transparent text-text-primary hover:border-border hover:bg-app",
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
      className={`inline-flex items-center justify-center gap-2 rounded-control border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${sizes[size] || sizes.default} ${className}`}
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
