import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-6">

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center py-24">
        <h1 className="text-5xl font-bold">
          Find Trusted Care Homes
        </h1>

        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Helping families discover safe, affordable, and reliable care
          facilities.
        </p>

        <Button className="mt-6">
          Get Started
        </Button>
      </section>

      {/* Features */}
      <section className="py-20">
        <h2 className="text-3xl font-bold text-center">
          Why Choose Us?
        </h2>

        <div className="grid gap-6 md:grid-cols-3 mt-10">

          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold">
                Verified Facilities
              </h3>

              <p className="mt-2 text-muted-foreground">
                We help families connect with trusted care providers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold">
                Affordable Options
              </h3>

              <p className="mt-2 text-muted-foreground">
                Compare pricing and services easily.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold">
                Easy Search
              </h3>

              <p className="mt-2 text-muted-foreground">
                Find facilities based on location and care needs.
              </p>
            </CardContent>
          </Card>

        </div>
      </section>
    </main>
  );
}