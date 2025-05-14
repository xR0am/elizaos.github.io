"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthControls } from "@/components/AuthControls";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MenuIcon,
  LinkIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  UserCircle2,
  ChevronDownIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";

export function Navigation() {
  const pathname = usePathname();
  const { user, login, logout, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();

  const isLeaderboardActive = pathname === "/leaderboard";

  const navLinksForMenuJsx = (
    <>
      <DropdownMenuItem asChild className="py-3 text-base">
        <Link
          href="/"
          className={cn(
            "w-full justify-start rounded-md px-2 text-base text-muted-foreground",
          )}
        >
          Home
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="py-3 text-base">
        <Link
          href="/leaderboard"
          className={cn(
            "w-full justify-start rounded-md px-2 text-base text-muted-foreground",
          )}
        >
          Leaderboard
        </Link>
      </DropdownMenuItem>
    </>
  );

  const desktopNavLinksJsx = (
    <>
      <Button
        variant="ghost"
        size={"sm"}
        className={cn(
          "rounded-full px-4 text-sm font-medium",
          isLeaderboardActive
            ? "bg-muted hover:bg-muted/80"
            : "text-muted-foreground hover:bg-transparent",
        )}
        asChild
      >
        <Link href="/leaderboard">Leaderboard</Link>
      </Button>
    </>
  );

  const isSystemDarkTheme =
    theme === "system" &&
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const dropdownMenuContent = (
    <DropdownMenuContent align="end" className="w-64">
      {/* <DropdownMenuLabel className="md:hidden">Navigation</DropdownMenuLabel> */}
      <div className="sm:hidden">
        {navLinksForMenuJsx}
        <DropdownMenuSeparator className="sm:hidden" />
      </div>

      {user ? (
        <>
          <DropdownMenuLabel className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={user.avatar_url ?? undefined}
                alt={user.login ?? "User avatar"}
              />
              <AvatarFallback>{user.login?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {user.login}
          </DropdownMenuLabel>
          <DropdownMenuItem className="py-3 text-base">
            <LinkIcon className="mr-2 h-4 w-4" />
            <span>Link Wallets</span>
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem onClick={() => login()} className="py-3 text-base">
          <UserCircle2 className="mr-2 h-4 w-4" />
          <span>Sign in with GitHub</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() =>
          setTheme(theme === "dark" || isSystemDarkTheme ? "light" : "dark")
        }
        className="py-3 text-base"
      >
        {theme === "dark" || isSystemDarkTheme ? (
          <SunIcon className="mr-2 h-4 w-4" />
        ) : (
          <MoonIcon className="mr-2 h-4 w-4" />
        )}
        <span>
          {theme === "dark" || isSystemDarkTheme ? "Light Mode" : "Dark Mode"}
        </span>
      </DropdownMenuItem>
      {user ? (
        <>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="py-3 text-base text-red-500 hover:text-red-500"
            onClick={() => logout()}
          >
            <LogOutIcon className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </>
      ) : null}
    </DropdownMenuContent>
  );

  return (
    <div className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Button variant="none" size={"none"} asChild>
            <Link href="/" className="transition-opacity hover:opacity-80">
              <h1 className="text-xl font-bold">ElizaOS</h1>
            </Link>
          </Button>
          <div className="hidden items-center gap-2 sm:flex">
            {desktopNavLinksJsx}
          </div>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          {!user ? (
            <>
              <AuthControls />
              {!isLoading && <ThemeToggle />}
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 rounded-full border border-border p-1 pr-2 hover:bg-muted/80"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={user.avatar_url ?? undefined}
                        alt={user.login ?? "User avatar"}
                      />
                      <AvatarFallback>
                        {user.login?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                {dropdownMenuContent}
              </DropdownMenu>
              {/* <ThemeToggle /> */}
            </>
          )}
        </div>

        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size={user ? "default" : "icon"}
                className={cn(
                  "flex items-center gap-2 border border-border p-1 hover:bg-muted/80",
                  user && "rounded-full",
                )}
              >
                {user ? (
                  <>
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.avatar_url ?? undefined}
                        alt={user.login ?? "User avatar"}
                      />
                      <AvatarFallback>
                        {user.login?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDownIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                  </>
                ) : (
                  <ChevronDownIcon className="h-6 w-6" />
                )}
              </Button>
            </DropdownMenuTrigger>
            {dropdownMenuContent}
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
