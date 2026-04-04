
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
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, update, runTransaction as runRtdbTransaction, off, remove } from "firebase/database"
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

let ZegoExpressEngine: any = null;

export default function PartyRoomPage() {
  const params = useParams()
  const roomId = params?.id as string
  const router = useRouter()
  const { user: currentUser, isUserLoading } = useUser()
  const { database } = useFirebase()
  const { toast } = useToast()

  const [room, setRoom] = useState<any>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [engineLoaded, setEngineLoaded] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([
    { id: 'system-1', sender: 'System', text: 'Welcome to MatchFlow! Please respect others and chat politely. Let\'s have fun together!', type: 'system' }
  ])

  const zegoEngineRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const hasIncrementedRef = useRef(false)
  const roomLoadedRef = useRef(false)
  const initStartedRef = useRef(false)

  useEffect(() => {
    if (!database || !roomId) return
    const roomRef = ref(database, `partyRooms/${roomId}`)
    
    const unsubscribe = onValue(roomRef, (snap) => {
      const data = snap.val()
      if (data) {
        setRoom(data)
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

  useEffect(() => {
    if (typeof window !== "undefined" && !engineLoaded) {
      import('zego-express-engine-webrtc').then((module) => {
        ZegoExpressEngine = module.ZegoExpressEngine;
        setEngineLoaded(true)
      });
    }
  }, []);

  useEffect(() => {
    if (engineLoaded && currentUser && roomId && !isJoined && !initStartedRef.current) {
      initZego();
    }
  }, [engineLoaded, !!currentUser, roomId, isJoined]);

  const initZego = async () => {
    if (!currentUser || !roomId || !ZegoExpressEngine || initStartedRef.current) return;
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

      await zg.loginRoom(roomId, currentUser.uid, { userName: currentUser.displayName || 'User' }, { userUpdate: true });
      
      const localStream = await zg.createStream({ camera: { audio: true, video: false } });
      localStreamRef.current = localStream;
      zg.startPublishingStream(`stream_${currentUser.uid}`, localStream);

      setIsJoined(true);
      setIsConnecting(false);

      if (!hasIncrementedRef.current && database) {
        const countRef = ref(database, `partyRooms/${roomId}/memberCount`)
        runRtdbTransaction(countRef, (current) => (current || 0) + 1)
        hasIncrementedRef.current = true
      }

    } catch (error: any) {
      console.error("Zego Join Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Join Failed", 
        description: error.message || "Could not establish connection. Please check your microphone permissions." 
      });
      setIsConnecting(false);
      router.back();
    }
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
    if (zegoEngineRef.current) {
      const zg = zegoEngineRef.current;
      if (localStreamRef.current) {
        try {
          zg.stopPublishingStream(`stream_${currentUser?.uid}`);
          zg.destroyStream(localStreamRef.current);
        } catch (e) {}
      }
      try {
        zg.logoutRoom(roomId);
      } catch (e) {}
    }
    
    if (hasIncrementedRef.current && database && roomId) {
      const countRef = ref(database, `partyRooms/${roomId}/memberCount`)
      runRtdbTransaction(countRef, (current) => Math.max(0, (current || 1) - 1))
      hasIncrementedRef.current = false
    }
    
    if (window.location.pathname.includes(`/party/${roomId}`)) {
      router.push('/party');
    }
  }

  const handleDeleteRoom = async () => {
    if (!database || !roomId || !currentUser || room.hostId !== currentUser.uid) return

    try {
      // 1. First cleanup Zego local tracks
      if (zegoEngineRef.current) {
        const zg = zegoEngineRef.current;
        if (localStreamRef.current) {
          try {
            zg.stopPublishingStream(`stream_${currentUser?.uid}`);
            zg.destroyStream(localStreamRef.current);
          } catch (e) {}
        }
        try { zg.logoutRoom(roomId); } catch (e) {}
      }

      // 2. Remove the room from RTDB
      // The listener at the top of the file will catch this and redirect all participants
      await remove(ref(database, `partyRooms/${roomId}`))
      
      toast({ title: "Room Deleted", description: "The party has been closed permanently." })
      router.replace('/party')
    } catch (error) {
      toast({ variant: "destructive", title: "Delete Failed", description: "Could not close the room." })
    }
  }

  if (!room || isConnecting || isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-svh bg-zinc-950 text-white space-y-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-[2.25rem] bg-primary/20 border-2 border-primary/40 flex items-center justify-center animate-pulse">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <Loader2 className="absolute -bottom-2 -right-2 w-8 h-8 text-primary animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black font-headline uppercase tracking-widest">Entering Room</h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {isUserLoading ? "Verifying Session..." : "Connecting to Audio..."}
          </p>
        </div>
      </div>
    )
  }

  const isHost = currentUser && room.hostId === currentUser.uid
  const seats = Array.from({ length: 8 }, (_, i) => i + 1);
  const occupiedSeats = remoteUsers.slice(0, 8);

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
          <button className="ml-1 p-1.5 bg-white/10 rounded-full active:scale-90 transition-transform">
            <Heart className="w-3 h-3 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-2 rounded-full border border-white/10">
            <Users className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[10px] font-black">{room.memberCount || 1}</span>
          </div>
          
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

          <button className="w-9 h-9 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full border border-white/10">
            <ShoppingBag className="w-4 h-4" />
          </button>
          
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
              {seats.map((num, idx) => {
                const userOnSeat = occupiedSeats[idx];
                return (
                  <div key={num} className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border border-white/10 bg-black/30 flex items-center justify-center overflow-hidden">
                        {userOnSeat ? (
                          <Avatar className="w-full h-full">
                            <AvatarFallback className="bg-zinc-800 text-xs font-black">?</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="bg-white/5 w-full h-full flex items-center justify-center">
                            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E" className="w-6 h-6 opacity-20" alt="empty seat" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white/10 text-[7px] font-black px-2 py-0.5 rounded-full uppercase border border-white/5">
                        {num}
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-white/40 truncate w-14 text-center">
                      {userOnSeat ? (userOnSeat.userName || 'Joined') : 'Mount'}
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
          <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90 transition-all">
            <Gamepad2 className="w-5 h-5 text-purple-400" />
          </button>
          <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90 transition-all">
            <Gift className="w-5 h-5 text-amber-400" />
          </button>
          <button 
            onClick={toggleMic}
            className={cn(
              "w-12 h-12 rounded-full border flex items-center justify-center active:scale-90 transition-all shadow-xl",
              isMicOn ? "bg-white/10 border-white/10 text-white" : "bg-red-500 border-red-400 text-white"
            )}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90 transition-all">
            <LayoutGrid className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </footer>
    </div>
  )
}
