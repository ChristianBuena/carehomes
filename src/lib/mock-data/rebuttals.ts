export type Rebuttal = {
  id: string;
  title: string;
  citationId: string;
  citationDate: string;
  summary: string;
  moderationStatus: "approved";
  publishedAt: string;
  filesUrl?: string;
};

// Mock generator — replace with real API fetch when backend is ready
export function generateMockRebuttals(
  facilityId: string,
  count: number
): Rebuttal[] {
  const TITLES = [
    "Response to Staffing Ratio Citation",
    "Rebuttal Regarding Medication Administration Finding",
    "Response to Resident Rights Citation",
    "Rebuttal to Emergency Preparedness Deficiency",
    "Response to Physical Environment Citation",
    "Rebuttal Regarding Personal and Incidental Needs Finding",
    "Response to Admission Agreement Citation",
    "Rebuttal to Staff Training Deficiency",
  ];

  const SUMMARIES = [
    "Our facility respectfully submits this rebuttal to address the cited deficiency. Our records demonstrate that staffing schedules met the required minimum ratios at all times during the survey period. The citation references a brief overlap period during a shift transition, which is accounted for in our supervisor coverage policy. A corrective memo was issued to all staff immediately following the survey, and our staffing coordinator now performs twice-daily headcount audits.",
    "The facility disagrees with this citation. Our medication administration logs, reviewed internally and audited by a third-party pharmacist, show full compliance with Title 22 requirements. The citing inspector observed a single instance of a delayed documentation entry; however, the administration itself was performed on schedule. Staff received refresher training within 72 hours of the survey date.",
    "We respectfully contest this deficiency. Our resident rights policy is prominently posted in all common areas and reviewed individually with each resident upon admission. The cited resident had a documented cognitive impairment affecting recall, which was noted in the Individualized Service Plan. The ISP called for additional verbal reinforcement of rights, which staff provided consistently.",
    "This citation relates to a binder that was temporarily relocated during a facilities inspection. All emergency protocols, contact lists, and evacuation maps were present and accounted for. The binder was returned to its designated location within two hours of the survey team's departure.",
  ];

  return Array.from({ length: count }, (_, i) => {
    const monthOffset = i % 12;
    const day = (i * 9 + 3) % 27 + 1;
    const publishedAt = new Date(2026, monthOffset, day).toISOString();
    const citationDate = new Date(2025, monthOffset, day > 14 ? day - 14 : day + 3).toISOString();

    return {
      id: `${facilityId}-reb-${String(i + 1).padStart(3, "0")}`,
      title: TITLES[i % TITLES.length],
      citationId: `${facilityId.slice(-4).toUpperCase()}-2025-${String(i + 1).padStart(3, "0")}`,
      citationDate,
      summary: SUMMARIES[i % SUMMARIES.length],
      moderationStatus: "approved" as const,
      publishedAt,
      filesUrl: i % 3 !== 0 ? `https://cdn.carehomessupportdocs.org/rebuttals/${facilityId}-${i + 1}.pdf` : undefined,
    };
  });
}
