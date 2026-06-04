import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, File, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getRequiredDocs } from "@/lib/dashboard/service-requirements";
import type { Service } from "@/lib/types/database";

interface ApplicationState {
  serviceId: string;
  notes: string;
  uploadedDocuments: { name: string; url: string }[];
  selectedPackage?: string;
  step: 1 | 2 | 3;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

export function StepDocuments({
  service,
  state,
  setState,
  onNext,
  onBack,
}: {
  service: Service;
  state: ApplicationState;
  setState: (state: ApplicationState) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredDocs = getRequiredDocs(service.slug);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10 MB)`);
        continue;
      }

      const uploadId = `${Date.now()}-${Math.random()}`;
      setUploading((prev) => [...prev, { id: uploadId, name: file.name, progress: 0 }]);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `service-documents/${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file, {
            onUploadProgress: (progress) => {
              const percent = (progress.loaded / progress.total) * 100;
              setUploading((prev) =>
                prev.map((f) =>
                  f.id === uploadId ? { ...f, progress: Math.round(percent) } : f
                )
              );
            },
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("documents")
          .getPublicUrl(filePath);

        setState({
          ...state,
          uploadedDocuments: [
            ...state.uploadedDocuments,
            { name: file.name, url: publicUrlData.publicUrl },
          ],
        });

        setUploading((prev) => prev.filter((f) => f.id !== uploadId));
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        setUploading((prev) =>
          prev.map((f) =>
            f.id === uploadId
              ? { ...f, error: (error as Error).message }
              : f
          )
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveDocument = (index: number) => {
    setState({
      ...state,
      uploadedDocuments: state.uploadedDocuments.filter((_, i) => i !== index),
    });
  };

  const canContinue = state.uploadedDocuments.length > 0 || requiredDocs.length === 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Required Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {requiredDocs.length > 0 ? (
            <ul className="space-y-2">
              {requiredDocs.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <span className="text-foreground">{doc}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No documents required for this service.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium text-sm">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC, DOCX (max 10 MB each)</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Uploading files */}
          {uploading.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Uploading...</Label>
              {uploading.map((file) => (
                <div key={file.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate">{file.name}</span>
                    <span className="text-muted-foreground">{file.progress}%</span>
                  </div>
                  <Progress value={file.progress} className="h-2" />
                  {file.error && (
                    <p className="text-xs text-destructive">{file.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Uploaded files */}
          {state.uploadedDocuments.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-medium">Uploaded Documents</Label>
              {state.uploadedDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{doc.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveDocument(idx)}
                    className="text-muted-foreground hover:text-destructive transition shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canContinue || uploading.length > 0}>
          {uploading.length > 0 ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Continue to Payment"
          )}
        </Button>
      </div>
    </div>
  );
}
