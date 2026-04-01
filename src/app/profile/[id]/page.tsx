
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
  Copy,
  Headset,
  Lock,
  CheckCircle,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useDoc, useFirestore, useFirebase, useMemoFirebase, useUser, setDocumentNonBlocking } from "@/firebase"
import { doc, collection, addDoc } from "firebase/firestore"
import { ref, onValue } from "firebase/database"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
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
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportDetails, setReportDetails] = useState("")
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

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
    if (!currentUser || !id || userProfile?.isSupport || userProfile?.isAdmin) return
    
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

  const handleReport = async () => {
    if (!currentUser || !id || !reportDetails.trim() || isSubmittingReport) return
    setIsSubmittingReport(true)

    try {
      const reportsCol = collection(firestore, "reports")
      await addDoc(reportsCol, {
        reporterId: currentUser.uid,
        reportedUserId: id,
        details: reportDetails,
        createdAt: new Date().toISOString(),
        status: "pending"
      })

      toast({
        title: "Report Submitted",
        description: "Our team will review this profile. Thank you for keeping MatchFlow safe.",
      })
      setShowReportDialog(false)
      setReportDetails("")
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit report." })
    } finally {
      setIsSubmittingReport(false)
    }
  }

  const copyId = () => {
    if (userProfile?.numericId) {
      navigator.clipboard.writeText(userProfile.numericId.toString());
      toast({ title: "ID Copied", description: "Numeric ID copied to clipboard." });
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-svh bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  
  if (!userProfile) return (
    <div className="flex flex-col items-center justify-center h-svh p-6 text-center space-y-4">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
        <UserX className="w-10 h-10 text-gray-300" />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-gray-900">User logged out</h2>
        <p className="text-sm text-gray-500 font-medium">This account no longer exists or has been deactivated.</p>
      </div>
      <Button onClick={() => router.back()} className="rounded-full h-12 px-8">Go Back</Button>
    </div>
  )

  if (userProfile.isSupport) {
    return (
      <div className="flex flex-col items-center justify-center h-svh p-8 text-center space-y-6 bg-white">
        <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border border-primary/20">
          <Lock className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black font-headline text-gray-900 tracking-tight">Access Restricted</h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px] mx-auto">
            Profile details for Customer Support agents are private.
          </p>
        </div>
        <div className="flex flex-col w-full gap-3 max-w-[240px]">
          <Button onClick={() => router.push(`/chat/${id}`)} className="h-14 rounded-full bg-primary font-black uppercase text-xs tracking-widest gap-3">
            <Headset className="w-4 h-4" />
            Chat with Support
          </Button>
          <Button variant="ghost" onClick={() => router.back()} className="h-14 rounded-full text-gray-400 font-bold uppercase text-[10px] tracking-widest">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const infoTags = [
    { label: "Sometimes", icon: Globe },
    { label: "Undergraduate", icon: GraduationCap },
    { label: "Never", icon: CigaretteOff },
    { label: "Socially", icon: GlassWater },
    { label: "Change the world", icon: Sparkles },
  ]

  const userImage = (userProfile.profilePhotoUrls && userProfile.profilePhotoUrls[0]) || `https://picsum.photos/seed/${userProfile.id}/600/800`
  const isVerified = !!userProfile.isVerified
  const isProtected = userProfile.isAdmin === true || userProfile.isSupport === true;

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

          {!isProtected && (
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
                  onClick={() => setShowReportDialog(true)}
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
          <span className={cn("text-[10px] font-black uppercase tracking-tight", presence.online ? "text-white" : "text-gray-400")}>{presenceText}</span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-[3rem] -mt-16 relative z-20 px-6 pt-8 pb-32">
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black font-headline text-gray-900 leading-tight">{userProfile.username}</h1>
              {isVerified && <CheckCircle className="w-6 h-6 text-blue-500 fill-blue-500/10" />}
            </div>
            <button 
              onClick={copyId}
              className="flex items-center gap-2 text-xs font-bold text-green-500 active:scale-95 transition-transform"
            >
              ID: {userProfile.numericId || '...'}
              <Copy className="w-3 h-3 opacity-50" />
            </button>
          </div>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">{userProfile.bio || "No biography provided."}</p>
          
          <div className="flex gap-2 flex-wrap">
            {userProfile.isAdmin && (
              <div className="px-3 py-1 bg-primary/10 rounded-full inline-flex items-center gap-1.5 border border-primary/20">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Admin</span>
              </div>
            )}
            {userProfile.isSupport && (
              <div className="px-3 py-1 bg-blue-500/10 rounded-full inline-flex items-center gap-1.5 border border-blue-500/20">
                <Headset className="w-3 h-3 text-blue-500" />
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Support</span>
              </div>
            )}
            {isVerified && (
              <div className="px-3 py-1 bg-blue-500/10 rounded-full inline-flex items-center gap-1.5 border border-blue-500/20">
                <ShieldCheck className="w-3 h-3 text-blue-500" />
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Verified Identity</span>
              </div>
            )}
          </div>

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

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="rounded-[2.5rem] bg-white border-none p-8 max-w-[90%] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black font-headline text-gray-900 text-center">Report Profile</DialogTitle>
            <DialogDescription className="text-center text-gray-500 font-medium">
              Please provide details about the issue with this user.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Explain the violation..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="min-h-[120px] rounded-2xl bg-gray-50 border-gray-100 focus-visible:ring-primary/20"
            />
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button 
              onClick={handleReport}
              disabled={!reportDetails.trim() || isSubmittingReport}
              className="w-full h-14 rounded-full bg-primary text-white font-black shadow-lg"
            >
              {isSubmittingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Report"}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowReportDialog(false)}
              className="w-full h-12 rounded-full text-gray-400 font-bold"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
