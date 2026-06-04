import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { usePortal } from "@/lib/portal-context";
import { useI18n } from "@/lib/providers/i18n-provider";
import type { Service } from "@/lib/types/database";
import { StepDetails } from "@/components/dashboard/apply-steps/step-details";
import { StepDocuments } from "@/components/dashboard/apply-steps/step-documents";
import { StepPayment } from "@/components/dashboard/apply-steps/step-payment";

export const Route = createFileRoute("/dashboard/services/apply/$slug")({});

type Step = 1 | 2 | 3;

interface ApplicationState {
  serviceId: string;
  notes: string;
  uploadedDocuments: { name: string; url: string }[];
  selectedPackage?: string;
  step: Step;
}

function ServiceApplyPage() {
  const { slug } = useParams({ from: "/dashboard/services/apply/$slug" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { current: portalSource } = usePortal();
  const { locale } = useI18n();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<ApplicationState>({
    serviceId: "",
    notes: "",
    uploadedDocuments: [],
    step: 1,
  });

  // Fetch service by slug
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from("services")
          .select("*")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (err) throw err;
        if (!data) {
          setError("Service not found");
          return;
        }

        setService(data as Service);
        setState((prev) => ({ ...prev, serviceId: data.id }));
      } catch (e) {
        setError((e as Error).message);
        toast.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Redirect if service not found
  useEffect(() => {
    if (!loading && error) {
      const timer = setTimeout(() => {
        navigate({ to: "/dashboard/services" });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, error, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading service...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Service not found</p>
          <p className="text-sm text-muted-foreground mb-4">Redirecting to services...</p>
        </div>
      </div>
    );
  }

  const localName =
    (locale === "zh" && service.name_zh) || (locale === "rw" && service.name_rw) || service.name_en;

  const handleNext = () => {
    if (state.step < 3) {
      setState((prev) => ({ ...prev, step: (prev.step + 1) as Step }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      setState((prev) => ({ ...prev, step: (prev.step - 1) as Step }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClose = () => {
    navigate({ to: "/dashboard/services" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <button
              onClick={handleClose}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Services
            </button>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Step {state.step} of 3</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold">{localName}</h1>
              <Badge variant="secondary" className="mt-1 capitalize">
                {service.category}
              </Badge>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4 flex items-center justify-between">
            {[1, 2, 3].map((step, idx) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                    state.step > step
                      ? "border-primary bg-primary text-primary-foreground"
                      : state.step === step
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {state.step > step ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{step}</span>
                  )}
                </div>
                {idx < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition ${
                      state.step > step ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          {state.step === 1 && (
            <StepDetails
              service={service}
              state={state}
              setState={setState}
              onNext={handleNext}
            />
          )}
          {state.step === 2 && (
            <StepDocuments
              service={service}
              state={state}
              setState={setState}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {state.step === 3 && (
            <StepPayment
              service={service}
              state={state}
              setState={setState}
              onBack={handleBack}
              portalSource={portalSource}
              user={user}
            />
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3 justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={state.step === 1}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={state.step === 3}
              className="flex-1 sm:flex-none"
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ServiceApplyPage as Component };
