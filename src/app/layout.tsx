import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/app-shell";
import UserMenu from "@/components/auth/user-menu";
import { redirect } from "next/navigation";
import { getCurrentUser, hasOrphanedSession } from "@/lib/auth/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Billing",
    template: "%s · Billing",
  },
  description: "Invoices, purchases, payments and stock in one place.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Only decides whether to show the nav. Access itself is enforced by
  // proxy.ts and by requireUser() in each server action, not here.
  const user = await getCurrentUser();
  // A removed login's cookie: clear it rather than render pages without a user.
  if (!user && (await hasOrphanedSession())) redirect("/logout");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* The shell lives in the layout so it stays mounted; pages render inside it. */}
        {user ? (
          <AppShell
            userName={user.fullname || user.username}
            role={user.role}
            userMenu={<UserMenu />}
          >
            {children}
          </AppShell>
        ) : (
          <main className="min-h-full">{children}</main>
        )}
      </body>
    </html>
  );
}
