import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/providers/i18n-provider";
import type { Service } from "@/lib/types/database";
import { getRequiredDocs } from "@/lib/dashboard/service-requirements";

interface ApplicationState {
  serviceId: string;
  notes: string;
  uploadedDocuments: { name: string; url: string }[];
  selectedPackage?: string;
  step: 1 | 2 | 3;
}

export function StepDetails({
  service,
  state,
  setState,
  onNext,
}: {
  service: Service;
  state: ApplicationState;
  setState: (state: ApplicationState) => void;
  onNext: () => void;
}) {
  const { locale } = useI18n();
  const [localNotes, setLocalNotes] = useState(state.notes);

  const localDesc =
    (locale === "zh" && service.description_zh) ||
    (locale === "rw" && service.description_rw) ||
    service.description_en ||
    "";

  const requiredDocs = getRequiredDocs(service.slug);
  const basePrice = service.price_usd_min ?? 0;
  const rwfPrice = Math.round(basePrice * 1285);

  const handleContinue = () => {
    setState({ ...state, notes: localNotes });
    onNext();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Description</Label>
            <p className="mt-2 text-sm text-foreground">{localDesc}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Price (USD)</Label>
              <p className="mt-1 text-lg font-bold text-primary">${basePrice.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Approx. (RWF)</Label>
              <p className="mt-1 text-lg font-bold text-primary">RWF {rwfPrice.toLocaleString()}</p>
            </div>
          </div>

          {service.estimated_days_min != null && service.estimated_days_max != null && (
            <div className="pt-2 border-t">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Estimated Duration</Label>
              <p className="mt-1 text-sm text-foreground">
                {service.estimated_days_min}–{service.estimated_days_max} business days
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's Included</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {requiredDocs.length > 0 ? (
              requiredDocs.map((doc, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="text-sm text-foreground">{doc}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No specific documents required for this service.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Special notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information for our team..."
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground">This helps us better understand your needs.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleContinue} className="w-full sm:w-auto ml-auto">
          Continue to Documents
        </Button>
      </div>
    </div>
  );
}
