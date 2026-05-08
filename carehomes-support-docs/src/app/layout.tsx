import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">

        <header className="text-center py-6">
          <h1 className="text-3xl font-bold">
            CareHomeSupport
          </h1>
        </header>

        <main className="flex-1">
          {children}
        </main>

        <footer className="text-center py-6">
          <p>© 2026 CareHomeSupport</p>
        </footer>

      </body>
    </html>
  );
}