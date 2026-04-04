
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Loader2, 
  Users, 
  Mic,
  MicOff,
  Send,
  Lock,
  LogOut,
  PlusCircle,
  UserX,
  Music as MusicIcon,
  Play,
  Pause,
  Trash2,
  Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { ref, onValue, remove, update, set, push, runTransaction } from "firebase/database"
import { doc } from "firebase/firestore"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  const [isMicMuted, setIsMicMuted] = useState(true)
  const [roomUsers, setRoomUsers] = useState<any[]>([])
  const [chatInput, setChatInput] = useState("")
  const [speakers, setSpeakers] = useState<Record<string, boolean>>({})
  
  // Music State
  const [currentTrack, setCurrentTrack] = useState<{ name: string; url: string } | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const zpRef = useRef<any>(null)
  const isJoinedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser?.uid])
  const { data: profile } = useDoc(userProfileRef)

  const isHost = currentUser?.uid === room?.hostId
  const isAdmin = useMemo(() => isHost || profile?.isAssistant || profile?.isAdmin, [room?.hostId, profile?.isAssistant, profile?.isAdmin, isHost])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 1. Room Data & Seating Sync
  useEffect(() => {
    if (!database || !roomId || !currentUser || !profile) return
    
    const roomRef = ref(database, `partyRooms/${roomId}`)
    onValue(roomRef, (snap) => {
      const data = snap.val()
      if (data) {
        if (data.kickedUsers?.[currentUser.uid]) {
          toast({ variant: "destructive", title: "Kicked", description: "You have been removed from this room." })
          router.push('/party')
          return
        }
        setRoom(data)
      } else {
        router.push('/party')
      }
    })

    const seatsRef = ref(database, `partyRooms/${roomId}/seats`)
    onValue(seatsRef, (snap) => {
      const data = snap.val() || {}
      setSeats(data)
      const mySeat = Object.entries(data).find(([_, val]: [string, any]) => val.userId === currentUser.uid)
      if (mySeat) setMySeatIndex(Number(mySeat[0]))
      else setMySeatIndex(null)
    })

    const messagesRef = ref(database, `partyRooms/${roomId}/messages`)
    onValue(messagesRef, (snap) => {
      const data = snap.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        setMessages(list.slice(-50))
      }
    })

    // Presence Logic
    const participantRef = ref(database, `partyRooms/${roomId}/participants/${currentUser.uid}`)
    set(participantRef, {
      userId: currentUser.uid,
      username: profile.username,
      photo: profile.profilePhotoUrls?.[0] || "",
      joinedAt: Date.now()
    })

    // System Join Message
    const joinMsgRef = push(ref(database, `partyRooms/${roomId}/messages`))
    set(joinMsgRef, {
      text: `${profile.username} joined the party`,
      username: "System",
      isSystem: true,
      timestamp: Date.now()
    })

    onValue(ref(database, `partyRooms/${roomId}/participants`), (snap) => {
      const data = snap.val()
      if (data) setRoomUsers(Object.values(data))
      else setRoomUsers([])
    })

    return () => {
      if (currentUser) {
        remove(participantRef)
        // Cleanup seat if user leaves
        runTransaction(seatsRef, (currentSeats) => {
          if (!currentSeats) return currentSeats;
          Object.keys(currentSeats).forEach(key => {
            if (currentSeats[key].userId === currentUser.uid) {
              delete currentSeats[key];
            }
          });
          return currentSeats;
        });
      }
      if (zpRef.current) {
        zpRef.current.destroy()
        isJoinedRef.current = false
      }
    }
  }, [database, roomId, currentUser?.uid, !!profile])

  // 2. Audio Engine (Zego) - Optimized to join once
  useEffect(() => {
    if (!roomId || !currentUser || !profile || isJoinedRef.current || !room) return

    const initZego = async () => {
      try {
        isJoinedRef.current = true
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
      } catch (error) {
        isJoinedRef.current = false
        setIsInitializing(false)
      }
    }

    initZego()
  }, [roomId, currentUser?.uid, !!profile, !!room])

  const handleMountSeat = async (index: number) => {
    if (!database || !currentUser || !profile) return
    const currentSeat = seats[index]
    if (currentSeat?.userId) return 
    if (currentSeat?.isLocked && !isAdmin) {
      toast({ variant: "destructive", title: "Seat Locked" })
      return
    }

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

    setIsMicMuted(false)
    if (zpRef.current) zpRef.current.mutePublishStreamAudio(false)
  }

  const handleLeaveSeat = async () => {
    if (mySeatIndex === null || !database) return
    if (zpRef.current) zpRef.current.mutePublishStreamAudio(true)
    setIsMicMuted(true)
    setIsPlaying(false)
    if (audioRef.current) audioRef.current.pause()
    
    await remove(ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`))
    setMySeatIndex(null)
  }

  const toggleMic = () => {
    if (mySeatIndex === null || !zpRef.current) return
    const newState = !isMicMuted
    setIsMicMuted(newState)
    zpRef.current.mutePublishStreamAudio(newState)
    update(ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`), { isMicOn: !newState })
    
    if (newState && isPlaying) {
      setIsPlaying(false)
      if (audioRef.current) audioRef.current.pause()
    }
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

  const handleUpdateCapacity = async (count: number) => {
    if (!isHost || !database) return
    await update(ref(database, `partyRooms/${roomId}`), { maxSeats: count })
    toast({ title: "Capacity Updated", description: `Room now has ${count} seats.` })
  }

  const handleKickUser = async (targetId: string) => {
    if (!isAdmin || !database || targetId === currentUser?.uid) return
    const updates: any = {}
    updates[`partyRooms/${roomId}/kickedUsers/${targetId}`] = true
    updates[`partyRooms/${roomId}/participants/${targetId}`] = null
    Object.entries(seats).forEach(([idx, val]: [string, any]) => {
      if (val.userId === targetId) {
        updates[`partyRooms/${roomId}/seats/${idx}`] = null
      }
    })
    await update(ref(database), updates)
    toast({ title: "User Kicked" })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCurrentTrack({ name: file.name, url })
      setIsPlaying(false)
    }
  }

  const toggleMusic = () => {
    if (!currentTrack || !audioRef.current) return
    if (mySeatIndex === null || isMicMuted) {
      toast({ variant: "destructive", title: "Action Required", description: "You must be seated and unmuted to play music." })
      return
    }
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const sortedParticipants = useMemo(() => {
    return [...roomUsers].sort((a, b) => {
      if (a.userId === room?.hostId) return -1
      if (b.userId === room?.hostId) return 1
      return 0
    })
  }, [roomUsers, room?.hostId])

  return (
    <div className="flex flex-col h-svh bg-[#0a1a1a] text-white overflow-hidden relative font-body">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10" />
        <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80" className="w-full h-full object-cover opacity-40 blur-[2px]" alt="Aurora" />
      </div>

      <header className="relative z-20 px-4 py-6 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          {isHost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 px-4 rounded-full bg-primary/20 border border-primary/30 flex items-center gap-2 active:scale-95 transition-all">
                  <Settings className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Seats</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white rounded-2xl p-2 min-w-[140px]">
                {[5, 10, 15, 20].map(n => (
                  <DropdownMenuItem key={n} onClick={() => handleUpdateCapacity(n)} className="rounded-xl font-bold py-2.5">
                    {n} Seats
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-full border border-white/10">
                <Users className="w-3.5 h-3.5 text-white/60" />
                <span className="text-[10px] font-black">{roomUsers.length}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-zinc-900 border-none text-white p-0 w-80">
              <SheetHeader className="p-6 border-b border-white/5">
                <SheetTitle className="text-white font-black text-sm uppercase tracking-widest">Participants ({roomUsers.length}/100)</SheetTitle>
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
                        {u.userId === room?.hostId && <span className="text-[8px] font-black text-amber-400 uppercase">Host</span>}
                      </div>
                    </div>
                    {isAdmin && u.userId !== room?.hostId && u.userId !== currentUser?.uid && (
                      <Button variant="ghost" size="icon" onClick={() => handleKickUser(u.userId)} className="text-red-500 hover:bg-red-500/10">
                        <UserX className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex flex-col overflow-hidden">
        <div className="w-full h-1/2 flex flex-col items-center justify-center p-4 space-y-6">
          <div className="flex justify-center relative">
            <div 
              onClick={() => handleMountSeat(0)}
              className={cn(
                "w-20 h-20 rounded-full border-4 flex items-center justify-center relative transition-all duration-500 cursor-pointer shadow-2xl",
                seats[0]?.userId ? "border-amber-400 ring-4 ring-amber-400/20" : "border-white/10 bg-black/40",
                speakers[seats[0]?.userId] && "after:absolute after:inset-[-8px] after:rounded-full after:border-2 after:border-amber-400/40 after:animate-ping"
              )}
            >
              {seats[0]?.userId ? (
                <Avatar className="w-full h-full"><AvatarImage src={seats[0].photo} className="object-cover" /><AvatarFallback>{seats[0].username?.[0]}</AvatarFallback></Avatar>
              ) : (
                <span className="text-[8px] font-black text-white/20 uppercase">Host</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-y-6 gap-x-2 w-full max-w-lg px-4 overflow-y-auto">
            {Array.from({ length: (room?.maxSeats || 8) - 1 }).map((_, i) => {
              const index = i + 1; const occupant = seats[index]; const isSpeaking = speakers[occupant?.userId];
              return (
                <div key={index} className="flex flex-col items-center gap-1.5">
                  <div 
                    onClick={() => handleMountSeat(index)} 
                    className={cn(
                      "w-12 h-12 rounded-full border-2 flex items-center justify-center relative transition-all cursor-pointer", 
                      occupant?.userId ? "border-primary shadow-lg" : occupant?.isLocked ? "border-amber-500/50 bg-amber-500/10" : "border-white/5 bg-black/30",
                      isSpeaking && "after:absolute after:inset-[-4px] after:rounded-full after:border-2 after:border-primary/60 after:animate-ping"
                    )}
                  >
                    {occupant?.userId ? (
                      <Avatar className="w-full h-full"><AvatarImage src={occupant.photo} className="object-cover" /><AvatarFallback>{occupant.username?.[0]}</AvatarFallback></Avatar>
                    ) : occupant?.isLocked ? (
                      <Lock className="w-4 h-4 text-amber-500" />
                    ) : (
                      <span className="text-[10px] font-black text-white/10">{index}</span>
                    )}
                    {occupant?.isMicOn && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0a1a1a]"><Mic className="w-2.5 h-2.5 text-white" /></div>}
                  </div>
                  <span className="text-[7px] font-black uppercase text-center truncate w-full opacity-40">
                    {occupant?.userId ? occupant.username : "Mount"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="w-full h-1/2 flex flex-col bg-black/10 backdrop-blur-sm border-t border-white/5 p-4 pb-24">
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 scroll-smooth">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col animate-in fade-in slide-in-from-bottom-1", m.isSystem ? "items-center" : "items-start")}>
                {!m.isSystem && <span className="text-[9px] font-black text-white/30 ml-2 mb-1">{m.username}</span>}
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-md",
                  m.isSystem ? "bg-teal-500/10 border border-teal-500/20 text-teal-400 italic text-[10px]" : "bg-white/10 backdrop-blur-md text-white/90 text-xs leading-relaxed"
                )}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </main>

      <footer className="absolute bottom-0 inset-x-0 z-30 px-4 py-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center gap-3">
        <div className="flex-1 relative flex items-center">
          <Input 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
            placeholder="Type here..." 
            className="h-12 w-full rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-white pl-6 pr-12 text-sm focus-visible:ring-primary/30" 
          />
          <button onClick={handleSendMessage} className="absolute right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center active:scale-90"><Send className="w-4 h-4 text-white" /></button>
        </div>

        <div className="flex items-center gap-2">
          {mySeatIndex !== null && (
            <>
              <button onClick={toggleMic} className={cn("w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all", isMicMuted ? "bg-red-500" : "bg-primary")}>
                {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <Sheet>
                <SheetTrigger asChild>
                  <button className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                    <MusicIcon className="w-5 h-5 text-white/60" />
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-[2.5rem] bg-zinc-900 border-none p-8 h-[40svh] text-white">
                  <SheetHeader>
                    <SheetTitle className="text-white font-black uppercase text-xs tracking-widest text-center">Room Music</SheetTitle>
                  </SheetHeader>
                  <div className="py-8 flex flex-col items-center gap-6">
                    {currentTrack ? (
                      <div className="w-full space-y-4">
                        <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                          <div className="flex-1 truncate mr-4">
                            <p className="text-xs font-bold truncate">{currentTrack.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">Now Playing</p>
                          </div>
                          <button onClick={toggleMusic} className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                          </button>
                        </div>
                        <Button variant="ghost" onClick={() => setCurrentTrack(null)} className="w-full text-red-500 gap-2 font-black uppercase text-[10px]">
                          <Trash2 className="w-4 h-4" /> Stop Music
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <p className="text-sm text-zinc-400">Select an audio file from your device to play for the room.</p>
                        <Button onClick={() => fileInputRef.current?.click()} className="h-14 rounded-full bg-white text-zinc-900 font-black uppercase text-xs tracking-widest px-10 shadow-xl">
                          Select File
                        </Button>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileSelect} />
                    <audio ref={audioRef} src={currentTrack?.url} className="hidden" onEnded={() => setIsPlaying(false)} />
                  </div>
                </SheetContent>
              </Sheet>

              <button onClick={handleLeaveSeat} className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-white/60" />
              </button>
            </>
          )}
        </div>
      </footer>

      <div ref={containerRef} className="hidden" />
    </div>
  )
}
