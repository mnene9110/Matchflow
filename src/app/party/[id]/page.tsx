
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Loader2, 
  Users, 
  Mic,
  MicOff,
  X,
  Send,
  Lock,
  Tag,
  LogOut,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { ref, onValue, off, remove, update, set, push } from "firebase/database"
import { doc, collection, query as fsQuery, where, getDocs } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { getZegoConfig } from "@/app/actions/zego"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

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
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [roomUsers, setRoomUsers] = useState<any[]>([])
  const [chatInput, setChatInput] = useState("")
  const [speakers, setSpeakers] = useState<Record<string, boolean>>({})
  
  // Seat Labeling State
  const [labelingSeatIndex, setLabelingSeatIndex] = useState<number | null>(null)
  const [newSeatLabel, setNewSeatLabel] = useState("")

  const zpRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(userProfileRef)

  const isHost = currentUser?.uid === room?.hostId
  const isAdmin = useMemo(() => room?.admins?.[currentUser?.uid || ""] === true || isHost, [room, currentUser, isHost])

  // 1. Monitor Room and Participants
  useEffect(() => {
    if (!database || !roomId || !currentUser) return
    
    const roomRef = ref(database, `partyRooms/${roomId}`)
    
    onValue(roomRef, (snap) => {
      const data = snap.val()
      if (data) setRoom(data)
      else router.push('/party')
    })

    // Listen to Seats
    onValue(ref(database, `partyRooms/${roomId}/seats`), (snap) => {
      const data = snap.val() || {}
      setSeats(data)
      const mySeat = Object.entries(data).find(([_, val]: [string, any]) => val.userId === currentUser?.uid)
      if (mySeat) setMySeatIndex(Number(mySeat[0]))
      else setMySeatIndex(null)
    })

    // Listen to Messages
    onValue(ref(database, `partyRooms/${roomId}/messages`), (snap) => {
      const data = snap.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        list.sort((a, b) => a.timestamp - b.timestamp)
        setMessages(list.slice(-50))
      }
    })

    // Participant Presence
    const presenceRef = ref(database, `partyRooms/${roomId}/participants/${currentUser?.uid}`)
    if (profile) {
      set(presenceRef, {
        userId: currentUser.uid,
        username: profile.username || "Guest",
        photo: profile.profilePhotoUrls?.[0] || "",
        joinedAt: Date.now()
      })

      // Send Join Message
      const joinMsgRef = push(ref(database, `partyRooms/${roomId}/messages`))
      set(joinMsgRef, {
        text: `${profile.username} joined the party`,
        username: "System",
        isSystem: true,
        timestamp: Date.now()
      })
    }

    onValue(ref(database, `partyRooms/${roomId}/participants`), (snap) => {
      const data = snap.val()
      if (data) setRoomUsers(Object.values(data))
      else setRoomUsers([])
    })

    return () => {
      off(roomRef)
      if (currentUser) {
        // Complete Trace Removal
        remove(presenceRef)
        if (mySeatIndex !== null) {
          remove(ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`))
        }
        if (zpRef.current) zpRef.current.destroy()
      }
    }
  }, [database, roomId, currentUser, !!profile])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 2. Initialize Zego (Audio Only)
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
              role: isHost ? ZegoUIKitPrebuilt.Host : ZegoUIKitPrebuilt.Audience,
            }
          },
          showPreJoinView: false,
          turnOnMicrophoneWhenJoining: false,
          turnOnCameraWhenJoining: false,
          showMyCameraToggleButton: false,
          showAudioVideoSettingsButton: false,
          showScreenSharingButton: false,
          showUserList: false,
        })

        zp.on('soundLevelUpdate', (levels: any[]) => {
          const active: Record<string, boolean> = {}
          levels.forEach(l => {
            if (l.soundLevel > 5) active[l.userID] = true
          })
          setSpeakers(active)
        })

        setIsInitializing(false)
      } catch (error: any) {
        console.error("Zego Error:", error)
        setIsInitializing(false)
      }
    }

    initZego()
  }, [roomId, currentUser, !!profile, !!room])

  const handleMountSeat = async (index: number) => {
    if (!database || !currentUser || !profile) return
    const currentSeat = seats[index];
    
    if (currentSeat?.isLocked) {
      toast({ variant: "destructive", title: "Seat Locked", description: "This seat is reserved." })
      return
    }

    if (currentSeat?.userId) return // Occupied

    if (mySeatIndex !== null) {
      await remove(ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`))
    }

    await set(ref(database, `partyRooms/${roomId}/seats/${index}`), {
      userId: currentUser.uid,
      username: profile.username,
      photo: profile.profilePhotoUrls?.[0] || "",
      isMicOn: true,
      label: currentSeat?.label || ""
    })

    setMySeatIndex(index)
    setIsMicMuted(false)
    if (zpRef.current) zpRef.current.mutePublishStreamAudio(false)
  }

  const handleLeaveSeat = async () => {
    if (mySeatIndex === null || !database) return
    if (zpRef.current) zpRef.current.mutePublishStreamAudio(true)
    
    // We update the seat to preserve the label but remove the user
    const currentLabel = seats[mySeatIndex]?.label || ""
    if (currentLabel) {
      await set(ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`), {
        label: currentLabel
      })
    } else {
      await remove(ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`))
    }
    
    setMySeatIndex(null)
  }

  const toggleMic = () => {
    if (mySeatIndex === null || !zpRef.current) return
    const newState = !isMicMuted
    setIsMicMuted(newState)
    zpRef.current.mutePublishStreamAudio(newState)
    update(ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`), { isMicOn: !newState })
  }

  const handleSendMessage = () => {
    if (!chatInput.trim() || !currentUser || !profile) return
    const msgRef = push(ref(database, `partyRooms/${roomId}/messages`))
    set(msgRef, {
      text: chatInput,
      username: profile.username,
      userId: currentUser.uid,
      timestamp: Date.now()
    })
    setChatInput("")
  }

  const handleLabelSeat = async () => {
    if (labelingSeatIndex === null || !database) return
    const seatRef = ref(database, `partyRooms/${roomId}/seats/${labelingSeatIndex}`)
    await update(seatRef, { label: newSeatLabel })
    setLabelingSeatIndex(null)
    setNewSeatLabel("")
    toast({ title: "Seat Updated" })
  }

  const sortedParticipants = useMemo(() => {
    return [...roomUsers].sort((a, b) => {
      if (a.userId === room?.hostId) return -1
      if (b.userId === room?.hostId) return 1
      const aIsAdmin = room?.admins?.[a.userId]
      const bIsAdmin = room?.admins?.[b.userId]
      if (aIsAdmin && !bIsAdmin) return -1
      if (!aIsAdmin && bIsAdmin) return 1
      return 0
    })
  }, [roomUsers, room])

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
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black truncate max-w-[120px]">{room?.title}</h1>
              {room?.isLocked && <Lock className="w-3 h-3 text-amber-400" />}
            </div>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Host: {room?.hostName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-full border border-white/10 active:scale-95 transition-all">
                <Users className="w-3.5 h-3.5 text-white/60" />
                <span className="text-[10px] font-black">{roomUsers.length}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-zinc-900 border-none text-white p-0 w-80">
              <SheetHeader className="p-6 border-b border-white/5">
                <SheetTitle className="text-white font-black text-sm uppercase tracking-widest">Participants</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col overflow-y-auto p-4 gap-3">
                {sortedParticipants.map(u => (
                  <div key={u.userId} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.photo} className="object-cover" />
                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{u.username}</span>
                        {u.userId === room?.hostId ? (
                          <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Room Host</span>
                        ) : room?.admins?.[u.userId] ? (
                          <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Room Admin</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Stage (Fixed Top Half) */}
      <main className="flex-1 relative z-10 flex flex-col items-center overflow-hidden">
        {/* Seats Container (Top 50%) */}
        <div className="w-full h-1/2 flex flex-col items-center justify-center p-4 space-y-8 overflow-y-auto">
          {/* Host Seat */}
          <div className="flex justify-center relative">
            <div className="absolute -top-6 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-200 rounded-full z-20 shadow-lg">
               <span className="text-[8px] font-black text-zinc-900 uppercase">HOST</span>
            </div>
            <div 
              onClick={() => handleMountSeat(0)}
              className={cn(
                "w-20 h-20 rounded-full border-4 flex items-center justify-center relative transition-all duration-500 cursor-pointer shadow-2xl overflow-visible",
                seats[0]?.userId ? "border-amber-400 ring-4 ring-amber-400/20" : "border-white/10 bg-black/40",
                speakers[seats[0]?.userId] && "after:absolute after:inset-[-8px] after:rounded-full after:border-2 after:border-amber-400/40 after:animate-ping"
              )}
            >
              {seats[0]?.userId ? (
                <Avatar className="w-full h-full">
                  <AvatarImage src={seats[0].photo} className="object-cover" />
                  <AvatarFallback className="text-xl font-black">{seats[0].username?.[0]}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-white/20 uppercase">Stage</span>
                </div>
              )}
            </div>
          </div>

          {/* Member Seats (Rows of 5) */}
          <div className="grid grid-cols-5 gap-y-8 gap-x-3 w-full max-w-lg px-4">
            {Array.from({ length: room?.maxSeats || 8 }).map((_, i) => {
              const index = i + 1;
              const occupant = seats[index];
              const isLocked = occupant?.isLocked === true;
              const isSpeaking = speakers[occupant?.userId];
              const label = occupant?.label || "";
              
              return (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div 
                    onClick={() => {
                      if (isAdmin && !occupant?.userId) {
                        setLabelingSeatIndex(index);
                        setNewSeatLabel(occupant?.label || "");
                      } else {
                        handleMountSeat(index);
                      }
                    }}
                    className={cn(
                      "w-12 h-12 rounded-full border-2 flex items-center justify-center relative transition-all cursor-pointer overflow-visible",
                      occupant?.userId ? "border-primary shadow-lg" : isLocked ? "border-amber-500/50 bg-amber-500/10" : "border-white/5 bg-black/30",
                      isSpeaking && "after:absolute after:inset-[-4px] after:rounded-full after:border-2 after:border-primary/60 after:animate-ping"
                    )}
                  >
                    {occupant?.userId ? (
                      <Avatar className="w-full h-full">
                        <AvatarImage src={occupant.photo} className="object-cover" />
                        <AvatarFallback className="text-xs font-black">{occupant.username?.[0]}</AvatarFallback>
                      </Avatar>
                    ) : isLocked ? (
                      <Lock className="w-4 h-4 text-amber-500" />
                    ) : (
                      <span className="text-[10px] font-black text-white/10">{index}</span>
                    )}
                    
                    {occupant?.isMicOn && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0a1a1a] shadow-sm">
                        <Mic className="w-2 h-2 text-white" />
                      </div>
                    )}

                    {/* Seat Label */}
                    {label && (
                      <div className="absolute -bottom-1.5 px-2 py-0.5 bg-amber-500 rounded-md text-zinc-900 text-[6px] font-black uppercase shadow-md truncate max-w-full">
                        {label}
                      </div>
                    )}
                  </div>
                  <span className={cn("text-[7px] font-black uppercase tracking-tighter truncate w-full text-center", occupant?.userId ? "text-white" : "text-white/20")}>
                    {occupant?.userId ? occupant.username : "Mount"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chat Area (Bottom 50%) */}
        <div className="w-full h-1/2 flex flex-col bg-black/10 backdrop-blur-sm border-t border-white/5 p-4 pb-24">
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-1">
                {!m.isSystem && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-white/40">{m.username}</span>
                  </div>
                )}
                <div className={cn("self-start max-w-[85%] rounded-2xl rounded-tl-none px-4 py-2.5 shadow-md", m.isSystem ? "bg-white/5 border border-white/5" : "bg-white/10 backdrop-blur-md")}>
                  <p className={cn("text-[12px] font-medium leading-relaxed", m.isSystem ? "text-white/30 italic" : "text-white/90")}>{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={scrollRef} className="h-4" />
          </div>
        </div>
      </main>

      {/* Interaction Footer */}
      <footer className="absolute bottom-0 inset-x-0 z-30 px-4 py-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between gap-3">
        <div className="flex-1 relative flex items-center">
          <Input 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
            placeholder="Type here..." 
            className="h-12 w-full rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-white pl-6 pr-12 text-sm focus-visible:ring-primary/30" 
          />
          <button onClick={handleSendMessage} className="absolute right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>

        {mySeatIndex !== null && (
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMic} 
              className={cn(
                "w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-all", 
                isMicMuted ? "bg-red-500" : "bg-primary"
              )}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleLeaveSeat} 
              className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center active:scale-90 transition-all"
            >
              <LogOut className="w-5 h-5 text-white/60" />
            </button>
          </div>
        )}
      </footer>

      {/* Seat Labeling Dialog */}
      <Dialog open={labelingSeatIndex !== null} onOpenChange={(open) => !open && setLabelingSeatIndex(null)}>
        <DialogContent className="rounded-[2.5rem] bg-zinc-900 border-none text-white max-w-[85%] mx-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline font-black text-center text-xl uppercase tracking-widest">Label Seat {labelingSeatIndex}</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">New Label Name</label>
              <Input 
                placeholder="e.g., VIP, Queen, Co-Host" 
                value={newSeatLabel} 
                onChange={(e) => setNewSeatLabel(e.target.value.slice(0, 10))}
                className="bg-white/5 border-white/10 h-14 rounded-2xl text-center font-bold"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button onClick={handleLabelSeat} className="h-14 rounded-full bg-primary font-black uppercase text-xs tracking-widest w-full gap-2">
              <Check className="w-4 h-4" />
              Apply Label
            </Button>
            <Button variant="ghost" onClick={() => setLabelingSeatIndex(null)} className="h-12 rounded-full text-white/40 font-black uppercase text-[10px]">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div ref={containerRef} className="hidden" />
    </div>
  )
}
