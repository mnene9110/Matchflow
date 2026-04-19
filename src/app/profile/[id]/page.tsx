"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Globe, 
  GraduationCap, 
  Loader2, 
  ShieldAlert,
  UserX,
  Copy,
  Headset,
  Lock,
  CheckCircle,
  ShieldCheck,
  Compass,
  Calendar,
  Zap,
  Tag,
  X,
  Target
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, collection, addDoc, serverTimestamp, setDoc } from "firebase/firestore"
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"

export default function ProfileDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { firestore } = useFirebase()
  const { user: currentUser } = useUser()
  const { toast } = useToast()
  
  const targetDocRef = useMemoFirebase(() => id ? doc(firestore, "userProfiles", id as string) : null, [firestore, id])
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(targetDocRef)

  const meRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: currentUserProfile } = useDoc(meRef)
  
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportDetails, setReportDetails] = useState("")
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  // Record Visitor Logic
  useEffect(() => {
    if (currentUser && id && id !== currentUser.uid && firestore && userProfile && currentUserProfile) {
      const visitorRef = doc(firestore, "userProfiles", id as string, "visitors", currentUser.uid);
      setDoc(visitorRef, {
        userId: currentUser.uid,
        username: currentUserProfile.username || "Someone",
        photo: (currentUserProfile.profilePhotoUrls && currentUserProfile.profilePhotoUrls[0]) || "",
        timestamp: serverTimestamp()
      }, { merge: true }).catch(console.error);
    }
  }, [currentUser?.uid, id, !!firestore, !!userProfile, !!currentUserProfile]);

  // Handle browser back button to close fullscreen image
  useEffect(() => {
    const handlePopState = () => {
      if (fullscreenImage) {
        setFullscreenImage(null);
      }
    };
    if (fullscreenImage) {
      window.history.pushState({ gallery: true }, "");
      window.addEventListener("popstate", handlePopState);
    }
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [fullscreenImage]);

  const openFullscreen = (url: string) => setFullscreenImage(url);
  const closeFullscreen = () => fullscreenImage && window.history.back();

  const age = useMemo(() => {
    if (!userProfile?.dateOfBirth) return null;
    const birthDate = new Date(userProfile.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }, [userProfile?.dateOfBirth]);

  const presenceText = useMemo(() => {
    if (userProfile?.isOnline) return "Online";
    if (!userProfile?.lastActiveAt) return "Offline";
    const date = userProfile.lastActiveAt.toDate ? userProfile.lastActiveAt.toDate() : new Date(userProfile.lastActiveAt);
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [userProfile]);

  const handleBlock = async () => {
    if (!currentUser || !id || userProfile?.isSupport || userProfile?.isAdmin || !firestore) return
    try {
      await setDoc(doc(firestore, "userProfiles", currentUser.uid, "blockedUsers", id as string), {
        blockedUserId: id,
        username: userProfile?.username || "Unknown",
        blockedAt: serverTimestamp()
      });
      toast({ title: "User Blocked", description: `${userProfile?.username} has been blocked.` })
      router.push('/discover')
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not block user." })
    }
  }

  const handleReport = async () => {
    if (!currentUser || !id || !reportDetails.trim() || isSubmittingReport || !firestore) return
    setIsSubmittingReport(true)
    try {
      await addDoc(collection(firestore, "reports"), {
        reporterId: currentUser.uid,
        reportedUserId: id,
        details: reportDetails,
        timestamp: serverTimestamp(),
        status: "pending"
      })
      toast({ title: "Report Submitted", description: "Our team will review this profile." })
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
      toast({ title: "ID Copied" });
    }
  }

  if (isProfileLoading) return <div className="flex items-center justify-center h-svh bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  
  if (!userProfile) return (
    <div className="flex flex-col items-center justify-center h-svh p-6 text-center space-y-6 bg-white">
      <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100"><UserX className="w-12 h-12 text-gray-300" /></div>
      <div className="space-y-2">
        <h2 className="text-3xl font-black font-headline text-gray-900 tracking-tight">User logged out</h2>
        <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px] mx-auto">This account no longer exists or has been deactivated.</p>
      </div>
      <Button onClick={() => router.back()} className="h-14 w-full max-w-[200px] rounded-full bg-primary font-black uppercase text-xs tracking-widest shadow-xl">Go Back</Button>
    </div>
  )

  if (userProfile?.isSupport) {
    return (
      <div className="flex flex-col items-center justify-center h-svh p-8 text-center space-y-6 bg-white">
        <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border border-primary/20"><Lock className="w-12 h-12 text-primary" /></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black font-headline text-gray-900 tracking-tight">Access Restricted</h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[240px] mx-auto">Profile details for Customer Support agents are private.</p>
        </div>
        <div className="flex flex-col w-full gap-3 max-w-[240px]">
          <Button onClick={() => router.push(`/chat/${id}`)} className="h-14 rounded-full bg-primary font-black uppercase text-xs tracking-widest gap-3"><Headset className="w-4 h-4" />Chat with Support</Button>
          <Button variant="ghost" onClick={() => router.back()} className="h-14 rounded-full text-gray-400 font-bold uppercase text-[10px] tracking-widest">Go Back</Button>
        </div>
      </div>
    )
  }

  const userPhotos = (userProfile?.profilePhotoUrls || []).filter(Boolean)
  if (userPhotos.length === 0) userPhotos.push(`https://picsum.photos/seed/${userProfile?.id}/600/800`)
  
  const isVerified = !!userProfile?.isVerified
  const isProtected = userProfile?.isAdmin === true || userProfile?.isSupport === true;

  const hasInterests = userProfile?.interests && userProfile.interests.length > 0;
  const hasDetails = userProfile?.education || userProfile?.horoscope || userProfile?.relationshipGoal;

  return (
    <div className="flex flex-col h-svh bg-white relative overflow-y-auto scroll-smooth">
      <div className="relative aspect-[3/4] w-full shrink-0 bg-gray-100">
        <Carousel setApi={setApi} className="w-full h-full">
          <CarouselContent className="h-full ml-0">
            {userPhotos.map((url, idx) => (
              <CarouselItem key={idx} className="h-full pl-0 basis-full">
                <div className="relative w-full h-full cursor-pointer active:opacity-90" onClick={() => openFullscreen(url)}>
                  <Image src={url} alt={`${userProfile?.username || "User"} Photo ${idx + 1}`} fill className="object-cover" priority={idx === 0} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Carousel Indicators */}
        {userPhotos.length > 1 && (
          <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5 z-40">
            {userPhotos.map((_, idx) => (
              <div key={idx} className={cn("h-1 rounded-full transition-all duration-300", current === idx ? "w-6 bg-white shadow-sm" : "w-1.5 bg-white/40")} />
            ))}
          </div>
        )}

        <div className="absolute top-12 left-4 right-4 flex justify-between items-center z-50">
          <Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-md hover:bg-black/30 rounded-full" onClick={() => router.back()}><ChevronLeft className="w-8 h-8" /></Button>
          {!isProtected && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-white bg-black/20 backdrop-blur-md hover:bg-black/30 rounded-full"><MoreHorizontal className="w-8 h-8" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl bg-white border-none shadow-2xl p-2">
                <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 rounded-xl cursor-pointer"><ShieldAlert className="w-4 h-4 text-amber-500" />Report User</DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock} className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 rounded-xl cursor-pointer"><UserX className="w-4 h-4" />Block User</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="absolute bottom-20 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 z-40">
          <div className={cn("w-2.5 h-2.5 rounded-full", userProfile?.isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
          <span className={cn("text-[10px] font-black uppercase tracking-tight", userProfile?.isOnline ? "text-white" : "text-white/60")}>{presenceText}</span>
        </div>
        
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent z-10" />
      </div>

      <div className="flex-1 bg-white relative z-20 px-6 pb-40 -mt-10">
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black font-headline text-gray-900 leading-none">{userProfile?.username}</h1>
              {isVerified && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <CheckCircle className="w-4 h-4 text-white fill-current" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-medium text-gray-500 capitalize leading-none font-body">{userProfile?.gender || "Not specified"} • {age ? `${age} years old` : 'Age hidden'}</p>
              <div className="flex items-center gap-4 mt-2">
                <button onClick={copyId} className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full text-[9px] font-black text-green-600 uppercase tracking-widest active:scale-95 transition-all">ID: {userProfile?.numericId || '---'}<Copy className="w-3 h-3 opacity-50" /></button>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest"><Globe className="w-3 h-3" />{userProfile?.location || "Kenya"}</div>
              </div>
            </div>
          </div>

          {(userProfile?.isAdmin || userProfile?.isSupport || isVerified) && (
            <div className="flex gap-2 flex-wrap">
              {userProfile?.isAdmin && <div className="px-3 py-1 bg-primary/10 rounded-full inline-flex items-center gap-1.5 border border-primary/20"><Zap className="w-3 h-3 text-primary fill-current" /><span className="text-[9px] font-black text-primary uppercase tracking-widest">Admin</span></div>}
              {userProfile?.isSupport && <div className="px-3 py-1 bg-blue-500/10 rounded-full inline-flex items-center gap-1.5 border border-blue-500/20"><Headset className="w-3 h-3 text-blue-500" /><span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Support</span></div>}
              {isVerified && <div className="px-3 py-1 bg-blue-500/10 rounded-full inline-flex items-center gap-1.5 border border-blue-500/20"><ShieldCheck className="w-3 h-3 text-blue-500" /><span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Verified</span></div>}
            </div>
          )}

          {/* User Bio - Only show if exists */}
          {userProfile?.bio && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Biography</h3>
              <div className="bg-gray-50/50 p-5 rounded-[1.5rem] border border-gray-100">
                <p className="text-sm font-medium text-gray-600 leading-relaxed italic">"{userProfile.bio}"</p>
              </div>
            </div>
          )}

          {/* User Details - Only show if any exist */}
          {hasDetails && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Profile Info</h3>
              <div className="grid grid-cols-1 gap-3">
                {userProfile?.horoscope && (
                  <div className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary"><Compass className="w-6 h-6" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Zodiac Sign</p>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{userProfile.horoscope}</p>
                    </div>
                  </div>
                )}

                {userProfile?.education && (
                  <div className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary"><GraduationCap className="w-6 h-6" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Education</p>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{userProfile.education}</p>
                    </div>
                  </div>
                )}

                {userProfile?.relationshipGoal && (
                  <div className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary"><Target className="w-6 h-6" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Looking For</p>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{userProfile.relationshipGoal.replace('-', ' ')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interests - Only show if exist */}
          {hasInterests && (
            <div className="space-y-4 pt-4">
              <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {userProfile.interests.map((interest: string) => (
                  <div key={interest} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-full flex items-center gap-2">
                    <Tag className="w-2.5 h-2.5 text-primary/40" />
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{interest}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="h-40" />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-[60] flex flex-col items-center">
        <div className="w-full max-md:max-w-none max-w-md">
          <Button className="w-full h-16 rounded-full bg-primary text-white font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3" onClick={() => router.push(`/chat/${id}`)}>Send Message</Button>
        </div>
      </div>

      {fullscreenImage && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300" onClick={closeFullscreen}>
          <div className="relative w-full flex-1">
            <Image src={fullscreenImage} alt="Fullscreen" fill className="object-contain cursor-pointer" priority />
          </div>
          <div className="p-10 shrink-0">
            <Button onClick={(e) => { e.stopPropagation(); closeFullscreen(); }} className="h-16 px-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 transition-all gap-3">
              <X className="w-5 h-5" />
              Close Viewer
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="rounded-[2.5rem] bg-white border-none p-8 max-w-[90%] mx-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline text-gray-900 text-center">Report Profile</DialogTitle>
            <DialogDescription className="text-center text-gray-500 font-medium">Please provide details about why you are reporting this user.</DialogDescription>
          </DialogHeader>
          <div className="py-4"><Textarea placeholder="Tell us what happened..." value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} className="min-h-[140px] rounded-[1.5rem] bg-gray-50 border-none focus-visible:ring-primary/20 py-4 font-medium" /></div>
          <DialogFooter className="flex flex-col gap-3">
            <Button onClick={handleReport} disabled={!reportDetails.trim() || isSubmittingReport} className="w-full h-14 rounded-full bg-primary text-white font-black shadow-lg">{isSubmittingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Report"}</Button>
            <Button variant="ghost" onClick={() => setShowReportDialog(false)} className="w-full h-12 rounded-full text-gray-400 font-black uppercase text-[10px] tracking-widest">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
