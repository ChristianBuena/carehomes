export type Provider = {
  id: string;
  name: string;
  type: "attorney" | "paralegal";
  specialty: string;
  location: string;
  county: string;
  contactEmail?: string;
  website?: string;
  bio: string;
};

export const providers: Provider[] = [
  {
    id: "prov-1",
    name: "Sarah Jenkins, Esq.",
    type: "attorney",
    specialty: "CCLD Licensing Defense & Appeals",
    location: "Sacramento, CA",
    county: "Sacramento",
    contactEmail: "sarah@jenkinslaw.example.com",
    website: "https://jenkinslaw.example.com",
    bio: "Former CCLD licensing evaluator turned defense attorney. Over 15 years of experience representing ARF and RCFE operators in administrative hearings, citation appeals, and license revocation defense.",
  },
  {
    id: "prov-2",
    name: "Michael Chang",
    type: "paralegal",
    specialty: "Citation Rebuttal Drafting & Compliance Plans",
    location: "San Jose, CA",
    county: "Santa Clara",
    contactEmail: "michael@changcompliance.example.com",
    bio: "Independent paralegal specializing in Title 22 compliance. Expert in drafting factual, professional rebuttals to Type A and Type B citations and developing structured Plans of Correction (POCs).",
  },
  {
    id: "prov-3",
    name: "Elena Rodriguez, Attorney at Law",
    type: "attorney",
    specialty: "Elder Care Law & Facility Defense",
    location: "Los Angeles, CA",
    county: "Los Angeles",
    website: "https://rodriguezfirm.example.com",
    bio: "Dedicated to protecting care facility operators. Specialized focus on defending against civil penalties, negotiating with regional offices, and providing preemptive compliance audits.",
  },
  {
    id: "prov-4",
    name: "David Thompson Legal Services",
    type: "paralegal",
    specialty: "Policy Development & Waiver Applications",
    location: "Fresno, CA",
    county: "Fresno",
    contactEmail: "dthompson@dtlegal.example.com",
    bio: "Registered paralegal assisting facilities with complex waiver applications, exceptions, and drafting custom facility policies that align strictly with recent CCLD regulation updates.",
  },
  {
    id: "prov-5",
    name: "Amanda Wright, Esq.",
    type: "attorney",
    specialty: "Administrative Hearings (OAH)",
    location: "San Diego, CA",
    county: "San Diego",
    contactEmail: "amanda@wrightdefense.example.com",
    website: "https://wrightdefense.example.com",
    bio: "Aggressive defense for care providers facing temporary suspension orders (TSO) or license revocation. High success rate in Office of Administrative Hearings (OAH) cases.",
  },
  {
    id: "prov-6",
    name: "Care Compliance Group (John Davis)",
    type: "paralegal",
    specialty: "Audit Preparation & Corrective Actions",
    location: "Oakland, CA",
    county: "Alameda",
    bio: "Paralegal consulting group helping facilities prepare for annual inspections, conduct mock audits, and efficiently resolve pending non-compliance citations.",
  },
  {
    id: "prov-7",
    name: "Marcus Johnson, Esq.",
    type: "attorney",
    specialty: "Employment Law for Care Facilities",
    location: "Riverside, CA",
    county: "Riverside",
    contactEmail: "mjohnson@mjlaw.example.com",
    bio: "Providing specialized legal counsel to care facility operators regarding caregiver employment law, wage and hour disputes, and defending against employee retaliation claims triggered by CCLD reports.",
  },
  {
    id: "prov-8",
    name: "Sophia Martinez Support Services",
    type: "paralegal",
    specialty: "Appeals Documentation & Record Keeping",
    location: "Bakersfield, CA",
    county: "Kern",
    website: "https://martinezsupport.example.com",
    bio: "Assisting facility owners in organizing evidence, structuring formal appeals documentation, and establishing compliant record-keeping systems that satisfy CCLD evaluator requirements.",
  },
];
