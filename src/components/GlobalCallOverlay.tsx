
"use client"

import { useState, useEffect, useRef } from "react"
import { Phone, Video, PhoneOff, Maximize2, Minimize2, CheckCircle, Loader2 } from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, set, remove, update, push, serverTimestamp as rtdbTimestamp } from "firebase/database"
import { doc, setDoc, collection, updateDoc as updateFirestoreDoc, increment as firestoreIncrement } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getZegoConfig } from "@/app/actions/zego"

let ZegoUIKitPrebuilt: any = null;

export function GlobalCallOverlay() {
  const { user: currentUser } = useUser()
  const { database, firestore } = useFirebase()
  
  const [callData, setCallData] = useState<any>(null)
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'incoming' | 'ongoing'>('idle')
  const [isMinimized, setIsMinimized] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [localPreviewStream, setLocalPreviewStream] = useState<MediaStream | null>(null)
  const [zegoInstance, setZegoInstance] = useState<any>(null)
  const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 })
  
  const zegoContainerRef = useRef<HTMLDivElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)
  const zegoInitializingRef = useRef(false)
  const ringingTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const callDurationRef = useRef(0)
  const wasCallAcceptedRef = useRef(false)
  const activeChatIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Pre-load Zego for faster connection
      import('@zegocloud/zego-uikit-prebuilt').then((module) => {
        ZegoUIKitPrebuilt = module.ZegoUIKitPrebuilt;
      });
      ringtoneRef.current = new Audio("/ringtone.mp3");
      ringtoneRef.current.loop = true;
    }
  }, []);

  useEffect(() => {
    if (!database || !currentUser) return;

    const incomingCallRef = ref(database, `users/${currentUser.uid}/incomingCallId`);
    return onValue(incomingCallRef, (snap) => {
      const chatId = snap.val();
      if (chatId) {
        activeChatIdRef.current = chatId;
        const callDetailsRef = ref(database, `calls/${chatId}`);
        onValue(callDetailsRef, (detailsSnap) => {
          const data = detailsSnap.val();
          if (!data) {
            handleCleanup();
            return;
          }
          setCallData(data);
          updateCallState(data);
        });
      } else {
        handleCleanup();
      }
    });
  }, [database, currentUser]);

  const updateCallState = (data: any) => {
    if (data.status === 'ringing') {
      if (ringtoneRef.current) ringtoneRef.current.play().catch(() => {});
      const isCaller = data.callerId === currentUser?.uid;
      setCallStatus(isCaller ? 'ringing' : 'incoming');
      
      // 40-second timeout logic
      if (!ringingTimerRef.current) {
        ringingTimerRef.current = setTimeout(() => {
          if (isCaller) {
            handleTimeout();
          }
        }, 40000);
      }

      // Start camera preview for video caller immediately
      if (isCaller && data.callType === 'video' && !localPreviewStream) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          .then(setLocalPreviewStream)
          .catch(console.error);
      }
    } else if (data.status === 'accepted') {
      if (ringingTimerRef.current) {
        clearTimeout(ringingTimerRef.current);
        ringingTimerRef.current = null;
      }
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      wasCallAcceptedRef.current = true;
      if (callStatus !== 'ongoing') {
        setCallStatus('ongoing');
        initiateZegoCall(activeChatIdRef.current!, data.callType);
      }
    }
  };

  const handleTimeout = () => {
    if (activeChatIdRef.current) {
      logCallEnd(activeChatIdRef.current, 0, true);
      handleEndCall();
    }
  };

  const handleCleanup = () => {
    if (ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
    if (localPreviewStream) {
      localPreviewStream.getTracks().forEach(track => track.stop());
      setLocalPreviewStream(null);
    }
    if (zegoInstance) {
      try { zegoInstance.destroy(); } catch (e) {}
      setZegoInstance(null);
    }
    
    if (wasCallAcceptedRef.current && activeChatIdRef.current && currentUser?.uid === callData?.callerId) {
      logCallEnd(activeChatIdRef.current, callDurationRef.current);
    }

    setCallStatus('idle');
    setCallData(null);
    setIsMinimized(false);
    setCallDuration(0);
    callDurationRef.current = 0;
    zegoInitializingRef.current = false;
    activeChatIdRef.current = null;
    wasCallAcceptedRef.current = false;
  };

  const initiateZegoCall = async (roomID: string, type: 'video' | 'audio') => {
    if (!ZegoUIKitPrebuilt || !currentUser || zegoInitializingRef.current) return;
    zegoInitializingRef.current = true;

    try {
      const { appID, serverSecret } = await getZegoConfig();
      if (!appID || !serverSecret) { handleEndCall(); return; }

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID, 
        serverSecret, 
        roomID, 
        currentUser.uid, 
        currentUser.displayName || `User_${currentUser.uid.slice(0, 5)}`
      );
      const zp = ZegoUIKitPrebuilt.create(kitToken);
      setZegoInstance(zp);
      zp.joinRoom({
        container: zegoContainerRef.current,
        showPreJoinView: false,
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: type === 'video',
        showMyCameraToggleButton: false,
        showMyMicrophoneToggleButton: false,
        showAudioVideoSettingsButton: false,
        showScreenSharingButton: false,
        showTextChat: false,
        showUserList: false,
        maxUsers: 2,
        layout: "Auto",
        showLayoutButton: false,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
          config: { role: "Host" },
        },
        onLeaveRoom: () => handleEndCall(),
      });
    } catch (error) {
      console.error("Zego init error:", error);
      handleEndCall();
    }
  };

  const handleAcceptCall = async () => {
    if (!database || !activeChatIdRef.current) return
    await update(ref(database, `calls/${activeChatIdRef.current}`), { status: 'accepted' });
  }

  const handleEndCall = async () => {
    if (!database || !activeChatIdRef.current) return
    const cid = activeChatIdRef.current;
    const receiverId = callData?.receiverId;
    const callerId = callData?.callerId;

    await remove(ref(database, `calls/${cid}`));
    if (receiverId) await remove(ref(database, `users/${receiverId}/incomingCallId`));
    if (callerId) await remove(ref(database, `users/${callerId}/incomingCallId`));
  }

  const logCallEnd = async (chatId: string, duration: number, isTimeout: boolean = false) => {
    if (!database || !currentUser) return;
    const otherId = callData?.receiverId === currentUser.uid ? callData?.callerId : callData?.receiverId;
    
    let logMsg = "";
    if (isTimeout) {
      logMsg = "[Timeout]";
    } else {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      logMsg = `[${mins}:${secs.toString().padStart(2, '0')}]`;
    }

    const updates: any = {}
    const msgKey = push(ref(database, `chats/${chatId}/messages`)).key
    updates[`/chats/${chatId}/messages/${msgKey}`] = { messageText: logMsg, senderId: currentUser.uid, sentAt: rtdbTimestamp(), isCallLog: true }
    updates[`/users/${currentUser.uid}/chats/${otherId}/lastMessage`] = logMsg
    updates[`/users/${currentUser.uid}/chats/${otherId}/timestamp`] = rtdbTimestamp()
    updates[`/users/${otherId}/chats/${currentUser.uid}/lastMessage`] = logMsg
    updates[`/users/${otherId}/chats/${currentUser.uid}/timestamp`] = rtdbTimestamp()
    await update(ref(database), updates);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'ongoing') {
      interval = setInterval(() => {
        setCallDuration(prev => {
          const next = prev + 1;
          callDurationRef.current = next;
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    if (previewVideoRef.current && localPreviewStream) {
      previewVideoRef.current.srcObject = localPreviewStream;
    }
  }, [localPreviewStream]);

  if (callStatus === 'idle') return null;

  const otherUserImage = `https://picsum.photos/seed/${callData?.callerId === currentUser?.uid ? callData?.receiverId : callData?.callerId}/200/200`
  const otherUserName = callData?.callerId === currentUser?.uid ? (callStatus === 'ringing' ? 'Ringing...' : 'Connecting...') : (callData?.callerName || 'Incoming Call');

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      {/* PiP Floating Button */}
      <div 
        style={{ left: pipPosition.x, top: pipPosition.y }}
        className={cn(
          "absolute pointer-events-auto w-16 h-16 rounded-full bg-primary shadow-2xl flex items-center justify-center transition-transform active:scale-95 z-[1100]",
          isMinimized ? "scale-100" : "scale-0"
        )}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          setPipPosition({ x: touch.clientX - 32, y: touch.clientY - 32 });
        }}
        onClick={() => setIsMinimized(false)}
      >
        <Avatar className="w-full h-full border-2 border-white">
          <AvatarImage src={otherUserImage} className="object-cover" />
          <AvatarFallback className="bg-primary text-white"><Video className="w-6 h-6" /></AvatarFallback>
        </Avatar>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
          <Maximize2 className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Full Screen Overlay */}
      <div className={cn(
        "absolute inset-0 bg-zinc-950 pointer-events-auto transition-all duration-500 transform",
        isMinimized ? "opacity-0 scale-90 translate-y-10 pointer-events-none" : "opacity-100 scale-100 translate-y-0"
      )}>
        {/* Zego Container */}
        <div ref={zegoContainerRef} className={cn("absolute inset-0 z-0", callStatus === 'ongoing' ? 'visible' : 'invisible')} />

        {/* Ringing/Incoming UI */}
        {(callStatus === 'ringing' || callStatus === 'incoming') && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-between py-24 px-8">
            <div className="absolute inset-0 z-0 overflow-hidden">
               {callData?.callType === 'video' && localPreviewStream ? (
                 <video ref={previewVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1] opacity-40 blur-[2px]" />
               ) : (
                 <div className="w-full h-full bg-zinc-900" />
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/60" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center gap-10 mt-12 w-full">
              <div className="relative">
                <div className="absolute -inset-8 bg-primary/20 rounded-full animate-ping opacity-20" />
                <Avatar className="w-44 h-44 border-[10px] border-white/5 shadow-2xl">
                  <AvatarImage src={otherUserImage} className="object-cover" />
                  <AvatarFallback className="text-5xl bg-zinc-800">?</AvatarFallback>
                </Avatar>
              </div>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-4xl font-black font-headline tracking-tight text-white">{otherUserName}</h2>
                </div>
                <div className="px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 mx-auto w-fit">
                  {callData?.callType === 'video' ? <Video className="w-4 h-4 text-primary" /> : <Phone className="w-4 h-4 text-primary" />}
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] animate-pulse">
                    {callStatus === 'ringing' ? 'Calling...' : `Incoming ${callData?.callType} call`}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-16 mb-12">
              {callStatus === 'incoming' ? (
                <>
                  <button onClick={handleEndCall} className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all"><PhoneOff className="w-10 h-10 text-white" /></button>
                  <button onClick={handleAcceptCall} className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all animate-bounce"><Phone className="w-10 h-10 text-white" /></button>
                </>
              ) : (
                <button onClick={handleEndCall} className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-2xl active:scale-90 transition-all hover:bg-red-500"><PhoneOff className="w-10 h-10 text-white" /></button>
              )}
            </div>
          </div>
        )}

        {/* Global Controls (Ongoing) */}
        {callStatus === 'ongoing' && (
          <div className="absolute top-12 left-0 right-0 z-50 flex items-center justify-between px-6 pointer-events-none">
            <button 
              onClick={() => setIsMinimized(true)}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center pointer-events-auto active:scale-90 transition-transform"
            >
              <Minimize2 className="w-6 h-6 text-white" />
            </button>
            
            <div className="px-5 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/20 flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
               <span className="text-white font-black text-sm tracking-[0.2em]">{Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}</span>
            </div>

            <button 
              onClick={handleEndCall}
              className="w-12 h-12 rounded-full bg-red-500 shadow-xl flex items-center justify-center pointer-events-auto active:scale-90 transition-transform"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
