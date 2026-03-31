import { redirect } from "next/navigation"

export default function Home() {
  // Redirect to welcome screen as the primary entry point
  redirect("/welcome")
}
