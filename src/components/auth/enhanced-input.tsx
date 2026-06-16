import { forwardRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  showPasswordToggle?: boolean;
  secureIndicator?: boolean;
}

/**
 * Enhanced input component with:
 * - Focus animations (glow effect)
 * - Password visibility toggle
 * - Secure indicator icon
 * - Error state styling
 * - Accessibility features
 */
export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  (
    {
      label,
      error,
      hint,
      showPasswordToggle = false,
      secureIndicator = false,
      type = "text",
      className,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
            {secureIndicator && isPassword && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Lock className="h-3 w-3" />
                Secure
              </span>
            )}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={`w-full px-4 py-2.5 md:py-3 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background focus:border-primary ${
              error
                ? "border-destructive focus:ring-destructive focus:border-destructive"
                : ""
            } ${className || ""}`}
            {...props}
          />

          {/* Password visibility toggle */}
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Helper text */}
        {hint && !error && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}

        {/* Error message */}
        {error && (
          <p className="text-xs text-destructive font-medium">{error}</p>
        )}
      </div>
    );
  }
);

EnhancedInput.displayName = "EnhancedInput";
