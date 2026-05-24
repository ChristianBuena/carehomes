export default function DirectoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      
      {/* Navbar */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-6">
        <h1 className="text-xl font-bold text-blue-700">
          CareHome Support
        </h1>

        <div className="flex items-center gap-4">
          <button>Notifications</button>
          <button>Profile</button>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="flex">
        
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-64px)] bg-white border-r p-6">
          <nav className="space-y-4">
            <a href="/directory">Home</a>

            <div>
              <a href="/directory/facilities">
                Facilities
              </a>
            </div>

            <div>
              <a href="/directory/saved">
                Saved
              </a>
            </div>

            <div>
              <a href="/directory/bookings">
                Bookings
              </a>
            </div>

            <div>
              <a href="/directory/messages">
                Messages
              </a>
            </div>

            <div>
              <a href="/directory/settings">
                Settings
              </a>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}