
"use client"

import { useState } from "react"
import { Navbar } from "@/components/Navbar"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Image from "next/image"
import { Heart, X, MessageCircle, MapPin, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"

const MOCK_USERS = [
  {
    id: "1",
    name: "Elena",
    age: 24,
    bio: "Coffee lover and adventure seeker. Let's find the best sunset spots in the city! 🌅",
    interests: ["Hiking", "Photography", "Coffee"],
    image: PlaceHolderImages.find(i => i.id === 'user-1')?.imageUrl || "https://picsum.photos/seed/1/600/800",
    distance: "2 miles away"
  },
  {
    id: "2",
    name: "Marcus",
    age: 28,
    bio: "Music producer & tech enthusiast. Looking for someone to share playlists and laughs with.",
    interests: ["Music", "Tech", "Concerts"],
    image: PlaceHolderImages.find(i => i.id === 'user-4')?.imageUrl || "https://picsum.photos/seed/4/600/800",
    distance: "5 miles away"
  },
  {
    id: "3",
    name: "Sophia",
    age: 26,
    bio: "Lover of ancient history and modern art. I can spend hours in a museum. 🎨",
    interests: ["Art", "History", "Traveling"],
    image: PlaceHolderImages.find(i => i.id === 'user-5')?.imageUrl || "https://picsum.photos/seed/5/600/800",
    distance: "1 mile away"
  }
]

export default function DiscoverPage() {
  const firestore = useFirestore()
  const profilesQuery = useMemoFirebase(() => collection(firestore, 'userProfiles'), [firestore])
  const { data: firestoreUsers, isLoading } = useCollection(profilesQuery)
  
  const [currentIndex, setCurrentIndex] = useState(0)

  // Use Firestore data if available, otherwise fallback to mock
  const users = (firestoreUsers && firestoreUsers.length > 0) ? firestoreUsers.map(u => ({
    id: u.id,
    name: u.username || "Unknown",
    age: u.dateOfBirth ? (new Date().getFullYear() - new Date(u.dateOfBirth).getFullYear()) : 25,
    bio: u.bio || "",
    interests: u.interests || [],
    image: (u.profilePhotoUrls && u.profilePhotoUrls[0]) || "https://picsum.photos/seed/1/600/800",
    distance: u.location || "Nearby"
  })) : MOCK_USERS

  const handleNext = () => {
    if (currentIndex < users.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setCurrentIndex(0) 
    }
  }

  const currentUser = users[currentIndex]

  if (isLoading && !users.length) {
    return <div className="flex items-center justify-center h-svh bg-white">Loading profiles...</div>
  }

  return (
    <div className="flex flex-col min-h-svh pb-20 bg-white">
      <header className="p-6 flex justify-between items-center bg-white">
        <h1 className="text-2xl font-headline font-bold text-primary">MatchFlow</h1>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
          <Heart className="w-3 h-3 mr-1 fill-current" />
          Pro
        </Badge>
      </header>

      <main className="flex-1 px-4 relative flex flex-col justify-center bg-white">
        {currentUser && (
          <>
            <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 transform">
              <Image
                src={currentUser.image}
                alt={currentUser.name}
                fill
                className="object-cover"
                priority
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white flex flex-col gap-2">
                <div className="flex items-end gap-2">
                  <h2 className="text-3xl font-headline font-bold">{currentUser.name}, {currentUser.age}</h2>
                </div>
                
                <div className="flex items-center gap-1 text-white/80 text-sm">
                  <MapPin className="w-3 h-3" />
                  <span>{currentUser.distance}</span>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {currentUser.interests.map(interest => (
                    <Badge key={interest} variant="secondary" className="bg-white/20 text-white border-none backdrop-blur-md">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-6 mt-8">
              <Button 
                size="icon" 
                variant="outline" 
                className="w-14 h-14 rounded-full border-2 border-muted-foreground/20 text-muted-foreground hover:text-red-500 hover:border-red-500 transition-colors bg-white"
                onClick={handleNext}
              >
                <X className="w-8 h-8" />
              </Button>

              <Link href={`/chat/${currentUser.id}`}>
                <Button 
                  size="icon" 
                  className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  <Heart className="w-10 h-10 fill-white" />
                </Button>
              </Link>

              <Button 
                size="icon" 
                variant="outline" 
                className="w-14 h-14 rounded-full border-2 border-muted-foreground/20 text-muted-foreground hover:text-blue-500 hover:border-blue-500 bg-white"
              >
                <Info className="w-8 h-8" />
              </Button>
            </div>
          </>
        )}
      </main>

      <Navbar />
    </div>
  )
}
