
"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Camera, RotateCcw, CheckCircle, AlertCircle, Loader2, ShieldCheck, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase } from "@/firebase/provider"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { useToast } from "@/hooks/use-toast"
import { verifyFace } from "@/ai/flows/verify-face-flow"

export default function VerifyIdentityPage() {
  const router = useRouter()
  const { firestore } = useFirebase()
  const { user: currentUser, profile, isLoading: isUserLoading } = useSupabaseUser()
  const { toast } = useToast()

  const [isStarted, setIsStarted] = useState(false)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const getCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      setHasCameraPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to verify your identity.',
      });
    }
  };

  const handleStart = () => {
    setIsStarted(true);
    getCameraPermission();
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.translate(canvasRef.current.width, 0);
        context.scale(-1, 1);
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUri = canvasRef.current.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUri);
      }
    }
  }

  const handleRetake = () => {
    setCapturedImage(null);
    if (!streamRef.current) {
      getCameraPermission();
    }
  }

  const handleSubmit = async () => {
    if (!capturedImage || !profile || !currentUser) return;
    
    setIsVerifying(true);
    try {
      const profilePhoto = (profile.profilePhotoUrls && profile.profilePhotoUrls[0]) || "";
      
      if (!profilePhoto) {
        toast({
          variant: "destructive",
          title: "Missing Profile Photo",
          description: "Please upload a profile photo before verifying.",
        });
        setIsVerifying(false);
        return;
      }

      const result = await verifyFace({
        profilePhotoUri: profilePhoto,
        livePhotoUri: capturedImage
      });

      if (result.isMatch) {
        await updateDoc(doc(firestore, "userProfiles", currentUser.id), {
          isVerified: true,
          updatedAt: serverTimestamp()
        });
        
        stopCamera();
        
        toast({
          title: "Verification Successful",
          description: "Your identity has been verified! A tick has been added to your profile.",
        });
        router.push('/profile');
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: result.actionableFeedback || "The photos do not match.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred during verification. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  }

  if (isUserLoading) return <div className="flex h-svh items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-y-auto scroll-smooth">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-50 shadow-lg text-white">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            stopCamera();
            router.back();
          }} 
          className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Verify Identity</h1>
      </header>

      <main className="flex-1 p-6 space-y-8 flex flex-col pb-20">
        {!isStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative">
              <div className="w-32 h-32 bg-primary/10 rounded-[3rem] flex items-center justify-center border-4 border-primary/20">
                <ShieldCheck className="w-16 h-16 text-primary" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl">
                 <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="space-y-4 text-center max-w-[280px]">
              <h2 className="text-3xl font-black font-headline leading-tight">Identity Protection</h2>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                We'll use AI to compare your profile photo with a live selfie. 
                <br /><br />
                <span className="text-xs font-black uppercase text-primary tracking-widest">Takes less than 1 minute</span>
              </p>
            </div>

            <div className="w-full space-y-4 pt-6">
              <Button 
                onClick={handleStart}
                className="w-full h-16 rounded-full bg-primary text-white font-black text-lg shadow-xl active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                Start Verification
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700 flex flex-col flex-1">
            <div className="relative aspect-square w-full bg-zinc-950 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-gray-50 flex items-center justify-center shrink-0">
              {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover scale-x-[-1]" 
                    autoPlay 
                    muted 
                    playsInline
                  />
                </>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="space-y-4 pt-4 shrink-0">
              {!capturedImage ? (
                <Button 
                  className="w-full h-16 rounded-full bg-zinc-900 text-white font-black text-lg shadow-xl active:scale-95 transition-all"
                  onClick={handleCapture}
                  disabled={hasCameraPermission !== true}
                >
                  <Camera className="w-6 h-6" />
                  Capture Live Photo
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline"
                    className="h-16 rounded-full border-gray-100 font-black text-gray-500 gap-3"
                    onClick={handleRetake}
                    disabled={isVerifying}
                  >
                    <RotateCcw className="w-5 h-5" />
                    Retake
                  </Button>
                  <Button 
                    className="h-16 rounded-full bg-primary text-white font-black text-lg shadow-xl active:scale-95 transition-all"
                    onClick={handleSubmit}
                    disabled={isVerifying}
                  >
                    {isVerifying ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                    {isVerifying ? "Verifying..." : "Submit"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
