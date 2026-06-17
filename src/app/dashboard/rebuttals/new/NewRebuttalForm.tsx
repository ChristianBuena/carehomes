"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UploadCloud, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitRebuttal } from "@/app/actions/rebuttals";

// Note: In a real app, this data would be passed from a server component or fetched via SWR
// We will assume the parent layout or the page itself fetches the user's facilities.
// For this client component, we'll fetch the facilities via a useEffect or pass them as props.

interface FacilityOption {
  id: string;
  name: string;
}

export default function NewRebuttalForm({ facilities }: { facilities: FacilityOption[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await submitRebuttal(formData);
      router.push("/dashboard/rebuttals?success=true");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard/rebuttals">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Submit Rebuttal</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Your submission will be reviewed by moderation before publishing.
          </p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 shadow-sm">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-[var(--color-danger)]/10 text-[var(--color-danger)] p-4 rounded-lg flex gap-3 text-sm font-medium">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Rebuttal Title</Label>
            <Input 
              id="title" 
              name="title" 
              placeholder="e.g. Response to Citation #123456" 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="facilityId">Target Facility</Label>
            <select 
              id="facilityId" 
              name="facilityId" 
              required
              defaultValue=""
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Select a facility...</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Rebuttal Content</Label>
            <Textarea 
              id="content" 
              name="content" 
              rows={8}
              placeholder="Provide a detailed explanation or response to the citation..." 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label>Supporting Document (Optional)</Label>
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 hover:bg-[var(--color-bg)] transition-colors relative">
              <input 
                type="file" 
                id="document" 
                name="document" 
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center text-center space-y-2 pointer-events-none">
                <UploadCloud className="h-8 w-8 text-[var(--color-muted)]" />
                <div className="text-sm font-medium text-[var(--color-text)]">
                  {fileName ? (
                    <span className="text-[var(--color-primary)]">{fileName}</span>
                  ) : (
                    "Click to upload or drag and drop"
                  )}
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  PDF, PNG, JPG or Word (max. 10MB)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/20 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm text-[var(--color-text)]">Redaction Policy</h4>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              By submitting this rebuttal, you certify that all uploaded documents and written content have been fully redacted of any Protected Health Information (PHI), resident names, sensitive medical records, or personally identifiable information (PII) of staff/residents, in accordance with our Redaction Policy and HIPAA guidelines.
            </p>
            <label className="flex items-start gap-3 mt-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="redactionAcknowledged" 
                required 
                className="mt-0.5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <span className="text-sm font-medium text-[var(--color-text)]">
                I have redacted all sensitive information and agree to the Redaction Policy.
              </span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-border)]">
            <Button variant="outline" type="button" onClick={() => router.push("/dashboard/rebuttals")}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white min-w-[140px]"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for Review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
