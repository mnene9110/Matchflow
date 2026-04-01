
"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Globe, 
  GraduationCap, 
  CigaretteOff, 
  GlassWater, 
  Sparkles, 
  Loader2, 
  Video,
  ShieldAlert,
  UserX,
  Copy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useDoc, useFirestore, useFirebase, useMemoFirebase, useUser, setDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { ref, onValue } from "firebase/database"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

export default function ProfileDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const firestore = useFirestore()
  const { database } = useFirebase()
  const { user: currentUser } = useUser()
  const { toast } = useToast()
  
  const docRef = useMemoFirebase(() => doc(firestore, "userProfiles", id as string), [firestore, id])
  const { data: userProfile, isLoading } = useDoc(docRef)

  const [presence, setPresence] = useState<{ online: boolean; lastSeen?: number }>({ online: false })

  useEffect(() => {
    if (!database || !id) return
    const presenceRef = ref(database, `users/${id}/presence`)
    return onValue(presenceRef, (snap) => {
      const val = snap.val()
      setPresence(val || { online: false })
    })
  }, [database, id])

  const presenceText = useMemo(() => {
    if (presence.online) return "Online";
    if (!presence.lastSeen) return "Offline";
    const date = new Date(presence.lastSeen);
    const now = new Date();
    const diffInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffInDays > 2) return "Offline";
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [presence]);

  const handleBlock = async () => {
    if (!currentUser || !id) return
    
    try {
      const blockRef = doc(firestore, "userProfiles", currentUser.uid, "blockedUsers", id as string)
      await setDocumentNonBlocking(blockRef, {
        blockedUserId: id,
        username: userProfile?.username || "Unknown",
        blockedAt: new Date().toISOString()
      }, { merge: true })
      
      toast({
        title: "User Blocked",
        description: `${userProfile?.username} has been blocked.`,
      })
      router.push('/discover')
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not block user." })
    }
  }

  const handleReport = () => {
    toast({
      title: "Report Submitted",
      description: "Thank you for helping keep MatchFlow safe. Our team will review this profile.",
    })
  }

  const copyId = () => {
    if (userProfile?.numericId) {
      navigator.clipboard.writeText(userProfile.numericId.toString());
      toast({ title: "ID Copied", description: "Numeric ID copied to clipboard." });
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-svh bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  if (!userProfile) return <div className="flex flex-col items-center justify-center h-svh p-6 text-center"><h2 className="text-2xl font-bold mb-4">User Not Found</h2><Button onClick={() => router.back()}>Go Back</Button></div>

  const infoTags = [
    { label: "Sometimes", icon: Globe },
    { label: "Undergraduate", icon: GraduationCap },
    { label: "Never", icon: CigaretteOff },
    { label: "Socially", icon: GlassWater },
    { label: "Change the world", icon: Sparkles },
  ]

  const userImage = (userProfile.profilePhotoUrls && userProfile.profilePhotoUrls[0]) || `https://picsum.photos/seed/${userProfile.id}/600/800`

  // Admins cannot be blocked or reported
  const isAdmin = userProfile.isAdmin === true;

  return (
    <div className="flex flex-col min-h-svh bg-black relative">
      <div className="relative aspect-[3/4] w-full shrink-0">
        <Image src={userImage} alt={userProfile.username} fill className="object-cover" />
        <div className="absolute top-12 left-4 right-4 flex justify-between items-center z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-black/20 rounded-full" 
            onClick={() => router.back()}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>

          {!isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-black/20 rounded-full"
                >
                  <MoreHorizontal className="w-8 h-8" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl bg-white border-none shadow-2xl p-2">
                <DropdownMenuItem 
                  onClick={handleReport}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 rounded-xl focus:bg-gray-50 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Report User
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleBlock}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 rounded-xl focus:bg-red-50 cursor-pointer"
                >
                  <UserX className="w-4 h-4" />
                  Block User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="absolute bottom-32 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
          <div className={cn("w-2.5 h-2.5 rounded-full", presence.online ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
          <span className="text-white text-[10px] font-black uppercase tracking-tight">{presenceText}</span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-[3rem] -mt-16 relative z-20 px-6 pt-8 pb-32">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black font-headline text-gray-900 leading-tight">{userProfile.username}</h1>
            <button 
              onClick={copyId}
              className="flex items-center gap-2 text-xs font-bold text-green-500 active:scale-95 transition-transform"
            >
              ID: {userProfile.numericId || '...'}
              <Copy className="w-3 h-3 opacity-50" />
            </button>
          </div>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">{userProfile.bio || "No biography provided."}</p>
          
          {userProfile.isAdmin && (
            <div className="px-3 py-1 bg-primary/10 rounded-full inline-flex items-center gap-1.5 border border-primary/20">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Admin</span>
            </div>
          )}

          <div className="pt-8 border-t border-gray-50">
             <div className="space-y-4">
                <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Basic Information</h3>
                <div className="flex flex-wrap gap-2.5">
                   {infoTags.map((tag) => (
                     <div key={tag.label} className="flex items-center gap-2 px-3.5 py-2 border-2 border-primary/20 rounded-full text-[11px] font-bold text-primary bg-primary/5">
                        <tag.icon className="w-3.5 h-3.5" />{tag.label}
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50 flex items-center gap-4">
        <Button className="w-full h-14 rounded-full bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-transform" onClick={() => router.push(`/chat/${id}`)}>Chat</Button>
      </div>
    </div>
  )
}
