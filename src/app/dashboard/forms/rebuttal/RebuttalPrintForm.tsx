"use client";

import { useState, useEffect } from "react";
import { Printer, Save, FileText, Loader2 } from "lucide-react";
import { submitRebuttal } from "@/app/actions/rebuttals";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Facility {
  id: string;
  name: string;
  facilityNumber: string | null;
}

export default function RebuttalPrintForm({ facilities }: { facilities: Facility[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    facilityId: "",
    citationNumber: "",
    dateOfVisit: "",
    content: "",
    signature: "",
    date: new Date().toISOString().split("T")[0],
    redactionAcknowledged: false,
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("rebuttal_form_draft");
    if (savedDraft) {
      try {
        setFormData(JSON.parse(savedDraft));
      } catch (e) {
        console.error("Failed to parse saved draft", e);
      }
    }
  }, []);

  // Save to localStorage when form data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("rebuttal_form_draft", JSON.stringify(formData));
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.facilityId || !formData.content) {
        throw new Error("Facility and Content are required.");
      }
      if (!formData.redactionAcknowledged) {
        throw new Error("You must acknowledge the redaction policy.");
      }

      // We map the form fields to what submitRebuttal expects.
      const fd = new FormData();
      fd.append("title", `Response to Citation ${formData.citationNumber || "Unknown"}`);
      fd.append("facilityId", formData.facilityId);
      fd.append("content", `Date of Visit: ${formData.dateOfVisit}\nCitation Number: ${formData.citationNumber}\n\n${formData.content}\n\nSigned: ${formData.signature} (${formData.date})`);
      fd.append("redactionAcknowledged", "on");

      await submitRebuttal(fd);
      
      // Clear draft on successful submit
      localStorage.removeItem("rebuttal_form_draft");
      toast.success("Rebuttal submitted successfully!");
      router.push("/dashboard/rebuttals");
      
    } catch (error: any) {
      toast.error(error.message || "Failed to submit rebuttal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedFacility = facilities.find(f => f.id === formData.facilityId);

  return (
    <div className="bg-white p-8 md:p-12 border border-[var(--color-border)] shadow-sm max-w-4xl mx-auto rounded-xl print-full-width">
      
      {/* Action Bar - Hidden on Print */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b border-[var(--color-border)] print-hide">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary)]" /> Fillable Rebuttal Form
          </h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Fill out this form to generate a clean PDF or submit it directly to your dashboard. Drafts are auto-saved.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" type="button" onClick={handlePrint} className="flex-1 sm:flex-none">
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 sm:flex-none bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]">
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Submit to DB
          </Button>
        </div>
      </div>

      {/* The Printable Form Area */}
      <form onSubmit={handleSubmit} className="space-y-8 text-black">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-widest border-b-2 border-black inline-block pb-2">
            Facility Rebuttal Response Form
          </h1>
          <p className="text-sm italic">Department of Social Services / Community Care Licensing Division</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase">Facility Name</label>
            <select
              name="facilityId"
              value={formData.facilityId}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="" disabled>Select a facility...</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase">Facility Number</label>
            <input
              type="text"
              readOnly
              value={selectedFacility?.facilityNumber || ""}
              className="w-full p-2 border border-gray-300 rounded bg-gray-50"
              placeholder="Auto-filled from selection"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase">Date of Visit / Inspection</label>
            <input
              type="date"
              name="dateOfVisit"
              value={formData.dateOfVisit}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase">Citation Number (Optional)</label>
            <input
              type="text"
              name="citationNumber"
              value={formData.citationNumber}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="space-y-2 print-avoid-break">
          <label className="block text-sm font-bold uppercase">Rebuttal Details / Narrative</label>
          <p className="text-xs text-gray-600 mb-2">Provide a detailed explanation of why this citation is being appealed. Ensure no Personally Identifiable Information (PII) or Protected Health Information (PHI) is included.</p>
          <textarea
            name="content"
            rows={12}
            value={formData.content}
            onChange={handleChange}
            required
            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--color-primary)] resize-y"
          ></textarea>
        </div>

        <div className="bg-gray-50 p-4 border border-gray-200 rounded print-avoid-break space-y-4">
          <h3 className="font-bold uppercase text-sm">Redaction Policy Attestation</h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="redactionAcknowledged"
              checked={formData.redactionAcknowledged}
              onChange={handleChange}
              className="mt-1"
              required
            />
            <span className="text-sm font-medium">
              I certify that all content written above has been fully redacted of any Protected Health Information (PHI), resident names, sensitive medical records, or personally identifiable information (PII) of staff/residents, in accordance with our Redaction Policy and HIPAA guidelines.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-avoid-break pt-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase">Signature (Type Name)</label>
            <input
              type="text"
              name="signature"
              value={formData.signature}
              onChange={handleChange}
              required
              className="w-full p-2 border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full p-2 border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
