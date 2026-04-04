
"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  LogOut, 
  Loader2, 
  Users, 
  Crown, 
  Heart, 
  ShoppingBag, 
  Maximize2, 
  MoreHorizontal, 
  Send, 
  Smile, 
  Gift, 
  Gamepad2, 
  MessageSquare, 
  LayoutGrid,
  Trash2,
  CheckCircle,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { ref, onValue, update, runTransaction as runRtdbTransaction, off, remove, set, onDisconnect } from "firebase/database"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getZegoConfig } from "@/app/actions/zego"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

let ZegoExpressEngine: any = null;

export default function PartyRoomPage() {
  const params = useParams()
  const roomId = params?.id as string
  const router = useRouter()
  const { user: currentUser, isUserLoading } = useUser()
  const { database, firestore } = useFirebase()
  const { toast } = useToast()

  const [room, setRoom] = useState<any>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isMicOn, setIsMicOn] = useState(false)
  const [engineLoaded, setEngineLoaded] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [seats, setSeats] = useState<Record<string, any>>({})
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null)
  
  const [messages, setMessages] = useState<any[]>([
    { id: 'system-1', sender: 'System', text: 'Welcome to MatchFlow! Please respect others and chat politely.', type: 'system' }
  ])

  const zegoEngineRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const hasIncrementedRef = useRef(false)
  const roomLoadedRef = useRef(false)
  const initStartedRef = useRef(false)

  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(userProfileRef)

  // Listen to room data
  useEffect(() => {
    if (!database || !roomId) return
    const roomRef = ref(database, `partyRooms/${roomId}`)
    
    const unsubscribe = onValue(roomRef, (snap) => {
      const data = snap.val()
      if (data) {
        setRoom(data)
        setSeats(data.seats || {})
        roomLoadedRef.current = true
      } else if (roomLoadedRef.current) {
        toast({ title: "Room Closed", description: "The host has closed this room." })
        router.push('/party')
      }
    })

    return () => {
      off(roomRef, "value", unsubscribe)
    }
  }, [database, roomId, router, toast])

  // Listen to participants
  useEffect(() => {
    if (!database || !roomId) return
    const participantsRef = ref(database, `partyRooms/${roomId}/participants`)
    return onValue(participantsRef, (snap) => {
      const data = snap.val()
      if (data) {
        setParticipants(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })))
      } else {
        setParticipants([])
      }
    })
  }, [database, roomId])

  // Track my seat index locally for UI speed
  useEffect(() => {
    if (!currentUser) return
    const index = Object.entries(seats).find(([_, seat]) => seat.userId === currentUser.uid)?.[0]
    setMySeatIndex(index ? parseInt(index) : null)
  }, [seats, currentUser])

  useEffect(() => {
    if (typeof window !== "undefined" && !engineLoaded) {
      import('zego-express-engine-webrtc').then((module) => {
        ZegoExpressEngine = module.ZegoExpressEngine;
        setEngineLoaded(true)
      });
    }
  }, []);

  useEffect(() => {
    if (engineLoaded && currentUser && roomId && profile && !isJoined && !initStartedRef.current) {
      initZego();
    }
  }, [engineLoaded, !!currentUser, roomId, isJoined, !!profile]);

  const initZego = async () => {
    if (!currentUser || !roomId || !ZegoExpressEngine || !profile || initStartedRef.current) return;
    initStartedRef.current = true;

    try {
      const config = await getZegoConfig();
      const zg = new ZegoExpressEngine(config.appID, config.server);
      zegoEngineRef.current = zg;

      zg.on('roomStreamUpdate', async (roomID: string, updateType: string, streamList: any[]) => {
        if (updateType === 'ADD') {
          streamList.forEach(stream => {
            setRemoteUsers(prev => {
              if (prev.find(u => u.streamID === stream.streamID)) return prev;
              return [...prev, { streamID: stream.streamID, userId: stream.user.userID, userName: stream.user.userName }];
            });
            zg.startPlayingStream(stream.streamID).then((remoteStream: MediaStream) => {
              const audio = new Audio();
              audio.srcObject = remoteStream;
              audio.play().catch(e => console.warn("Autoplay audio blocked", e));
            });
          });
        } else if (updateType === 'DELETE') {
          streamList.forEach(stream => {
            zg.stopPlayingStream(stream.streamID);
            setRemoteUsers(prev => prev.filter(u => u.streamID !== stream.streamID));
          });
        }
      });

      await zg.loginRoom(roomId, currentUser.uid, { userName: profile.username || 'User' }, { userUpdate: true });
      
      // ENTER AS LISTENER: No local stream created here anymore to avoid "Join Failed" hardware errors on entry.
      setIsJoined(true);
      setIsConnecting(false);

      if (database) {
        // Add self to participants list
        const myPartRef = ref(database, `partyRooms/${roomId}/participants/${currentUser.uid}`);
        set(myPartRef, {
          username: profile.username,
          photo: profile.profilePhotoUrls?.[0] || "",
          joinedAt: Date.now()
        });
        onDisconnect(myPartRef).remove();

        if (!hasIncrementedRef.current) {
          const countRef = ref(database, `partyRooms/${roomId}/memberCount`)
          runRtdbTransaction(countRef, (current) => (current || 0) + 1)
          hasIncrementedRef.current = true
        }
      }

    } catch (error: any) {
      console.error("Zego Join Error:", error);
      toast({ variant: "destructive", title: "Connection Error", description: error.message });
      setIsConnecting(false);
      router.back();
    }
  }

  const handleTakeSeat = async (index: number) => {
    if (!currentUser || !profile || !isJoined || !zegoEngineRef.current || !database) return
    if (mySeatIndex !== null) {
      toast({ title: "Already seated", description: "Please leave your current seat first." })
      return
    }

    try {
      // 1. Get Hardware Access (User Gesture context)
      const zg = zegoEngineRef.current;
      const localStream = await zg.createStream({ camera: { audio: true, video: false } });
      localStreamRef.current = localStream;
      
      // 2. Publish to Room
      zg.startPublishingStream(`stream_${currentUser.uid}`, localStream);
      setIsMicOn(true);

      // 3. Update RTDB Seat
      const seatRef = ref(database, `partyRooms/${roomId}/seats/${index}`);
      await set(seatRef, {
        userId: currentUser.uid,
        username: profile.username,
        photo: profile.profilePhotoUrls?.[0] || ""
      });
      onDisconnect(seatRef).remove();

      toast({ title: "Mounted Seat", description: "You are now on the mic!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Mic Error", description: "Please allow microphone access to speak." });
    }
  }

  const handleLeaveSeat = async () => {
    if (!currentUser || !database || mySeatIndex === null || !zegoEngineRef.current) return

    try {
      const zg = zegoEngineRef.current;
      if (localStreamRef.current) {
        zg.stopPublishingStream(`stream_${currentUser.uid}`);
        zg.destroyStream(localStreamRef.current);
        localStreamRef.current = null;
      }
      setIsMicOn(false);

      const seatRef = ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`);
      await remove(seatRef);
      
      toast({ title: "Unmounted", description: "You are now just listening." });
    } catch (e) {}
  }

  const toggleMic = () => {
    if (!zegoEngineRef.current || !localStreamRef.current) return;
    const zg = zegoEngineRef.current;
    if (isMicOn) {
      zg.mutePublishStreamAudio(localStreamRef.current, true);
    } else {
      zg.mutePublishStreamAudio(localStreamRef.current, false);
    }
    setIsMicOn(!isMicOn);
  }

  const handleLeave = async () => {
    if (mySeatIndex !== null) await handleLeaveSeat();

    if (zegoEngineRef.current) {
      try { zegoEngineRef.current.logoutRoom(roomId); } catch (e) {}
    }
    
    if (database && currentUser) {
      remove(ref(database, `partyRooms/${roomId}/participants/${currentUser.uid}`));
      if (hasIncrementedRef.current) {
        const countRef = ref(database, `partyRooms/${roomId}/memberCount`)
        runRtdbTransaction(countRef, (current) => Math.max(0, (current || 1) - 1))
        hasIncrementedRef.current = false
      }
    }
    
    router.push('/party');
  }

  const handleDeleteRoom = async () => {
    if (!database || !roomId || !currentUser || room.hostId !== currentUser.uid) return
    try {
      if (zegoEngineRef.current) {
        if (localStreamRef.current) {
          zegoEngineRef.current.stopPublishingStream(`stream_${currentUser.uid}`);
          zegoEngineRef.current.destroyStream(localStreamRef.current);
        }
        zegoEngineRef.current.logoutRoom(roomId);
      }
      await remove(ref(database, `partyRooms/${roomId}`))
      toast({ title: "Room Deleted", description: "Party closed permanently." })
      router.replace('/party')
    } catch (error) {
      toast({ variant: "destructive", title: "Delete Failed", description: "Could not close the room." })
    }
  }

  if (!room || isConnecting || isUserLoading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-svh bg-zinc-950 text-white space-y-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-[2.25rem] bg-primary/20 border-2 border-primary/40 flex items-center justify-center animate-pulse">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <Loader2 className="absolute -bottom-2 -right-2 w-8 h-8 text-primary animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black font-headline uppercase tracking-widest">Joining Party</h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Securing Connection...</p>
        </div>
      </div>
    )
  }

  const isHost = currentUser && room.hostId === currentUser.uid
  const seatIndices = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-svh bg-zinc-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://picsum.photos/seed/nightsky/1080/1920" 
          alt="Room Background" 
          className="w-full h-full object-cover opacity-40 blur-[2px]"
          data-ai-hint="night aurora"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      <header className="relative z-10 px-4 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md px-3 py-2 rounded-full border border-white/10 max-w-[60%]">
          <Avatar className="w-8 h-8 border-2 border-white/20">
            <AvatarImage src={room.hostPhoto} className="object-cover" />
            <AvatarFallback>{room.hostName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs font-black truncate">{room.title}</h1>
            <span className="text-[8px] font-bold text-white/60 tracking-wider">ID: {room.id.slice(-8)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-2 rounded-full border border-white/10 active:bg-white/10 transition-colors">
                <Users className="w-3.5 h-3.5 text-white/60" />
                <span className="text-[10px] font-black">{participants.length}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[3rem] h-[60svh] bg-zinc-900 border-none p-0 text-white overflow-hidden flex flex-col">
              <SheetHeader className="p-8 pb-4 shrink-0">
                <SheetTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">Members in Room ({participants.length})</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 px-6 pb-10">
                <div className="space-y-4">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-10 h-10 border border-white/10">
                          <AvatarImage src={p.photo} className="object-cover" />
                          <AvatarFallback className="bg-zinc-800 text-xs">{p.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{p.username}</span>
                          {p.id === room.hostId && <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Room Host</span>}
                        </div>
                      </div>
                      {Object.values(seats).find(s => s.userId === p.id) ? (
                        <Mic className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-zinc-700" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          
          {isHost && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-9 h-9 flex items-center justify-center bg-red-500/20 backdrop-blur-md rounded-full border border-red-500/20 text-red-400 active:scale-90 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2.5rem] bg-zinc-900 border border-white/10 text-white max-w-[85%] mx-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black font-headline text-center">Close Room?</AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400 text-center font-medium text-xs leading-relaxed">
                    This will permanently delete this party room and disconnect all participants.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col gap-2 mt-6">
                  <AlertDialogAction onClick={handleDeleteRoom} className="rounded-full h-14 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest w-full">
                    Confirm & Delete
                  </AlertDialogAction>
                  <AlertDialogCancel className="rounded-full h-14 border-white/10 bg-zinc-800 text-zinc-400 font-black text-xs uppercase tracking-widest w-full hover:bg-zinc-700">
                    Cancel
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <button onClick={handleLeave} className="w-9 h-9 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full border border-white/10 active:scale-90 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <ScrollArea className="flex-1 relative z-10 px-4 pt-4">
        <div className="flex flex-col gap-8 pb-40">
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative group">
                <div className="absolute -inset-1 bg-amber-500/20 rounded-full blur-md" />
                <div className="w-20 h-20 rounded-full border-2 border-amber-500/50 bg-black/40 flex items-center justify-center relative overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={room.hostPhoto} className="object-cover" />
                    <AvatarFallback className="text-2xl font-black">{room.hostName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent" />
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-[8px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest text-zinc-950 border border-white/20">
                  Host
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">{room.hostName}</span>
            </div>

            <div className="grid grid-cols-4 gap-x-6 gap-y-8 w-full max-w-sm px-2">
              {seatIndices.map((idx) => {
                const seatedUser = seats[idx.toString()];
                const isMeOnThisSeat = seatedUser && seatedUser.userId === currentUser?.uid;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div 
                      onClick={() => !seatedUser ? handleTakeSeat(idx) : isMeOnThisSeat ? handleLeaveSeat() : null}
                      className={cn(
                        "relative cursor-pointer active:scale-95 transition-all group",
                        isMeOnThisSeat && "ring-2 ring-primary ring-offset-2 ring-offset-zinc-950 rounded-full"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-full border border-white/10 bg-black/30 flex items-center justify-center overflow-hidden",
                        seatedUser ? "border-primary/40" : "hover:bg-white/5"
                      )}>
                        {seatedUser ? (
                          <Avatar className="w-full h-full">
                            <AvatarImage src={seatedUser.photo} className="object-cover" />
                            <AvatarFallback className="bg-zinc-800 text-xs font-black">{seatedUser.username?.[0]}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="bg-white/5 w-full h-full flex items-center justify-center">
                            <LayoutGrid className="w-5 h-5 opacity-20 group-hover:opacity-40 transition-opacity" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white/10 text-[7px] font-black px-2 py-0.5 rounded-full uppercase border border-white/5">
                        {idx}
                      </div>
                      {seatedUser && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-zinc-950">
                          <Mic className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold truncate w-14 text-center",
                      seatedUser ? "text-white" : "text-white/40"
                    )}>
                      {seatedUser ? seatedUser.username : 'Mount'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col items-start gap-1 max-w-[85%]">
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm",
                  msg.type === 'system' ? "bg-purple-500/20 text-purple-200 border border-purple-500/30" : "bg-black/30 backdrop-blur-md text-white border border-white/5"
                )}>
                  {msg.sender !== 'System' && <span className="font-black text-amber-400 mr-2">{msg.sender}:</span>}
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      <footer className="relative z-20 px-4 py-6 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent flex items-center gap-3">
        <div className="flex-1 h-12 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 flex items-center px-4 gap-3 active:bg-white/20 transition-all cursor-text">
          <MessageSquare className="w-4 h-4 text-white/40" />
          <span className="text-[13px] font-medium text-white/40">Say something...</span>
          <Smile className="w-5 h-5 text-white/60 ml-auto" />
        </div>

        <div className="flex items-center gap-2">
          {mySeatIndex !== null && (
            <button 
              onClick={toggleMic}
              className={cn(
                "w-12 h-12 rounded-full border flex items-center justify-center active:scale-90 transition-all shadow-xl",
                isMicOn ? "bg-primary border-primary/40 text-white" : "bg-red-500 border-red-400 text-white"
              )}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          )}
          <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90 transition-all">
            <Gift className="w-5 h-5 text-amber-400" />
          </button>
          <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90 transition-all">
            <LayoutGrid className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </footer>
    </div>
  )
}
