"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PartyListPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/discover') }, [router])
  return null
}
