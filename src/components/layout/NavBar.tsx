import { siteConfig } from "@/lib/site-config";
import { NavLink } from "./NavLink";

export function NavBar() {
  return (
    <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
      {siteConfig.mainNav.map((link) => (
        <NavLink key={link.label} href={link.href}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
