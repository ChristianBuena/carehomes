"use client";

import { useState, useEffect } from "react";
import { Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Facility {
  id: string;
  name: string;
  facilityNumber: string | null;
}

export default function RedactionPrintForm({ facilities, userName }: { facilities: Facility[], userName: string }) {
  // Form State
  const [formData, setFormData] = useState({
    facilityId: "",
    memberName: userName,
    check1: false,
    check2: false,
    check3: false,
    signature: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("redaction_form_draft");
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
      localStorage.setItem("redaction_form_draft", JSON.stringify(formData));
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const selectedFacility = facilities.find(f => f.id === formData.facilityId);

  return (
    <div className="bg-white p-8 md:p-12 border border-[var(--color-border)] shadow-sm max-w-4xl mx-auto rounded-xl print-full-width">
      
      {/* Action Bar - Hidden on Print */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b border-[var(--color-border)] print-hide">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary)]" /> Fillable Redaction Attestation
          </h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Generate your redaction compliance certificate to include with manual submissions. Auto-saves as you type.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button onClick={handlePrint} className="w-full sm:w-auto bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]">
            <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* The Printable Form Area */}
      <div className="space-y-8 text-black">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-widest border-b-2 border-black inline-block pb-2">
            Redaction Attestation Form
          </h1>
          <p className="text-sm italic">CareHomesSupportDocs Privacy &amp; Compliance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase">Member / Submitter Name</label>
            <input
              type="text"
              name="memberName"
              value={formData.memberName}
              onChange={handleChange}
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
              className="w-full p-2 border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <label className="block text-sm font-bold uppercase">Facility Affiliation</label>
          <select
            name="facilityId"
            value={formData.facilityId}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="" disabled>Select a facility...</option>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name} (License: {f.facilityNumber || "Pending"})</option>
            ))}
          </select>
        </div>

        <div className="border border-black p-6 space-y-6">
          <h2 className="font-bold uppercase text-lg mb-4">Attestation Checklist</h2>
          
          <label className="flex items-start gap-4 cursor-pointer">
            <div className="pt-1">
              <input
                type="checkbox"
                name="check1"
                checked={formData.check1}
                onChange={handleChange}
                className="w-5 h-5 border-2 border-black rounded-sm"
              />
            </div>
            <span className="text-base leading-relaxed">
              I certify that I have thoroughly reviewed all attached documents, rebuttals, and supporting evidence.
            </span>
          </label>

          <label className="flex items-start gap-4 cursor-pointer">
            <div className="pt-1">
              <input
                type="checkbox"
                name="check2"
                checked={formData.check2}
                onChange={handleChange}
                className="w-5 h-5 border-2 border-black rounded-sm"
              />
            </div>
            <span className="text-base leading-relaxed">
              I certify that I have permanently removed, blacked out, or redacted all Protected Health Information (PHI) and Personally Identifiable Information (PII) belonging to residents, including but not limited to names, dates of birth, medical records, and SSNs.
            </span>
          </label>

          <label className="flex items-start gap-4 cursor-pointer">
            <div className="pt-1">
              <input
                type="checkbox"
                name="check3"
                checked={formData.check3}
                onChange={handleChange}
                className="w-5 h-5 border-2 border-black rounded-sm"
              />
            </div>
            <span className="text-base leading-relaxed">
              I understand that submitting unredacted PHI/PII is a violation of HIPAA and state privacy laws, and I assume full responsibility for the contents of my submission.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-avoid-break pt-10">
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase">Signature</label>
            <input
              type="text"
              name="signature"
              value={formData.signature}
              onChange={handleChange}
              className="w-full p-2 border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-[var(--color-primary)]"
            />
            <p className="text-xs text-gray-500 italic">By typing your name, you are signing this document electronically.</p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase">Print Name</label>
            <input
              type="text"
              readOnly
              value={formData.memberName}
              className="w-full p-2 border-b-2 border-gray-400 bg-transparent focus:outline-none text-gray-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
