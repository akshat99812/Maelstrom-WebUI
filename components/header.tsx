"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";
import Image from "next/image";

const navigation = [
  { name: "Swap", href: "/swap" },
  { name: "Pools", href: "/pools" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Create Pool", href: "/create" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <>
      <header
        data-tour="header"
        className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
      >
        <div className="p-4 w-full flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Image
                src="/logo_maelstrom.svg"
                alt="Maelstrom Logo"
                className="dark:invert"
                width={"50"}
                height={"50"}
                objectFit="contain"
              />
            </div>
            <span className="text-xl font-bold gradient-text">Maelstrom</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                data-tour={`${item.name.toLowerCase()}-link`}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-accent relative group",
                  pathname === item.href
                    ? "text-accent"
                    : "text-muted-foreground"
                )}
              >
                {item.name}
                {pathname === item.href && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <ConnectButton accountStatus={"address"} showBalance={false} />
          </div>
        </div>
      </header>
    </>
  );
}
