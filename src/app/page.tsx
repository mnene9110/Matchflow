
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFirebase } from "@/firebase/provider"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

/**
 * @fileOverview Root entry point. 
 * Handles immediate redirect to Discover or Welcome based on auth state.
 * Since Layout handles initialization, this page is essentially a fast-pass.
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

  // Return a minimal splash that matches the layout's initialization state
  return (
    <div className="flex h-svh w-full flex-col items-center justify-center bg-[#3BC1A8]">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center border-2 border-white/20 shadow-2xl animate-float">
           <svg viewBox="0 0 24 24" className="w-12 h-12 text-white fill-current drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
             <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
           </svg>
        </div>
      </div>
    </div>
  )
}
