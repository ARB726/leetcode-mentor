import type { Metadata } from "next";
import "./globals.css";
import "./forest.css";

export const metadata: Metadata = {
  title: "LeetCode Mentor — Build your interview instinct",
  description: "A deliberate practice studio for code review, algorithm patterns, and AI interview rehearsal.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
