import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { StripePaymentForm } from "@/components/payments/stripe-payment-form";
import type { Service } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

interface ApplicationState {
  serviceId: string;
  notes: string;
  uploadedDocuments: { name: string; url: string }[];
  selectedPackage?: string;
  step: 1 | 2 | 3;
}

export function StepPayment({
  service,
  state,
  setState,
  onBack,
  portalSource,
  user,
}: {
  service: Service;
  state: ApplicationState;
  setState: (state: ApplicationState) => void;
  onBack: () => void;
  portalSource: string;
  user: User | null;
}) {
  const navigate = useNavigate();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const basePrice = service.price_usd_min ?? 0;
  const rwfPrice = Math.round(basePrice * 1285);

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    setProcessing(true);

    try {
      // Pick a random staff member with the required capability
      const capabilityMap: Record<string, string> = {
        visa: "handle_visa",
        accounting: "handle_accounting",
        translation: "handle_translation",
        consultancy: "handle_consultancy",
      };

      const capability = capabilityMap[service.category] || "handle_consultancy";
      const { data: staffData } = await supabase
        .from("staff_capabilities")
        .select("user_id")
        .eq("capability", capability)
        .limit(10);

      const staffId =
        staffData && staffData.length > 0
          ? staffData[Math.floor(Math.random() * staffData.length)].user_id
          : null;

      // Create service request
      const { data: requestData, error: requestError } = await supabase
        .from("service_requests")
        .insert([
          {
            client_id: user.id,
            service_id: service.id,
            service_category: service.category,
            status: "submitted",
            progress_step: 1,
            progress_total: 5,
            assigned_staff_id: staffId,
            applicant_type: "individual",
            priority: "normal",
            notes: state.notes || null,
            portal_source: portalSource,
          },
        ])
        .select()
        .single();

      if (requestError) throw requestError;
      if (!requestData) throw new Error("Failed to create service request");

      // Upload documents to service request
      if (state.uploadedDocuments.length > 0) {
        const documentInserts = state.uploadedDocuments.map((doc) => ({
          service_request_id: requestData.id,
          client_id: user.id,
          uploaded_by: user.id,
          file_path: doc.url,
          file_name: doc.name,
          file_type: doc.name.split(".").pop() || "unknown",
          status: "uploaded" as const,
          is_final_delivery: false,
        }));

        const { error: docError } = await supabase
          .from("documents")
          .insert(documentInserts);

        if (docError) console.error("Failed to insert documents:", docError);
      }

      toast.success("Service request created successfully!");
      navigate({
        to: "/dashboard/confirmation/$requestId",
        params: { requestId: requestData.id },
      });
    } catch (error) {
      console.error("Payment finalization error:", error);
      toast.error((error as Error).message || "Failed to process payment");
      setProcessing(false);
    }
  };

  const handlePaymentError = (message: string, error?: unknown) => {
    console.error("Payment error:", error);
    toast.error(message);
    setProcessing(false);
  };

  if (basePrice === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Free Service</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This service is free to request. Click the button below to submit your application.
            </p>
            <Button
              onClick={() => handlePaymentSuccess("free")}
              disabled={processing}
              className="w-full"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {!showPaymentForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Service Fee</span>
                <span className="font-semibold">${basePrice.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Approx.</span>
                <span>RWF {rwfPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                You will be redirected to a secure payment page to complete your payment.
              </p>
              <Button
                onClick={() => setShowPaymentForm(true)}
                className="w-full"
              >
                Proceed to Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showPaymentForm && (
        <StripePaymentForm
          amount={basePrice}
          serviceTitle={`Service Application: ${service.name_en}`}
          description={`Complete your application for ${service.name_en}`}
          metadata={{
            serviceId: service.id,
            serviceSlug: service.slug,
            notes: state.notes,
            documentCount: state.uploadedDocuments.length.toString(),
          }}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentForm(false)}
          onError={handlePaymentError}
        />
      )}

      <div className="flex gap-3 justify-between">
        <Button variant="ghost" onClick={onBack} disabled={showPaymentForm || processing}>
          Back
        </Button>
      </div>
    </div>
  );
}
