import { forwardRef } from "react";

interface ToggleSwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

/**
 * Modern toggle switch component
 * - Smooth animation
 * - Accessible with keyboard support
 * - Mobile-friendly tap targets
 */
export const ToggleSwitch = forwardRef<HTMLInputElement, ToggleSwitchProps>(
  ({ label, description, checked, onChange, ...props }, ref) => {
    return (
      <div className="flex items-start gap-3">
        <div className="flex items-center pt-0.5">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div className="relative h-6 w-11 rounded-full bg-muted transition-colors duration-200 peer-checked:bg-primary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary peer-focus:ring-offset-2 peer-focus:ring-offset-background">
            <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 peer-checked:translate-x-5" />
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          {label && (
            <label className="text-sm font-medium text-foreground cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    );
  }
);

ToggleSwitch.displayName = "ToggleSwitch";
