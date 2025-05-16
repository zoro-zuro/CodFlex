"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { DumbbellIcon, HomeIcon, UserIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

const Navbar = () => {
  const { isSignedIn } = useUser();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b border-border py-3 px-4">
      <div className="container mx-auto flex items-center justify-between">
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-1">
          <div className="p-1 bg-primary/10 rounded">
            <ZapIcon className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-bold font-mono">
            code<span className="text-primary">flex</span>
          </span>
        </Link>

        {/* NAVIGATION */}
        <nav className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <Link
                href="/"
                className="flex items-center text-sm hover:text-primary transition-colors"
              >
                <HomeIcon size={16} />
                <span className="hidden md:inline ml-1.5">Home</span>
              </Link>

              <Link
                href="/generate-program"
                className="flex items-center text-sm hover:text-primary transition-colors"
              >
                <DumbbellIcon size={16} />
                <span className="hidden md:inline ml-1.5">Generate</span>
              </Link>

              <Link
                href="/profile"
                className="flex items-center text-sm hover:text-primary transition-colors"
              >
                <UserIcon size={16} />
                <span className="hidden md:inline ml-1.5">Profile</span>
              </Link>
              <Button
                asChild
                size="sm"
                className="bg-cyan-400 hidden md:flex hover:bg-cyan-500 text-black font-medium rounded-md"
              >
                <Link href="/generate-program">Get Started</Link>
              </Button>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/50 text-primary hover:text-white hover:bg-primary/10"
                >
                  Sign In
                </Button>
              </SignInButton>

              <SignUpButton>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Sign Up
                </Button>
              </SignUpButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
