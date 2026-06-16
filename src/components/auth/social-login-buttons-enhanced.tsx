import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Enhanced Google Sign In Button with pill-style design
 */
export function GoogleSignInButtonEnhanced({
  onClick,
  loading = false,
  disabled = false,
}: SocialButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full h-11 rounded-full flex items-center justify-center gap-2 transition-all duration-200 hover:bg-muted hover:border-primary/50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      <span className="text-sm font-medium">
        {loading ? "Signing in..." : "Continue with Google"}
      </span>
    </Button>
  );
}

/**
 * Enhanced Microsoft Sign In Button with pill-style design
 */
export function MicrosoftSignInButtonEnhanced({
  onClick,
  loading = false,
  disabled = false,
}: SocialButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full h-11 rounded-full flex items-center justify-center gap-2 transition-all duration-200 hover:bg-muted hover:border-primary/50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
          <rect x="12" y="1" width="11" height="9" fill="#7FBA00" />
          <rect x="1" y="12" width="9" height="11" fill="#00A4EF" />
          <rect x="12" y="12" width="11" height="11" fill="#FFB900" />
        </svg>
      )}
      <span className="text-sm font-medium">
        {loading ? "Signing in..." : "Continue with Microsoft"}
      </span>
    </Button>
  );
}

/**
 * Enhanced WeChat Sign In Button with pill-style design
 */
export function WeChatSignInButtonEnhanced({
  onClick,
  loading = false,
  disabled = false,
}: SocialButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full h-11 rounded-full flex items-center justify-center gap-2 transition-all duration-200 hover:bg-muted hover:border-primary/50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 2C6.48 2 2 5.58 2 10c0 2.54 1.19 4.85 3.15 6.37.08 2.85-1.18 4.4-2.85 5.32 1.92-.08 4.58-.88 6.14-2.29.57.08 1.17.12 1.8.12 5.52 0 10-3.58 10-8 0-4.42-4.48-8-10-8zm-1.5 7c-.83 0-1.5-.67-1.5-1.5S9.67 6 10.5 6s1.5.67 1.5 1.5S11.33 9 10.5 9zm3 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
          />
        </svg>
      )}
      <span className="text-sm font-medium">
        {loading ? "Signing in..." : "Continue with WeChat"}
      </span>
    </Button>
  );
}

/**
 * Social login button group with responsive layout
 */
export function SocialLoginGroup({
  onGoogle,
  onMicrosoft,
  onWeChat,
  loading = false,
  disabled = false,
}: {
  onGoogle?: () => void;
  onMicrosoft?: () => void;
  onWeChat?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {onGoogle && (
        <GoogleSignInButtonEnhanced
          onClick={onGoogle}
          loading={loading}
          disabled={disabled}
        />
      )}
      {onMicrosoft && (
        <MicrosoftSignInButtonEnhanced
          onClick={onMicrosoft}
          loading={loading}
          disabled={disabled}
        />
      )}
      {onWeChat && (
        <WeChatSignInButtonEnhanced
          onClick={onWeChat}
          loading={loading}
          disabled={disabled}
        />
      )}
    </div>
  );
}

/**
 * Divider component for separating social login from email/password
 */
export function OrDividerEnhanced() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
      </div>
    </div>
  );
}
