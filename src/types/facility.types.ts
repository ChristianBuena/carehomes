/**
 * Shared facility type used across the facility directory.
 * Replaces the mock-data Facility type for all list/grid/card usage.
 */
export type FacilityListItem = {
  id: string;
  slug: string;
  facilityNumber: string;
  name: string;
  city: string;
  county: string;
  capacity: number;
  ccldLink: string;
  status: "active" | "inactive";
  rebuttalsCount: number;
  lastUpdated: string;
};
