/**
 * prisma/seed.ts
 *
 * Idempotent seed using upsert — safe to run multiple times.
 * Uses a plain PrismaClient (no adapter) since this runs outside Next.js.
 *
 * Run with: npx prisma db seed
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number): Date {
  return daysFromNow(-days);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...");

  // ── 1. Users ──────────────────────────────────────────────────────────────

  const adminPassword = await bcrypt.hash("Admin@123456", 12);
  const memberPassword = await bcrypt.hash("Member@123456", 12);
  const freePassword = await bcrypt.hash("Free@123456", 12);

  // 1a. Organizations
  const adminOrg = await prisma.organization.create({
    data: {
      name: "System Admin Org",
      membership: {
        create: {
          plan: "TIER_C",
          status: "ACTIVE",
          maxFacilities: 10,
          stripeCustomerId: "cus_mock_admin001",
          stripeSubscriptionId: "sub_mock_admin001",
          startDate: daysAgo(180),
          endDate: daysFromNow(180),
          nextBillingDate: daysFromNow(180),
        },
      },
    },
  });

  const memberOrg = await prisma.organization.create({
    data: {
      name: "James Reyes Org",
      membership: {
        create: {
          plan: "TIER_B",
          status: "ACTIVE",
          maxFacilities: 3,
          stripeCustomerId: "cus_mock_member001",
          stripeSubscriptionId: "sub_mock_member001",
          startDate: daysAgo(90),
          endDate: daysFromNow(270),
          nextBillingDate: daysFromNow(30),
        },
      },
    },
  });

  const freeOrg = await prisma.organization.create({
    data: {
      name: "Linda Tran Org",
      membership: {
        create: {
          plan: "NONE",
          status: "INACTIVE",
          maxFacilities: 0,
        },
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "carehomessupport444@gmail.com" },
    update: { organizationId: adminOrg.id },
    create: {
      name: "System Admin",
      email: "carehomessupport444@gmail.com",
      password: adminPassword,
      role: "ADMIN",
      organizationId: adminOrg.id,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@carehomesdocs.org" },
    update: { organizationId: memberOrg.id },
    create: {
      name: "James Reyes",
      email: "member@carehomesdocs.org",
      password: memberPassword,
      role: "MEMBER",
      organizationId: memberOrg.id,
    },
  });

  const freeUser = await prisma.user.upsert({
    where: { email: "free@carehomesdocs.org" },
    update: { organizationId: freeOrg.id },
    create: {
      name: "Linda Tran",
      email: "free@carehomesdocs.org",
      password: freePassword,
      role: "MEMBER",
      organizationId: freeOrg.id,
    },
  });

  console.log(`✅ Users: ${admin.email}, ${member.email}, ${freeUser.email}`);

  // ── 2. Facilities ─────────────────────────────────────────────────────────

  const facilitiesData = [
    {
      slug: "sunny-days-care-home",
      name: "Sunny Days Care Home",
      address: "4827 Mission Blvd, San Diego, CA 92109",
      city: "San Diego",
      county: "San Diego",
      facilityNumber: "374603921",
      capacity: 6,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/374603921",
      description:
        "Sunny Days Care Home is a small residential care facility providing personalized, family-style care for up to six seniors in a peaceful San Diego neighborhood. Our staff is trained in dementia care and medication management. We maintain a 24-hour awake night staff and a robust activity program centered on resident preferences.",
    },
    {
      slug: "oak-tree-senior-living",
      name: "Oak Tree Senior Living",
      address: "1245 Oak Knoll Dr, Pasadena, CA 91103",
      city: "Pasadena",
      county: "Los Angeles",
      facilityNumber: "193608274",
      capacity: 45,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/193608274",
      description:
        "Oak Tree Senior Living offers assisted living services across three licensed residential units in a tree-lined Pasadena neighborhood. Our interdisciplinary care team coordinates with residents' physicians to ensure continuity of care. Amenities include a dedicated dining room, rehabilitation gym, and secured memory care wing.",
    },
    {
      slug: "bayside-residential-care",
      name: "Bayside Residential Care",
      address: "892 Lakeshore Ave, Oakland, CA 94606",
      city: "Oakland",
      county: "Alameda",
      facilityNumber: "015600293",
      capacity: 15,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/015600293",
      description:
        "Bayside Residential Care is a mid-sized RCFE offering specialized memory care in the heart of Oakland. The facility features secured outdoor courtyards, structured daily programming, and a bilingual care team fluent in Spanish and Cantonese. Family engagement is a core pillar of our care model.",
    },
    {
      slug: "whispering-pines-retreat",
      name: "Whispering Pines Retreat",
      address: "3104 Foothill Blvd, Auburn, CA 95603",
      city: "Auburn",
      county: "Placer",
      facilityNumber: "317002845",
      capacity: 6,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/317002845",
      description:
        "Nestled in the Sierra Nevada foothills, Whispering Pines Retreat provides an intimate residential care environment for adults requiring daily living assistance. Our six-bed home offers a tranquil, nature-rich setting with individualized care plans updated quarterly. We specialize in end-of-life comfort care and hospice coordination.",
    },
    {
      slug: "golden-years-assisted-living",
      name: "Golden Years Assisted Living",
      address: "16 Technology Dr, Irvine, CA 92618",
      city: "Irvine",
      county: "Orange",
      facilityNumber: "306001837",
      capacity: 120,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/306001837",
      description:
        "Golden Years Assisted Living is one of Orange County's premier large-scale RCFEs, licensed for 120 residents across four wings. Our facility provides tiered care levels from independent living to skilled nursing coordination. On-site amenities include a beauty salon, outdoor pool, chapel, and multiple dining venues.",
    },
    {
      slug: "valley-view-care-center",
      name: "Valley View Care Center",
      address: "558 Cesar Chavez Blvd, Fresno, CA 93706",
      city: "Fresno",
      county: "Fresno",
      facilityNumber: "101004729",
      capacity: 30,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/101004729",
      description:
        "Valley View Care Center serves the Central Valley community with comprehensive assisted living services for adults 60 and older. Our bilingual Spanish-speaking staff provides culturally sensitive care in a warm, homelike environment. The facility offers structured daily activities, transportation coordination, and close partnerships with Fresno-area healthcare providers.",
    },
    {
      slug: "coastal-breeze-senior-home",
      name: "Coastal Breeze Senior Home",
      address: "2210 Pacific Coast Hwy, Santa Barbara, CA 93101",
      city: "Santa Barbara",
      county: "Santa Barbara",
      facilityNumber: "421700366",
      capacity: 6,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/421700366",
      description:
        "Coastal Breeze Senior Home is a boutique six-bed RCFE located minutes from the Santa Barbara waterfront. We provide individualized care plans, gourmet meal preparation, and daily cognitive engagement activities for residents with early to mid-stage dementia. Our facility maintains an exceptional staff-to-resident ratio to ensure attentive, dignified care.",
    },
    {
      slug: "redwood-care-community",
      name: "Redwood Care Community",
      address: "780 Redwood Rd, Santa Rosa, CA 95404",
      city: "Santa Rosa",
      county: "Sonoma",
      facilityNumber: "498200183",
      capacity: 55,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/498200183",
      description:
        "Redwood Care Community is a mid-sized assisted living facility serving the North Bay region of California. The community features private and semi-private suites, a fully licensed kitchen, and a dedicated recreation room. Our care team includes certified medication aides and a full-time social worker to support residents and their families through every stage of aging.",
    },
    {
      slug: "desert-rose-elder-care",
      name: "Desert Rose Elder Care",
      address: "3391 Palm Canyon Dr, Palm Springs, CA 92264",
      city: "Palm Springs",
      county: "Riverside",
      facilityNumber: "336005012",
      capacity: 6,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/336005012",
      description:
        "Desert Rose Elder Care provides intimate residential care in a serene Palm Springs setting. Our small six-bed home specializes in post-hospitalization recovery support and long-term chronic disease management for older adults. The warm desert climate and tranquil courtyard garden support resident wellbeing, and our team includes a licensed vocational nurse available on-call.",
    },
    {
      slug: "harbor-lights-senior-living",
      name: "Harbor Lights Senior Living",
      address: "1045 Harbor Dr, Long Beach, CA 90802",
      city: "Long Beach",
      county: "Los Angeles",
      facilityNumber: "194300558",
      capacity: 80,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/194300558",
      description:
        "Harbor Lights Senior Living is a large assisted living community located near the Long Beach waterfront. Licensed for 80 residents, the facility offers three distinct levels of care — independent, assisted, and memory care — within a single campus. Amenities include a rooftop terrace, on-site physical therapy, weekly group outings, and a 24-hour concierge service.",
    },
    {
      slug: "sunrise-care-home",
      name: "Sunrise Care Home",
      address: "2301 Broadway St, Sacramento, CA 95818",
      city: "Sacramento",
      county: "Sacramento",
      facilityNumber: "217004631",
      capacity: 6,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/217004631",
      description:
        "Sunrise Care Home is a six-bed residential facility in the heart of Sacramento offering round-the-clock personal care for seniors with complex needs. Staff are trained in Alzheimer's care, fall prevention, and hospice support coordination. The home maintains close relationships with local medical providers for streamlined care transitions.",
    },
    {
      slug: "mission-hills-senior-care",
      name: "Mission Hills Senior Care",
      address: "774 Mission Hills Rd, Oceanside, CA 92057",
      city: "Oceanside",
      county: "San Diego",
      facilityNumber: "374801002",
      capacity: 25,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/374801002",
      description:
        "Mission Hills Senior Care is a mid-sized RCFE in Oceanside providing assisted living and respite care services. The facility features an activity room, enclosed garden, and weekly wellness programming. Our staff-to-resident ratio exceeds the state minimum to ensure individualized attention for every resident.",
    },
    {
      slug: "sierra-pines-care-home",
      name: "Sierra Pines Care Home",
      address: "510 Pine Cone Ln, Redding, CA 96001",
      city: "Redding",
      county: "Shasta",
      facilityNumber: "450200918",
      capacity: 6,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/450200918",
      description:
        "Sierra Pines Care Home is a small family-operated RCFE in Redding offering personalized memory care and daily living assistance. Our home-like setting promotes dignity, independence, and social connection. We provide home-cooked meals, sensory activities, and regular family communication updates.",
    },
    {
      slug: "pacific-grove-elder-care",
      name: "Pacific Grove Elder Care",
      address: "330 Lighthouse Ave, Pacific Grove, CA 93950",
      city: "Pacific Grove",
      county: "Monterey",
      facilityNumber: "272005744",
      capacity: 12,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/272005744",
      description:
        "Pacific Grove Elder Care is a twelve-bed RCFE steps from the Monterey Bay shoreline. We specialize in care for adults with Parkinson's disease and mobility challenges. The facility is fully ADA accessible with wide corridors, grab bars, and a therapy room for daily range-of-motion exercises.",
    },
    {
      slug: "inland-valley-senior-home",
      name: "Inland Valley Senior Home",
      address: "1789 Magnolia Ave, Riverside, CA 92503",
      city: "Riverside",
      county: "Riverside",
      facilityNumber: "336100274",
      capacity: 40,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/336100274",
      description:
        "Inland Valley Senior Home is a licensed 40-bed RCFE in Riverside serving residents with varying levels of care needs. The facility offers structured day programs, medication management, and coordination with visiting physicians. Its central Riverside location makes it convenient for family visits and specialist appointments.",
    },
    {
      slug: "bay-area-care-residence",
      name: "Bay Area Care Residence",
      address: "403 Hillside Blvd, Daly City, CA 94014",
      city: "Daly City",
      county: "San Mateo",
      facilityNumber: "081300629",
      capacity: 6,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/081300629",
      description:
        "Bay Area Care Residence is a six-bed RCFE in Daly City providing high-quality residential care for Filipino-American and other Pacific Islander seniors. Our Filipino-speaking staff deliver culturally competent care and traditional meal options. We maintain strong community ties with local churches and senior centers.",
    },
    {
      slug: "central-coast-care-villa",
      name: "Central Coast Care Villa",
      address: "225 El Camino Real, San Luis Obispo, CA 93401",
      city: "San Luis Obispo",
      county: "San Luis Obispo",
      facilityNumber: "407100385",
      capacity: 18,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/407100385",
      description:
        "Central Coast Care Villa is a well-established RCFE in San Luis Obispo offering assisted living in a relaxed coastal atmosphere. Our 18-bed facility provides three levels of care, weekly outings, and a robust volunteer visitor program. Staff undergo annual dementia care certification to maintain high standards of service.",
    },
    {
      slug: "antelope-valley-senior-living",
      name: "Antelope Valley Senior Living",
      address: "44210 Sierra Hwy, Lancaster, CA 93534",
      city: "Lancaster",
      county: "Los Angeles",
      facilityNumber: "194500137",
      capacity: 50,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/194500137",
      description:
        "Antelope Valley Senior Living is a 50-bed assisted living facility serving the high desert communities of Lancaster and Palmdale. The facility offers spacious private and shared suites, a secure outdoor courtyard, and daily social activities. Our team includes a full-time activities director and licensed nurses available on-call around the clock.",
    },
    {
      slug: "napa-valley-care-home",
      name: "Napa Valley Care Home",
      address: "887 Silverado Trail, Napa, CA 94558",
      city: "Napa",
      county: "Napa",
      facilityNumber: "289100492",
      capacity: 6,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/289100492",
      description:
        "Napa Valley Care Home is a serene six-bed RCFE nestled among the vineyards of the Napa Valley. We specialize in care for seniors requiring assistance with activities of daily living in a peaceful, rural setting. Residents enjoy garden therapy, farm-to-table meals, and a strong social program connecting them with the wider Napa community.",
    },
    {
      slug: "stockton-senior-care-center",
      name: "Stockton Senior Care Center",
      address: "1122 Pacific Ave, Stockton, CA 95204",
      city: "Stockton",
      county: "San Joaquin",
      facilityNumber: "390200873",
      capacity: 35,
      ccldLink:
        "https://www.ccld.dss.ca.gov/carefacilitysearch/FacDetail/390200873",
      description:
        "Stockton Senior Care Center is a 35-bed RCFE in the heart of the San Joaquin Valley offering comprehensive assisted living services. Our multilingual team speaks Spanish, Tagalog, and Punjabi to serve Stockton's diverse senior population. The facility features a large common room, outdoor walking path, and regular health screenings coordinated with local clinics.",
    },
  ];

  const facilities: { slug: string; id: string }[] = [];

  for (const facilityData of facilitiesData) {
    const facility = await prisma.facility.upsert({
      where: { slug: facilityData.slug },
      update: {
        name: facilityData.name,
        address: facilityData.address,
        city: facilityData.city,
        county: facilityData.county,
        facilityNumber: facilityData.facilityNumber,
        capacity: facilityData.capacity,
        ccldLink: facilityData.ccldLink,
        description: facilityData.description,
      },
      create: {
        ...facilityData,
        // createdById: admin.id,
      },
    });
    facilities.push({ slug: facility.slug, id: facility.id });
  }

  console.log(`✅ Facilities: ${facilities.map((f) => f.slug).join(", ")}`);

  const [
    facility1,
    facility2,
    facility3,
    facility4,
    facility5,
    facility6,
    facility7,
    facility8,
    facility9,
    facility10,
  ] = facilities;

  // ── 3. Rebuttals ──────────────────────────────────────────────────────────

  // Helper: upsert a rebuttal by a stable composed key stored in title+userId
  // We use title as a "natural" uniqueness key scoped to the user for idempotency.
  // Since there's no unique constraint, we delete + recreate only if missing.
  // More robustly: we use upsert on a known ID seeded via a deterministic value.

  const rebuttalSeeds = [
    {
      id: "seed-rebuttal-001",
      title: "Response to Staffing Ratio Citation — June 2025",
      content:
        "Our facility respectfully submits this rebuttal to address the cited deficiency. Our records demonstrate that staffing schedules met the required minimum ratios at all times during the survey period. The citation references a brief overlap period during a shift transition, which is accounted for in our supervisor coverage policy. A corrective action memo was issued to all staff immediately following the survey, and our staffing coordinator now performs twice-daily headcount audits to ensure ongoing compliance with Title 22 §87411.",
      status: "APPROVED" as const,
      userId: member.id,
      moderatedById: admin.id,
      facilityId: facility1.id,
    },
    {
      id: "seed-rebuttal-002",
      title:
        "Rebuttal Regarding Medication Administration Finding — September 2025",
      content:
        "The facility disagrees with this citation. Our medication administration logs, reviewed internally and audited by a third-party pharmacist, show full compliance with Title 22 §87465 requirements. The citing inspector observed a single instance of a delayed documentation entry; however, the administration itself was performed on schedule. Staff received refresher training within 72 hours of the survey date, and a new electronic medication log system was implemented to prevent future documentation delays.",
      status: "APPROVED" as const,
      userId: member.id,
      moderatedById: admin.id,
      facilityId: facility2.id,
    },
    {
      id: "seed-rebuttal-003",
      title: "Response to Resident Rights Citation — November 2025",
      content:
        "We respectfully contest this deficiency. Our resident rights policy is prominently posted in all common areas and reviewed individually with each resident upon admission in accordance with §87572. The cited resident had a documented cognitive impairment affecting recall, which was noted in the Individualized Service Plan. The ISP called for additional verbal reinforcement of rights, which staff provided consistently as evidenced in daily care logs. We are submitting signed documentation from the resident's responsible party confirming awareness of all rights.",
      status: "PENDING" as const,
      userId: member.id,
      moderatedById: null,
      facilityId: facility3.id,
    },
    {
      id: "seed-rebuttal-004",
      title: "Rebuttal to Emergency Preparedness Deficiency — October 2025",
      content:
        "This citation relates to an emergency binder that was temporarily relocated during a concurrent fire safety inspection. All emergency protocols, contact lists, and evacuation maps were present and fully accounted for — they had been moved to the administrator's desk for review by the fire marshal earlier that morning. The binder was returned to its designated station within two hours of the CCLD survey team's departure. We are providing a signed statement from the fire marshal corroborating the timeline.",
      status: "REJECTED" as const,
      userId: member.id,
      moderatedById: admin.id,
      facilityId: facility1.id,
    },
  ];

  for (const seed of rebuttalSeeds) {
    await prisma.rebuttal.upsert({
      where: { id: seed.id },
      update: {
        title: seed.title,
        content: seed.content,
        status: seed.status,
        moderatedById: seed.moderatedById,
        facilityId: seed.facilityId,
      },
      create: {
        id: seed.id,
        title: seed.title,
        content: seed.content,
        status: seed.status,
        userId: seed.userId,
        moderatedById: seed.moderatedById,
        facilityId: seed.facilityId,
      },
    });
  }

  console.log(`✅ Rebuttals: 2 APPROVED, 1 PENDING, 1 REJECTED`);
  console.log("-----------------------------------------");
  console.log("Admin Account:");
  console.log("Email: carehomessupport444@gmail.com");
  console.log("Password: Admin@123456");
  console.log("-----------------------------------------");
  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
