
"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Mic, 
  MicOff, 
  LogOut, 
  Loader2, 
  Users, 
  Crown, 
  Send, 
  Smile, 
  Gift, 
  LayoutGrid,
  Trash2,
  CheckCircle,
  X,
  MessageSquare
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

/**
 * @fileOverview Party Room implementation.
 * Uses the app's standard Pale Maroon design system.
 */

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
  const [participants, setParticipants] = useState<any[]>([])
  const [seats, setSeats] = useState<Record<string, any>>({})
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null)
  
  const [messages] = useState<any[]>([
    { id: 'system-1', sender: 'System', text: 'Welcome to MatchFlow! Respect others and stay safe.', type: 'system' }
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
        toast({ title: "Room Closed", description: "This party has ended." })
        router.push('/party')
      }
    })

    return () => off(roomRef, "value", unsubscribe)
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

  // Track my seat index
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
            zg.startPlayingStream(stream.streamID).then((remoteStream: MediaStream) => {
              const audio = new Audio();
              audio.srcObject = remoteStream;
              audio.play().catch(() => {});
            });
          });
        } else if (updateType === 'DELETE') {
          streamList.forEach(stream => zg.stopPlayingStream(stream.streamID));
        }
      });

      await zg.loginRoom(roomId, currentUser.uid, { userName: profile.username || 'User' }, { userUpdate: true });
      
      setIsJoined(true);
      setIsConnecting(false);

      if (database) {
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
      console.error("Zego Error:", error);
      setIsConnecting(false);
      initStartedRef.current = false;
      toast({ variant: "destructive", title: "Join Failed", description: "Audio service unavailable." });
      router.back();
    }
  }

  const handleTakeSeat = async (index: number) => {
    if (!currentUser || !profile || !isJoined || !zegoEngineRef.current || !database) return
    if (mySeatIndex !== null) return

    try {
      const zg = zegoEngineRef.current;
      const localStream = await zg.createStream({ camera: { audio: true, video: false } });
      localStreamRef.current = localStream;
      
      zg.startPublishingStream(`stream_${currentUser.uid}`, localStream);
      setIsMicOn(true);

      const seatRef = ref(database, `partyRooms/${roomId}/seats/${index}`);
      await set(seatRef, {
        userId: currentUser.uid,
        username: profile.username,
        photo: profile.profilePhotoUrls?.[0] || ""
      });
      onDisconnect(seatRef).remove();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Microphone Required", description: "Please allow mic access to sit." });
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
      await remove(ref(database, `partyRooms/${roomId}/seats/${mySeatIndex}`));
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
    if (zegoEngineRef.current) zegoEngineRef.current.logoutRoom(roomId);
    
    if (database && currentUser) {
      remove(ref(database, `partyRooms/${roomId}/participants/${currentUser.uid}`));
      if (hasIncrementedRef.current) {
        const countRef = ref(database, `partyRooms/${roomId}/memberCount`)
        runRtdbTransaction(countRef, (current) => Math.max(0, (current || 1) - 1))
      }
    }
    router.push('/party');
  }

  const handleDeleteRoom = async () => {
    if (!database || !roomId || !room || room.hostId !== currentUser?.uid) return
    try {
      if (zegoEngineRef.current) zegoEngineRef.current.logoutRoom(roomId);
      await remove(ref(database, `partyRooms/${roomId}`))
      router.replace('/party')
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not close room." })
    }
  }

  if (isConnecting || !room || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-svh bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase text-gray-400 mt-4 tracking-widest">Connecting to Party...</p>
      </div>
    )
  }

  const isHost = currentUser && room.hostId === currentUser.uid
  const seatIndices = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-svh bg-transparent overflow-hidden relative">
      <header className="px-4 pt-12 pb-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/40 max-w-[60%] shadow-sm">
          <Avatar className="w-8 h-8">
            <AvatarImage src={room.hostPhoto} className="object-cover" />
            <AvatarFallback>{room.hostName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs font-black truncate text-gray-900">{room.title}</h1>
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Host: {room.hostName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-1.5 bg-white/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/40 shadow-sm active:bg-white/60">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-black text-gray-900">{participants.length}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[3rem] h-[60svh] bg-white border-none p-0 overflow-hidden flex flex-col">
              <SheetHeader className="p-8 pb-4 shrink-0">
                <SheetTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Members in Room ({participants.length})</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 px-6 pb-10">
                <div className="space-y-3">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={p.photo} className="object-cover" />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">{p.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{p.username}</span>
                          {p.id === room.hostId && <span className="text-[8px] font-black text-primary uppercase tracking-widest">Party Host</span>}
                        </div>
                      </div>
                      {Object.values(seats).find(s => s.userId === p.id) && <Mic className="w-4 h-4 text-green-500" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          
          {isHost && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-9 h-9 flex items-center justify-center bg-red-500/10 backdrop-blur-md rounded-full border border-red-500/20 text-red-500 active:scale-90 transition-all shadow-sm">
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2.5rem] bg-white border-none text-gray-900 max-w-[85%] mx-auto shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black font-headline text-center">Close Room?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-500 text-center font-medium text-xs leading-relaxed">
                    This will permanently delete this party and disconnect everyone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col gap-2 mt-6">
                  <AlertDialogAction onClick={handleDeleteRoom} className="rounded-full h-14 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest w-full">Delete Room</AlertDialogAction>
                  <AlertDialogCancel className="rounded-full h-14 border-none bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-widest w-full">Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <button onClick={handleLeave} className="w-9 h-9 flex items-center justify-center bg-white/40 backdrop-blur-md rounded-full border border-white/40 text-gray-500 active:scale-90 transition-all shadow-sm">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4 pt-4">
        <div className="flex flex-col gap-10 pb-40">
          <div className="flex flex-col items-center gap-8 mt-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-[2.5rem] bg-white/60 backdrop-blur-xl border-4 border-white flex items-center justify-center shadow-xl overflow-hidden relative">
                <Avatar className="w-full h-full">
                  <AvatarImage src={room.hostPhoto} className="object-cover" />
                  <AvatarFallback className="text-2xl font-black">{room.hostName?.[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-[8px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest text-white border-2 border-white shadow-sm">Host</div>
              <span className="text-[10px] font-black uppercase text-primary tracking-widest mt-4 block text-center">{room.hostName}</span>
            </div>

            <div className="grid grid-cols-4 gap-x-6 gap-y-10 w-full max-w-sm px-4">
              {seatIndices.map((idx) => {
                const seatedUser = seats[idx.toString()];
                const isMeOnThisSeat = seatedUser && seatedUser.userId === currentUser?.uid;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div 
                      onClick={() => !seatedUser ? handleTakeSeat(idx) : isMeOnThisSeat ? handleLeaveSeat() : null}
                      className={cn(
                        "relative cursor-pointer active:scale-95 transition-all group",
                        isMeOnThisSeat && "ring-2 ring-primary ring-offset-4 ring-offset-transparent rounded-full"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl border-2 bg-white/40 flex items-center justify-center overflow-hidden shadow-sm",
                        seatedUser ? "border-primary/20" : "border-white/60 border-dashed"
                      )}>
                        {seatedUser ? (
                          <Avatar className="w-full h-full">
                            <AvatarImage src={seatedUser.photo} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">{seatedUser.username?.[0]}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="bg-white/20 w-full h-full flex items-center justify-center">
                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">Seat {idx}</span>
                          </div>
                        )}
                      </div>
                      {seatedUser && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white shadow-sm">
                          <Mic className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold truncate w-14 text-center uppercase tracking-tight",
                      seatedUser ? "text-gray-900" : "text-gray-300"
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
                  "px-4 py-2.5 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm",
                  msg.type === 'system' ? "bg-primary/5 text-primary border border-primary/10 italic" : "bg-white/60 border border-white/40 text-gray-900"
                )}>
                  {msg.sender !== 'System' && <span className="font-black mr-2">{msg.sender}:</span>}
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      <footer className="px-4 py-6 bg-white/20 backdrop-blur-xl border-t border-white/40 flex items-center gap-3">
        <div className="flex-1 h-12 bg-white/60 rounded-full border border-white/60 flex items-center px-4 gap-3 active:bg-white shadow-sm cursor-text">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span className="text-[13px] font-medium text-gray-400">Say something...</span>
          <Smile className="w-5 h-5 text-gray-400 ml-auto" />
        </div>

        <div className="flex items-center gap-2">
          {mySeatIndex !== null && (
            <button 
              onClick={toggleMic}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg",
                isMicOn ? "bg-primary text-white" : "bg-red-500 text-white"
              )}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          )}
          <button className="w-12 h-12 rounded-full bg-white/60 border border-white/60 flex items-center justify-center active:scale-90 transition-all shadow-sm">
            <Gift className="w-5 h-5 text-amber-500" />
          </button>
        </div>
      </footer>
    </div>
  )
}
