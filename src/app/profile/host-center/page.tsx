
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  LayoutDashboard, 
  Users, 
  Music, 
  Gem, 
  Trophy, 
  Settings, 
  ShieldCheck,
  Plus,
  Loader2,
  Mic,
  MessageCircle,
  Eye,
  ChevronRight,
  Settings2,
  LayoutGrid
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, useDoc, useFirestore, useMemoFirebase, useFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { ref, onValue, update, remove } from "firebase/database"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function HostCenterPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()

  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile, isLoading } = useDoc(userProfileRef)

  const [activeRooms, setActiveRooms] = useState<any[]>([])
  const [isRoomsLoading, setIsRoomsLoading] = useState(true)
  
  // Settings Dialog State
  const [editingRoom, setEditingRoom] = useState<any | null>(null)
  const [newCapacity, setNewCapacity] = useState<string>("")

  useEffect(() => {
    if (!database || !currentUser) return

    const roomsRef = ref(database, 'partyRooms')
    return onValue(roomsRef, (snap) => {
      const data = snap.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(r => r.hostId === currentUser.uid && r.status === 'active')
        setActiveRooms(list)
      }
      setIsRoomsLoading(false)
    })
  }, [database, currentUser])

  const handleUpdateRoom = async () => {
    if (!editingRoom || !database) return
    const roomRef = ref(database, `partyRooms/${editingRoom.id}`)
    await update(roomRef, { maxSeats: Number(newCapacity) })
    setEditingRoom(null)
  }

  const handleCloseRoom = async (roomId: string) => {
    if (!database) return
    await remove(ref(database, `partyRooms/${roomId}`))
  }

  if (isLoading) return <div className="flex h-svh items-center justify-center bg-[#B36666]"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>

  if (!profile?.isPartyAdmin && !profile?.isAdmin) {
    return <div className="flex h-svh items-center justify-center bg-white text-zinc-400 font-black uppercase text-xs tracking-widest">Access Denied</div>
  }

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-y-auto scroll-smooth pb-32">
      <header className="px-4 py-8 flex items-center sticky top-0 bg-transparent z-50 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/profile')} 
          className="text-white h-10 w-10 bg-black/10 backdrop-blur-md rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-black font-headline ml-4 tracking-widest uppercase text-white drop-shadow-md">Host Center</h1>
      </header>

      <main className="px-6 space-y-8 pt-4">
        {/* Host Stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 rounded-[2.5rem] p-6 text-white shadow-xl flex flex-col gap-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/10">
              <Gem className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[20px] font-black font-headline">{(profile?.diamondBalance || 0).toLocaleString()}</p>
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Room Earnings</p>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-[2.5rem] p-6 text-white shadow-xl flex flex-col gap-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/10">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[20px] font-black font-headline">LVL 1</p>
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Host Tier</p>
            </div>
          </div>
        </section>

        {/* Room Management */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary/40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Live Management</h2>
            </div>
            <Button 
              onClick={() => router.push('/party/create')}
              className="h-8 px-4 rounded-full bg-primary/10 text-primary font-black text-[9px] uppercase tracking-widest gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Host New
            </Button>
          </div>

          {isRoomsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary/20" /></div>
          ) : activeRooms.length > 0 ? (
            <div className="space-y-3">
              {activeRooms.map(room => (
                <div 
                  key={room.id}
                  className="bg-white/60 backdrop-blur-xl border border-white p-5 rounded-[2.25rem] flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => router.push(`/party/${room.id}`)}>
                    <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                      <AvatarImage src={room.coverPhoto || room.hostPhoto} className="object-cover" />
                      <AvatarFallback>P</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <h3 className="text-sm font-black text-gray-900">{room.title}</h3>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                        {room.maxSeats} Seats Configured
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setEditingRoom(room); setNewCapacity(room.maxSeats.toString()); }}
                      className="w-10 h-10 rounded-full bg-primary/10 text-primary"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleCloseRoom(room.id)}
                      className="w-10 h-10 rounded-full bg-red-50 text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 bg-white/20 rounded-[2.5rem] border-2 border-dashed border-white/40 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-white/40 rounded-[2rem] flex items-center justify-center"><Music className="w-8 h-8 text-gray-200" /></div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">No Active Rooms</p>
            </div>
          )}
        </section>

        {/* Permanent Settings & Support */}
        <section className="space-y-4 pb-10">
          <div className="flex items-center gap-2 px-2">
            <Settings className="w-4 h-4 text-primary/40" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Host Privileges</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button className="bg-white/40 backdrop-blur-md border border-white/40 p-6 rounded-[2rem] flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-blue-500" /></div>
                <div className="text-left">
                  <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">Verified Host Status</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Permanent Access Unlocked</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </section>
      </main>

      {/* Settings Dialog */}
      <Dialog open={!!editingRoom} onOpenChange={(open) => !open && setEditingRoom(null)}>
        <DialogContent className="rounded-[2.5rem] bg-white border-none p-8 max-w-[85%] mx-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black font-headline text-gray-900 text-center uppercase tracking-widest">Room Capacity</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Adjust Seating Limit</p>
            <Select value={newCapacity} onValueChange={setNewCapacity}>
              <SelectTrigger className="h-14 rounded-2xl bg-gray-50 border-none font-bold text-sm">
                <SelectValue placeholder="Select Seats" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="4" className="font-bold">4 Seats</SelectItem>
                <SelectItem value="8" className="font-bold">8 Seats</SelectItem>
                <SelectItem value="12" className="font-bold">12 Seats</SelectItem>
                <SelectItem value="16" className="font-bold">16 Seats</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button onClick={handleUpdateRoom} className="h-14 rounded-full bg-zinc-900 text-white font-black uppercase text-xs tracking-widest w-full">Apply Changes</Button>
            <Button variant="ghost" onClick={() => setEditingRoom(null)} className="h-12 rounded-full text-gray-400 font-black uppercase text-[10px]">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
