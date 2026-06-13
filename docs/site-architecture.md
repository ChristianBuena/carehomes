# Information Architecture: CareHomesSupportDocs.org

## Route Map (Next.js App Router Conventions)

```
app/
├── (public)/
│   ├── layout.tsx (Root layout with Header & Footer)
│   ├── page.tsx (/)
│   ├── how-it-works/
│   │   └── page.tsx (/how-it-works)
│   ├── pricing/
│   │   └── page.tsx (/pricing)
│   ├── facilities/
│   │   ├── page.tsx (/facilities)
│   │   └── [slug]/
│   │       └── page.tsx (/facilities/[slug])
│   ├── providers/
│   │   └── page.tsx (/providers)
│   ├── disclaimer/
│   │   └── page.tsx (/disclaimer)
│   ├── privacy/
│   │   └── page.tsx (/privacy)
│   ├── terms/
│   │   └── page.tsx (/terms)
│   ├── takedown-policy/
│   │   └── page.tsx (/takedown-policy)
│   └── redaction-policy/
│       └── page.tsx (/redaction-policy)
├── not-found.tsx (/404)
```

## Page Hierarchy Tree (Public Routes)

- **/** (Home)
- **/how-it-works** (How It Works)
- **/pricing** (Pricing)
- **/facilities** (Facility Directory)
  - **/facilities/[slug]** (Facility Detail)
- **/providers** (Provider Directory)
- **/disclaimer** (Disclaimer)
- **/privacy** (Privacy Notice)
- **/terms** (Terms of Use)
- **/takedown-policy** (Takedown Policy)
- **/redaction-policy** (Redaction Policy)
- **404 Not Found** (Handled via Next.js `not-found.tsx`)

## Component Breakdown Per Page

| Page | Path | Key Components Used |
|---|---|---|
| **Home** | `/` | `HeroSection`, `FeatureHighlights`, `TestimonialCarousel`, `CallToAction` |
| **How It Works** | `/how-it-works` | `StepByStepGuide`, `FAQAccordion`, `CallToAction` |
| **Pricing** | `/pricing` | `PricingTable`, `PricingCard`, `FAQAccordion` |
| **Facility Directory** | `/facilities` | `DirectorySearch`, `FilterSidebar`, `FacilityCard`, `Pagination` |
| **Facility Detail** | `/facilities/[slug]` | `FacilityHeader`, `CitationHistory`, `RebuttalList`, `ProviderInfoCard`, `Breadcrumbs` |
| **Provider Directory** | `/providers` | `DirectorySearch`, `ProviderCard`, `Pagination` |
| **Legal Pages** | `/privacy`, `/terms`, etc. | `RichTextContent`, `LastUpdatedBanner` |
| **Not Found** | `404` | `NotFoundGraphic`, `HomeButton` |

*Note: All pages inside the `(public)` route group will share `GlobalHeader` and `GlobalFooter` components defined in `app/(public)/layout.tsx`.*

## Data Requirements Per Page

| Route | Data Strategy | Description |
|---|---|---|
| `/` | Static (SSG) | Marketing content, heavily cached. |
| `/how-it-works` | Static (SSG) | Core instructions, heavily cached. |
| `/pricing` | Static (SSG) | Pricing tiers, cached unless plans change. |
| `/facilities` | Dynamic / Server Components | Search results, filters, lists of facilities from DB. Utilizes Next.js caching with background revalidation where possible. |
| `/facilities/[slug]`| Dynamic / Server Components | Real-time or highly fresh citation & rebuttal data for the specific facility. Pre-generate popular slugs if needed. |
| `/providers` | Dynamic / Server Components | Provider directory data, filters, and search queries. |
| Legal Pages | Static (SSG) | Markdown or static DB entries, highly cacheable. |

## Navigation Structure

### Primary Navigation (GlobalHeader)
- Home
- How It Works
- Facilities
- Providers
- Pricing
- Login / Sign Up (CTA Buttons)

### Footer Navigation (GlobalFooter)
- **Directory**: Facility Directory, Provider Directory
- **Resources**: How It Works, Pricing
- **Legal**: Privacy Notice, Terms of Use, Disclaimer, Takedown Policy, Redaction Policy
- **Connect**: Twitter, LinkedIn, Contact Email

### Breadcrumbs
Used primarily in nested hierarchical sections:
- `Home` > `Facilities` > `[Facility Name]`
