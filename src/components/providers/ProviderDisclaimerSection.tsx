import { Mail, Search, Info } from "lucide-react";
import { DisclaimerCallout } from "@/components/ui/DisclaimerCallout";
import { Button } from "@/components/ui/button";

export function ProviderDisclaimerSection() {
  return (
    <section className="mt-16 bg-[var(--color-bg)] border-t border-[var(--color-border)] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Members Column */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[var(--color-primary)] flex items-center gap-2">
              <Search className="w-5 h-5" />
              For Members: How to Use This Directory
            </h3>
            <p className="text-[var(--color-text)] leading-relaxed">
              This directory is provided as a starting point to help you find independent legal and compliance professionals who specialize in CCLD regulations. 
              <strong> You must contact the providers directly</strong> to discuss your case, request a consultation, and determine their fees.
            </p>
            <p className="text-[var(--color-text)] leading-relaxed">
              We highly recommend interviewing multiple professionals to find the best fit for your specific facility's needs and current regulatory challenges.
            </p>
            <div className="pt-2">
              <Button variant="outline" asChild>
                <a href="mailto:support@carehomessupportdocs.org?subject=Report%20Provider%20Listing%20Problem">
                  <Info className="w-4 h-4 mr-2" />
                  Report a Problem with a Listing
                </a>
              </Button>
            </div>
          </div>

          {/* Providers Column */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
              <Mail className="w-5 h-5" />
              For Providers: How to Get Listed
            </h3>
            <p className="text-[var(--color-text)] leading-relaxed">
              Are you an attorney, paralegal, or compliance consultant specializing in California Title 22 regulations, citation appeals, or facility defense?
            </p>
            <p className="text-[var(--color-text)] leading-relaxed">
              We offer neutral, free directory listings to qualified professionals to help care facility operators easily find specialized assistance when they need it most.
            </p>
            <div className="pt-2">
              <Button className="bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 text-white" asChild>
                <a href="mailto:providers@carehomessupportdocs.org?subject=Provider%20Directory%20Listing%20Request">
                  <Mail className="w-4 h-4 mr-2" />
                  Request a Directory Listing
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <DisclaimerCallout variant="legal" title="Official Legal Disclaimer">
          CareHomesSupportDocs.org is an independent platform and is NOT affiliated with, endorsed by, or representing the California Department of Social Services (CDSS) or the Community Care Licensing Division (CCLD). 
          The information contained in this provider directory is for general informational purposes only and does not constitute legal advice. 
          CareHomesSupportDocs.org does not vet, endorse, or recommend any specific attorney, paralegal, or compliance consultant listed herein. 
          We receive no referral fees or compensation from these providers. 
          Your use of this directory does not create an attorney-client relationship. You are solely responsible for conducting your own due diligence before hiring any professional.
        </DisclaimerCallout>
      </div>
    </section>
  );
}
