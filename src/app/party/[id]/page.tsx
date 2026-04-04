
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Loader2, 
  Users, 
  MoreHorizontal, 
  Heart, 
  Trophy, 
  MessageCircle, 
  Gift, 
  Gamepad2, 
  Armchair,
  Mic,
  MicOff,
  Trash2,
  X,
  LayoutGrid
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { ref, onValue, off, remove, update, serverTimestamp as rtdbTimestamp, set } from "firebase/database"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { getZegoConfig } from "@/app/actions/zego"
import { cn } from "@/lib/utils"
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function PartyRoomPage() {
  const params = useParams()
  const roomId = params?.id as string
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { database, firestore } = useFirebase()
  const { toast } = useToast()

  const [room, setRoom] = useState<any>(null)
  const [seats, setSeats] = useState<Record<string, any>>({})
  const [messages, setMessages] = useState<any[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null)
  const [isMicOn, setIsMicOn] = useState(false)
  const [roomUsers, setRoomUsers] = useState<any[]>([])

  const zpRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(userProfileRef)

  // 1. Monitor Room and Seats
  useEffect(() => {
    if (!database || !roomId) return
    const roomRef = ref(database, `partyRooms/${roomId}`)
    const seatsRef = ref(database, `partyRooms/${roomId}/seats`)
    const msgsRef = ref(database, `partyRooms/${roomId}/messages`)

    onValue(roomRef, (snap) => {
      const data = snap.val()
      if (data) setRoom(data)
      else {
        toast({ title: "Room Closed", description: "The host has ended this party." })
        router.push('/party')
      }
    })

    onValue(seatsRef, (snap) => {
      const data = snap.val() || {}
      setSeats(data)
      // Check if I am still on a seat
      const mySeat = Object.entries(data).find(([_, val]: [string, any]) => val.userId === currentUser?.uid)
      if (mySeat) setMySeatIndex(Number(mySeat[0]))
      else setMySeatIndex(null)
    })

    onValue(msgsRef, (snap) => {
      const data = snap.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        list.sort((a, b) => a.timestamp - b.timestamp)
        setMessages(list.slice(-50))
      }
    })

    // Update member count
    const presenceRef = ref(database, `partyRooms/${roomId}/participants/${currentUser?.uid}`)
    if (currentUser) {
      set(presenceRef, {
        userId: currentUser.uid,
        username: profile?.username || "Guest",
        photo: profile?.profilePhotoUrls?.[0] || "",
        joinedAt: Date.now()
      })
      update(ref(database, `partyRooms/${roomId}`), { memberCount: 1 }) // This should ideally be handled by a counter transaction
    }

    onValue(ref(database, `partyRooms/${roomId}/participants`), (snap) => {
      const data = snap.val()
      if (data) setRoomUsers(Object.values(data))
    })

    return () => {
      off(roomRef)
      off(seatsRef)
      off(msgsRef)
      if (currentUser) remove(presenceRef)
    }
  }, [database, roomId, currentUser, !!profile])

  // 2. Initialize Zego
  useEffect(() => {
    if (!roomId || !currentUser || !profile || zpRef.current || !room) return

    const initZego = async () => {
      try {
        const config = await getZegoConfig()
        const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt')

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          config.appID,
          config.serverSecret!,
          roomId,
          currentUser.uid,
          profile.username || "User"
        )

        const zp = ZegoUIKitPrebuilt.create(kitToken)
        zpRef.current = zp

        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.LiveAudioRoom,
            config: {
              role: room.hostId === currentUser.uid ? ZegoUIKitPrebuilt.Host : ZegoUIKitPrebuilt.Audience,
            }
          },
          showPreJoinView: false,
          turnOnMicrophoneWhenJoining: false,
          turnOnCameraWhenJoining: false,
          showMyCameraToggleButton: false,
          showAudioVideoSettingsButton: false,
          showScreenSharingButton: false,
          showUserList: false,
          onLeaveRoom: () => router.push('/party')
        })

        setIsInitializing(false)
      } catch (error: any) {
        console.error("Zego Error:", error)
        toast({ variant: "destructive", title: "Join Failed", description: error.message })
        setIsInitializing(false)
      }
    }

    initZego()
    return () => {
      if (zpRef.current) zpRef.current.destroy()
    }
  }, [roomId, currentUser, !!profile, !!room])

  const handleMountSeat = async (index: number) => {
    if (!database || !currentUser || !profile) return
    if (seats[index]) return // Seat taken

    // If already on a seat, leave it first
    if (mySeatIndex !== null) {
      await remove(ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`))
    }

    await set(ref(database, `partyRooms/${roomId}/seats/${index}`), {
      userId: currentUser.uid,
      username: profile.username,
      photo: profile.profilePhotoUrls?.[0] || "",
      isMicOn: true
    })

    setMySeatIndex(index)
    setIsMicOn(true)
    if (zpRef.current) zpRef.current.setTurnOnMicrophoneWhenJoining(true)
  }

  const handleLeaveSeat = async () => {
    if (mySeatIndex === null || !database) return
    await remove(ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`))
    setMySeatIndex(null)
    setIsMicOn(false)
  }

  const handleDeleteRoom = async () => {
    if (!database || !roomId) return
    await remove(ref(database, `partyRooms/${roomId}`))
    router.push('/party')
  }

  const isHost = currentUser?.uid === room?.hostId
  const maxSeats = room?.maxSeats || 8

  return (
    <div className="flex flex-col h-svh bg-[#0a1a1a] text-white overflow-hidden relative font-body">
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1a1a] via-[#1a3a3a]/40 to-[#0a1a1a] z-10" />
        <img 
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80" 
          className="w-full h-full object-cover opacity-40 blur-[2px]" 
          alt="Aurora"
        />
      </div>

      {/* Header */}
      <header className="relative z-20 px-4 py-6 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-white/20">
            <AvatarImage src={room?.hostPhoto} className="object-cover" />
            <AvatarFallback>{room?.hostName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-sm font-black truncate max-w-[120px]">{room?.title}</h1>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">ID: {roomId.slice(0, 8)}</span>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ml-1">
            <Heart className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-full border border-white/10">
            <Users className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[10px] font-black">{roomUsers.length}</span>
          </div>
          
          {isHost ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2.5rem] bg-zinc-900 border-none text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-headline font-black text-2xl text-center">End Party?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400 text-center">
                    This will close the room for everyone and permanently delete this session.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col gap-2 mt-6">
                  <AlertDialogAction onClick={handleDeleteRoom} className="h-14 rounded-full bg-red-500 hover:bg-red-600 font-black uppercase text-xs tracking-widest">Close Room</AlertDialogAction>
                  <AlertDialogCancel className="h-14 rounded-full bg-zinc-800 border-none font-black uppercase text-xs tracking-widest text-zinc-400">Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => router.push('/party')} className="w-10 h-10 rounded-full bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 relative z-10 flex flex-col items-center pt-8 px-4 overflow-y-auto">
        <div className="flex items-center gap-4 mb-10 px-4 py-2 bg-black/30 backdrop-blur-xl rounded-full border border-white/5">
           <Trophy className="w-4 h-4 text-amber-400" />
           <div className="flex -space-x-2">
             {[1,2,3].map(i => (
               <div key={i} className="w-6 h-6 rounded-full border border-zinc-900 bg-zinc-800 overflow-hidden">
                 <img src={`https://picsum.photos/seed/${i+100}/50/50`} className="w-full h-full object-cover" />
               </div>
             ))}
           </div>
           <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Top Contributors</span>
        </div>

        {/* Seat Grid: Bibo Style */}
        <div className="w-full max-w-sm space-y-12">
          {/* Row 0: Host Throne */}
          <div className="flex justify-center relative">
            <div className="absolute -top-6 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-200 rounded-full z-20 shadow-lg">
               <span className="text-[8px] font-black text-zinc-900 uppercase">HOST</span>
            </div>
            <div 
              onClick={() => handleMountSeat(0)}
              className={cn(
                "w-24 h-24 rounded-full border-4 flex items-center justify-center relative transition-all duration-500 cursor-pointer shadow-2xl",
                seats[0] ? "border-amber-400 ring-4 ring-amber-400/20" : "border-white/10 bg-black/40 hover:bg-black/60"
              )}
            >
              {seats[0] ? (
                <Avatar className="w-full h-full">
                  <AvatarImage src={seats[0].photo} className="object-cover" />
                  <AvatarFallback className="text-xl font-black">{seats[0].username?.[0]}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <Armchair className="w-8 h-8" />
                </div>
              )}
              {seats[0] && <div className="absolute -bottom-2 px-3 py-0.5 bg-amber-400 rounded-full text-zinc-900 text-[8px] font-black uppercase shadow-md">{seats[0].username}</div>}
            </div>
          </div>

          {/* Row 1 & 2: Member Grid */}
          <div className="grid grid-cols-4 gap-y-10 gap-x-4">
            {Array.from({ length: maxSeats }).map((_, i) => {
              const index = i + 1;
              const occupant = seats[index];
              return (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div 
                    onClick={() => handleMountSeat(index)}
                    className={cn(
                      "w-16 h-16 rounded-full border-2 flex items-center justify-center relative transition-all cursor-pointer",
                      occupant ? "border-primary shadow-lg ring-4 ring-primary/10" : "border-white/5 bg-black/30 hover:bg-black/50"
                    )}
                  >
                    {occupant ? (
                      <Avatar className="w-full h-full">
                        <AvatarImage src={occupant.photo} className="object-cover" />
                        <AvatarFallback className="text-xs font-black">{occupant.username?.[0]}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 opacity-20">
                        <Armchair className="w-5 h-5" />
                        <span className="text-[8px] font-black">{index}</span>
                      </div>
                    )}
                    {occupant?.isMicOn && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0a1a1a] shadow-sm animate-pulse">
                        <Mic className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-tighter truncate w-full text-center px-1",
                    occupant ? "text-white" : "text-white/20"
                  )}>
                    {occupant ? occupant.username : "Mount"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="w-full mt-12 mb-24 flex flex-col gap-3">
          <div className="self-start max-w-[85%] bg-teal-500/20 backdrop-blur-md border border-teal-500/30 rounded-2xl rounded-tl-none px-4 py-3 shadow-xl">
            <p className="text-teal-200 text-xs font-medium leading-relaxed">
              Welcome to {room?.title}! Please respect others and chat politely. Let's have fun together! 🎭
            </p>
          </div>

          {messages.map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded-md">
                  <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest italic">VIP2</span>
                </div>
                <span className="text-[10px] font-black text-white/60">{m.username}</span>
              </div>
              <div className="self-start max-w-[90%] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl rounded-tl-none px-4 py-3 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                <p className="text-[13px] font-medium text-white/90 leading-snug">
                  {m.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Interaction Footer */}
      <footer className="relative z-30 px-4 py-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between gap-3">
        <button className="h-12 flex-1 px-6 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center gap-2 group active:bg-white/20 transition-all">
          <MessageCircle className="w-4 h-4 text-white/40" />
          <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">Let's Show...</span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button className="w-12 h-12 rounded-full bg-[#9b4de0] shadow-lg flex items-center justify-center active:scale-90 transition-transform">
            <Gamepad2 className="w-6 h-6 text-white" />
          </button>
          <button className="w-12 h-12 rounded-full bg-[#fcd34d] shadow-lg flex items-center justify-center active:scale-90 transition-transform">
            <Gift className="w-6 h-6 text-zinc-900" />
          </button>
          
          <button 
            onClick={mySeatIndex !== null ? handleLeaveSeat : () => handleMountSeat(1)}
            className={cn(
              "w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-all",
              mySeatIndex !== null ? "bg-primary" : "bg-white/10 border border-white/10"
            )}
          >
            {mySeatIndex !== null ? <Mic className="w-6 h-6" /> : <Armchair className="w-6 h-6 text-white/60" />}
          </button>

          <div className="relative">
            <button className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white/60" />
            </button>
            <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 rounded-full text-[8px] font-black border-2 border-zinc-900">99+</div>
          </div>

          <button className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
            <LayoutGrid className="w-6 h-6 text-white/60" />
          </button>
        </div>
      </footer>

      {/* Hidden Zego Container */}
      <div ref={containerRef} className="hidden" />
    </div>
  )
}
