"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Gem, 
  Trophy, 
  Plus,
  Loader2,
  Music,
  LayoutGrid,
  UserPlus,
  Search,
  Trash2,
  Settings2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase } from "@/firebase/provider"
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, limit } from "firebase/firestore"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

export default function HostCenterPage() {
  const router = useRouter()
  const { firestore } = useFirebase()
  const { profile } = useSupabaseUser()
  const { toast } = useToast()

  const [activeRooms, setActiveRooms] = useState<any[]>([])
  const [isRoomsLoading, setIsRoomsLoading] = useState(true)
  
  const [assistantId, setAssistantId] = useState("")
  const [isSearchingAssistant, setIsSearchingAssistant] = useState(false)
  const [foundAssistant, setFoundAssistant] = useState<any>(null)
  const [isAppointing, setIsUpdatingAssistant] = useState(false)

  useEffect(() => {
    if (!profile?.id) return

    const q = query(
      collection(firestore, 'partyRooms'),
      where('hostId', '==', profile.id),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setActiveRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsRoomsLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.id, firestore])

  const handleSearchAssistant = async () => {
    if (!assistantId.trim()) return
    setIsSearchingAssistant(true)
    setFoundAssistant(null)
    try {
      const q = query(collection(firestore, "userProfiles"), where("numericId", "==", Number(assistantId)), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ variant: "destructive", title: "User not found" })
      } else {
        setFoundAssistant({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSearchingAssistant(false)
    }
  }

  const handleToggleAssistant = async () => {
    if (!foundAssistant || isAppointing || !profile) return
    setIsUpdatingAssistant(true)
    try {
      const newStatus = !foundAssistant.isAssistant
      await updateDoc(doc(firestore, "userProfiles", foundAssistant.id), { 
        isAssistant: newStatus,
        appointedBy: newStatus ? profile.id : null 
      });

      toast({ title: "Updated", description: `${foundAssistant.username} updated.` })
      setFoundAssistant(null); setAssistantId("");
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsUpdatingAssistant(false)
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await updateDoc(doc(firestore, "partyRooms", roomId), { status: 'deleted' });
      toast({ title: "Room Deleted" })
    } catch (error) {
      toast({ variant: "destructive", title: "Delete Failed" })
    }
  }

  if (profile && !profile.isPartyAdmin && !profile.isAdmin) {
    return <div className="flex h-svh items-center justify-center bg-white text-zinc-400 font-black uppercase text-xs tracking-widest">Access Denied</div>
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-y-auto scroll-smooth pb-32">
      <header className="px-4 py-8 flex items-center sticky top-0 bg-[#3BC1A8] z-50 text-white shadow-lg">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Host Center</h1>
      </header>

      <main className="px-6 space-y-8 pt-6">
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 rounded-[2.5rem] p-6 text-white shadow-xl flex flex-col gap-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/10"><Gem className="w-5 h-5 text-blue-400" /></div>
            <div><p className="text-[20px] font-black font-headline">{(profile?.diamondBalance || 0).toLocaleString()}</p><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Diamond Earnings</p></div>
          </div>
          <div className="bg-zinc-900 rounded-[2.5rem] p-6 text-white shadow-xl flex flex-col gap-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/10"><Trophy className="w-5 h-5 text-amber-500" /></div>
            <div><p className="text-[20px] font-black font-headline">LVL {profile?.vipLevel || 0}</p><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">VIP Rank</p></div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-primary/40" /><h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Your Active Rooms</h2></div>
            <Button onClick={() => router.push('/party/create')} className="h-8 px-4 rounded-full bg-primary/10 text-primary font-black text-[9px] uppercase tracking-widest gap-2"><Plus className="w-3.5 h-3.5" />Host New</Button>
          </div>

          {isRoomsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary/20" /></div>
          ) : activeRooms.length > 0 ? (
            <div className="space-y-3">
              {activeRooms.map(room => (
                <div key={room.id} className="bg-gray-50 border border-gray-100 p-5 rounded-[2.25rem] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => router.push(`/party/${room.id}`)}>
                    <Avatar className="w-12 h-12 border-2 border-white shadow-md"><AvatarImage src={room.coverPhoto} /><AvatarFallback>P</AvatarFallback></Avatar>
                    <div className="flex flex-col"><h3 className="text-sm font-black text-gray-900">{room.title}</h3><span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{room.maxSeats} Seats</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger><AlertDialogContent className="rounded-[2rem] border-none shadow-2xl"><AlertDialogHeader><AlertDialogTitle className="font-headline font-black text-xl">Delete Room?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter className="flex flex-col gap-2 mt-4"><AlertDialogAction onClick={() => handleDeleteRoom(room.id)} className="h-14 rounded-full bg-red-500 text-white font-black uppercase text-xs w-full">Yes, Delete</AlertDialogAction><AlertDialogCancel className="h-14 rounded-full border-none bg-gray-50 text-gray-400 font-black uppercase text-xs w-full">Cancel</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-4"><Music className="w-8 h-8 text-gray-200" /><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">No Active Parties</p></div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2"><UserPlus className="w-4 h-4 text-primary/40" /><h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Appoint Assistants</h2></div>
          <div className="bg-gray-50 border border-gray-100 p-6 rounded-[2.5rem] shadow-sm space-y-6">
            <div className="flex gap-2">
              <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" /><Input placeholder="Numeric ID" value={assistantId} onChange={(e) => setAssistantId(e.target.value)} type="number" className="h-14 pl-12 rounded-2xl bg-white border-none text-sm font-bold shadow-sm" /></div>
              <Button onClick={handleSearchAssistant} disabled={isSearchingAssistant || !assistantId} className="h-14 w-14 rounded-2xl bg-zinc-900">{isSearchingAssistant ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}</Button>
            </div>
            {foundAssistant && (
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3"><Avatar className="w-10 h-10"><AvatarImage src={foundAssistant.profilePhotoUrls?.[0]} /><AvatarFallback>{foundAssistant.username?.[0]}</AvatarFallback></Avatar><div><p className="text-sm font-black">{foundAssistant.username}</p></div></div>
                <Button onClick={handleToggleAssistant} disabled={isAppointing} variant={foundAssistant.isAssistant ? "destructive" : "default"} className="h-10 px-4 rounded-full font-black text-[9px] uppercase">{isAppointing ? <Loader2 className="w-4 h-4 animate-spin" /> : (foundAssistant.isAssistant ? "Dismiss" : "Appoint")}</Button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
