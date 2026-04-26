
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFirebase } from "@/firebase/provider"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

/**
 * @fileOverview Root entry point. 
 * Handles immediate redirect to Discover or Welcome based on auth state.
 */
export default function Home() {
  const router = useRouter()
  const { auth, firestore } = useFirebase()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profileSnap = await getDoc(doc(firestore, "userProfiles", user.uid));
          const profile = profileSnap.data();

          if (profile && profile.gender && profile.location) {
            router.replace("/discover");
          } else {
            router.replace("/onboarding/fast");
          }
        } catch (e) {
          router.replace("/onboarding/fast");
        }
      } else {
        router.replace("/welcome");
      }
    });

    return () => unsubscribe();
  }, [router, auth, firestore])

  // Return a splash that matches exactly what the NavigationGuard might render
  // while checking auth, ensuring a seamless cold-boot experience.
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#3BC1A8]">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-float">
           <h1 className="text-4xl font-logo text-white drop-shadow-lg">MatchFlow</h1>
        </div>
      </div>
    </div>
  )
}
