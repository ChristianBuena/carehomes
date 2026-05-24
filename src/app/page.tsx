import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function HomePage() {
  return (
    <main>

      {/* Hero Section */}
      <section
        className="
          relative
          flex
          flex-col
          items-center
          justify-center
          text-center
          py-40
          px-6
          bg-[url('/carehome.jpg')]
          bg-cover
          bg-center
          bg-fixed
        "
      >

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Hero Content */}
        <div className="relative z-10 text-white max-w-3xl">

          <h1 className="text-5xl font-bold">
            Find Trusted Care Homes
          </h1>

          <p className="mt-4 text-lg text-gray-200">
            Helping families discover safe, affordable, and reliable care
            facilities with confidence and ease.
          </p>

          <Button className="mt-6">
            Get Started
          </Button>

        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">

        <h2 className="text-3xl font-bold text-center">
          Why Choose Us?
        </h2>

        <div className="grid gap-6 md:grid-cols-3 mt-10">

          {/* Card 1 */}
          <Card>
            <CardContent className="p-6 text-center">

              <h3 className="text-xl font-semibold">
                Verified Facilities
              </h3>

              <p className="mt-2 text-muted-foreground">
                We help families connect with trusted and verified care providers.
              </p>

            </CardContent>
          </Card>

          {/* Card 2 */}
          <Card>
            <CardContent className="p-6 text-center">

              <h3 className="text-xl font-semibold">
                Affordable Options
              </h3>

              <p className="mt-2 text-muted-foreground">
                Compare pricing, services, and care options easily.
              </p>

            </CardContent>
          </Card>

          {/* Card 3 */}
          <Card>
            <CardContent className="p-6 text-center">

              <h3 className="text-xl font-semibold">
                Easy Search
              </h3>

              <p className="mt-2 text-muted-foreground">
                Find facilities based on location and specific care needs.
              </p>

            </CardContent>
          </Card>

        </div>
      </section>

    </main>
  )
}