"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Pricing", href: "/pricing" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <header className="w-full sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-md">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">

        {/* Logo */}
        <Link href="/" className="text-xl font-semibold text-gray-800">
          CareSupport
        </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex items-center gap-8 text-gray-600 font-medium">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="hover:text-blue-600 transition"
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/signin"
            className="px-4 py-2 text-gray-700 hover:text-blue-600 transition"
          >
            Sign In
          </Link>

          <Link
            href="/get-started"
            className="px-5 py-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Button */}
        <button
          className="md:hidden text-gray-700 text-2xl"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
      </nav>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-4 text-gray-600">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="hover:text-blue-600 transition"
            >
              {link.name}
            </Link>
          ))}

          <hr className="my-2" />

          <Link
            href="/signin"
            onClick={() => setOpen(false)}
            className="hover:text-blue-600"
          >
            Sign In
          </Link>

          <Link
            href="/get-started"
            onClick={() => setOpen(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-600/30 text-center"
          >
            Get Started
          </Link>
        </div>
      )}
    </header>
  );
}