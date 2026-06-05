import { cn } from "@/lib/utils";
import { avatarColor, initials } from "./utils";

export function AvatarBubble({
  name,
  size = 40,
  online,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  online?: boolean | null;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <div
        className={cn(
          "grid h-full w-full place-items-center rounded-full font-semibold text-white",
          avatarColor(name),
        )}
        style={{ fontSize: size * 0.4 }}
      >
        {initials(name)}
      </div>
      {online ? (
        <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
      ) : null}
    </div>
  );
}
