"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const mainLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/about", label: "About Us" },
    { href: "/pricing", label: "Pricing" },
    { href: "/contact", label: "Contact" },
  ]

  return (
    <header className="w-full border-b bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 relative">

        {/* Logo */}
        <Link href="/" className="font-bold text-lg">
          CareHomeSupport
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex gap-8 text-sm absolute left-1/2 -translate-x-1/2">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-gray-600 transition"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side Auth */}
        <div className="hidden md:flex items-center gap-4 ml-auto">
          <Link
            href="/login"
            className="text-sm hover:text-gray-600 transition"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:opacity-90 transition"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="ml-auto md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t px-4 py-4 flex flex-col space-y-4">

          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <div className="flex flex-col gap-3 pt-3 border-t">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>

            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-md bg-black px-4 py-2 text-center text-white"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}