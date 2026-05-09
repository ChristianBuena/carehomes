import "./globals.css"
import Navbar from "@/components/ui/navbar"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">

        {/* Navbar (global) */}
        <Navbar />

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="text-center py-6 border-t">
          <p>© 2026 CareHomeSupport</p>
        </footer>

      </body>
    </html>
  )
}