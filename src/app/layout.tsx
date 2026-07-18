import type { Metadata } from "next"
import "./globals.css"
import Sidebar from "@/components/Sidebar"

export const metadata: Metadata = {
  title: "Wayk Collector",
  description: "Instagram influencer collector",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-56 p-6">
          {children}
        </main>
      </body>
    </html>
  )
}
