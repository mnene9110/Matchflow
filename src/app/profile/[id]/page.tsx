
"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Globe, 
  GraduationCap, 
  Sparkles, 
  Loader2, 
  ShieldAlert,
  UserX,
  Copy,
  Headset,
  Lock,
  CheckCircle,
  ShieldCheck,
  Compass,
  Zap,
  Star
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
  
  if (!userProfile && !isLoading) return (
    <div className="flex flex-col items-center justify-center h-svh p-6 text-center space-y-6 bg-white">
      <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100">
        <UserX className="w-12 h-12 text-gray-300" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-black font-headline text-gray-900 tracking-tight">User logged out</h2>
        <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px] mx-auto">
          This account no longer exists or has been deactivated.
        </p>
      </div>
      <Button onClick={() => router.back()} className="h-14 w-full max-w-[200px] rounded-full bg-primary font-black uppercase text-xs tracking-widest shadow-xl">
        Go Back
      </Button>
    </div>
  )

  if (userProfile?.isSupport) {
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

  const userPhotos = userProfile?.profilePhotoUrls || []
  const mainPhoto = userPhotos[0] || `https://picsum.photos/seed/${userProfile?.id}/600/800`
  const extraPhotos = userPhotos.slice(1)
  const isVerified = !!userProfile?.isVerified
  const isProtected = userProfile?.isAdmin === true || userProfile?.isSupport === true;

  return (
    <div className="flex flex-col min-h-svh bg-white relative overflow-y-auto">
      {/* Hero Section */}
      <div className="relative aspect-[3/4] w-full shrink-0">
        <Image src={mainPhoto} alt={userProfile?.username || "User"} fill className="object-cover" />
        <div className="absolute top-12 left-4 right-4 flex justify-between items-center z-30">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white bg-black/20 backdrop-blur-md hover:bg-black/30 rounded-full" 
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
                  className="text-white bg-black/20 backdrop-blur-md hover:bg-black/30 rounded-full"
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
        
        {/* Presence Indicator */}
        <div className="absolute bottom-20 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 z-30">
          <div className={cn("w-2.5 h-2.5 rounded-full", presence.online ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
          <span className={cn("text-[10px] font-black uppercase tracking-tight", presence.online ? "text-white" : "text-white/60")}>{presenceText}</span>
        </div>

        {/* Name & Basic Info Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent z-10" />
      </div>

      {/* Profile Details Container */}
      <div className="flex-1 bg-white relative z-20 px-6 pb-32 -mt-10">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-4xl font-black font-headline text-gray-900 leading-tight">
                {userProfile?.username}
              </h1>
              {isVerified && <CheckCircle className="w-7 h-7 text-blue-500 fill-blue-500/10" />}
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={copyId}
                className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full text-[10px] font-black text-green-600 uppercase tracking-widest active:scale-95 transition-all"
              >
                ID: {userProfile?.numericId || '---'}
                <Copy className="w-3 h-3 opacity-50" />
              </button>
              
              <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <Globe className="w-3 h-3" />
                {userProfile?.location || "Kenya"}
              </div>
            </div>
          </div>

          {/* Badges */}
          {(userProfile?.isAdmin || userProfile?.isSupport || isVerified) && (
            <div className="flex gap-2 flex-wrap">
              {userProfile?.isAdmin && (
                <div className="px-3 py-1 bg-primary/10 rounded-full inline-flex items-center gap-1.5 border border-primary/20">
                  <Zap className="w-3 h-3 text-primary fill-current" />
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">Admin</span>
                </div>
              )}
              {userProfile?.isSupport && (
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
          )}

          {/* Bio Section */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em]">Biography</h3>
            <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50/50 p-4 rounded-[1.5rem] border border-gray-100 italic">
              "{userProfile?.bio || "This user is keeping a low profile."}"
            </p>
          </div>

          {/* Gallery Section - Only if extra photos exist */}
          {extraPhotos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em]">Gallery</h3>
              <div className="grid grid-cols-2 gap-3">
                {extraPhotos.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-[2rem] overflow-hidden border-2 border-white shadow-md">
                    <Image src={url} alt={`Gallery ${index}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 gap-4 pt-4">
             <div className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <Compass className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Zodiac Sign</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{userProfile?.horoscope || "Not set"}</p>
                </div>
             </div>

             <div className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Education</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{userProfile?.education || "Private"}</p>
                </div>
             </div>

             <div className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <Star className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Goal</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{userProfile?.relationshipGoal || "Networking"}</p>
                </div>
             </div>
          </div>

          {/* Interests */}
          {userProfile?.interests && userProfile.interests.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em]">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {userProfile.interests.map((interest: string) => (
                  <div key={interest} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    #{interest}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-20" /> {/* Spacer */}
        </div>
      </div>

      {/* Action Footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 backdrop-blur-xl border-t border-gray-50 z-50 flex items-center gap-4">
        <Button 
          className="w-full h-16 rounded-full bg-primary text-white font-black text-lg shadow-2xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          onClick={() => router.push(`/chat/${id}`)}
        >
          Send Message
        </Button>
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="rounded-[2.5rem] bg-white border-none p-8 max-w-[90%] mx-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline text-gray-900 text-center">Report Profile</DialogTitle>
            <DialogDescription className="text-center text-gray-500 font-medium">
              Please provide details about why you are reporting this user.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Tell us what happened..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="min-h-[140px] rounded-[1.5rem] bg-gray-50 border-none focus-visible:ring-primary/20 py-4 font-medium"
            />
          </div>
          <DialogFooter className="flex flex-col gap-3">
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
              className="w-full h-12 rounded-full text-gray-400 font-black uppercase text-[10px] tracking-widest"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
