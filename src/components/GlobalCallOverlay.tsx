"use client"

import { useState, useEffect, useRef } from "react"
import { Phone, Video, PhoneOff, Loader2 } from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, remove, update, push, serverTimestamp as rtdbTimestamp } from "firebase/database"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getZegoConfig } from "@/app/actions/zego"

let ZegoUIKitPrebuilt: any = null;

export function GlobalCallOverlay() {
  const { user: currentUser } = useUser()
  const { database } = useFirebase()
  
  const [callData, setCallData] = useState<any>(null)
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'incoming' | 'ongoing'>('idle')
  const [callDuration, setCallDuration] = useState(0)
  const [localPreviewStream, setLocalPreviewStream] = useState<MediaStream | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  
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
    const isCaller = data.callerId === currentUser?.uid;

    if (data.status === 'ringing') {
      if (ringtoneRef.current) ringtoneRef.current.play().catch(() => {});
      setCallStatus(isCaller ? 'ringing' : 'incoming');
      
      if (!ringingTimerRef.current) {
        ringingTimerRef.current = setTimeout(() => {
          if (isCaller) handleTimeout();
        }, 40000);
      }

      // Proactively warm up media devices for the caller
      if (isCaller && !localPreviewStream) {
        const constraints = { 
          video: data.callType === 'video', 
          audio: true 
        };
        navigator.mediaDevices.getUserMedia(constraints)
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
        setIsConnecting(true);
        
        // If receiver, warm up devices instantly on accept
        if (!isCaller && !localPreviewStream) {
          const constraints = { 
            video: data.callType === 'video', 
            audio: true 
          };
          navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
              setLocalPreviewStream(stream);
              initiateZegoCall(activeChatIdRef.current!, data.callType, stream);
            })
            .catch((err) => {
              console.error(err);
              initiateZegoCall(activeChatIdRef.current!, data.callType);
            });
        } else {
          initiateZegoCall(activeChatIdRef.current!, data.callType, localPreviewStream || undefined);
        }
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
    
    if (wasCallAcceptedRef.current && activeChatIdRef.current && currentUser?.uid === callData?.callerId) {
      logCallEnd(activeChatIdRef.current, callDurationRef.current);
    }

    setCallStatus('idle');
    setCallData(null);
    setCallDuration(0);
    callDurationRef.current = 0;
    zegoInitializingRef.current = false;
    activeChatIdRef.current = null;
    wasCallAcceptedRef.current = false;
    setIsConnecting(false);
  };

  const initiateZegoCall = async (roomID: string, type: 'video' | 'audio', existingStream?: MediaStream) => {
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
        onJoinRoom: () => setIsConnecting(false),
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

  const otherUserImage = `https://picsum.photos/seed/${callData?.callerId === currentUser?.uid ? callData?.receiverId : callData?.callerId}/400/600`
  const otherUserName = callData?.callerId === currentUser?.uid ? (callStatus === 'ringing' ? 'Ringing...' : 'Connecting...') : (callData?.callerName || 'Incoming Call');

  return (
    <div className="fixed inset-0 z-[1000] bg-zinc-950 flex flex-col overflow-hidden">
      {/* Zego Video Layer */}
      <div 
        ref={zegoContainerRef} 
        className={cn(
          "absolute inset-0 z-0 transition-opacity duration-500", 
          callStatus === 'ongoing' && !isConnecting ? 'opacity-100' : 'opacity-0'
        )} 
      />

      {/* App's Call UI Layer (Always Overlay) */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-between py-24 px-8 pointer-events-none">
        {/* Background visual for ringing/audio */}
        {(callStatus !== 'ongoing' || isConnecting || callData?.callType === 'audio') && (
          <div className="absolute inset-0 z-[-1] overflow-hidden">
             {callData?.callType === 'video' && localPreviewStream ? (
               <video ref={previewVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1] opacity-40 blur-[2px]" />
             ) : (
               <img src={otherUserImage} className="w-full h-full object-cover opacity-20 blur-xl scale-110" alt="" />
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-zinc-950/80" />
          </div>
        )}
        
        {/* Top Info Section */}
        <div className="flex flex-col items-center gap-8 mt-12 w-full">
          {(callStatus !== 'ongoing' || isConnecting) && (
            <div className="relative">
              <div className="absolute -inset-8 bg-primary/20 rounded-full animate-ping opacity-20" />
              <Avatar className="w-44 h-44 border-[10px] border-white/5 shadow-2xl">
                <AvatarImage src={otherUserImage} className="object-cover" />
                <AvatarFallback className="text-5xl bg-zinc-800">?</AvatarFallback>
              </Avatar>
            </div>
          )}
          
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black font-headline tracking-tight text-white drop-shadow-md">
              {callStatus === 'ongoing' && !isConnecting ? (callData?.callerName || 'Connected') : otherUserName}
            </h2>
            
            <div className="px-5 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-3 mx-auto w-fit">
              {isConnecting ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : callData?.callType === 'video' ? (
                <Video className="w-4 h-4 text-primary" />
              ) : (
                <Phone className="w-4 h-4 text-primary" />
              )}
              <p className="text-[11px] font-black text-white/80 uppercase tracking-[0.2em]">
                {callStatus === 'ongoing' && !isConnecting 
                  ? `${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}`
                  : isConnecting ? 'Connecting...' : `Incoming ${callData?.callType}`}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions Section */}
        <div className="flex items-center gap-16 mb-12 pointer-events-auto">
          {callStatus === 'incoming' ? (
            <>
              <button onClick={handleEndCall} className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all">
                <PhoneOff className="w-10 h-10 text-white" />
              </button>
              <button onClick={handleAcceptCall} className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all animate-bounce">
                <Phone className="w-10 h-10 text-white" />
              </button>
            </>
          ) : (
            <button onClick={handleEndCall} className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all hover:bg-red-600">
              <PhoneOff className="w-10 h-10 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
