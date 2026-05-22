import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/providers/i18n-provider";
import type { ServiceRequestStatus, ClaimStatus, DocumentStatus } from "@/lib/types/database";

const colorMap: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  under_review: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  awaiting_client: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  verified: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  submitted_to_authority:
    "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  completed: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground",
  // documents
  uploaded: "bg-muted text-muted-foreground",
  final_delivery: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  // claims
  open: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  resolved: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ServiceRequestStatus | ClaimStatus | DocumentStatus | string;
  className?: string;
}) {
  const { t } = useI18n();
  const label = t(`dashboard.status.${status}`);
  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-medium capitalize",
        colorMap[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {label === `dashboard.status.${status}` ? status.replace(/_/g, " ") : label}
    </Badge>
  );
}
