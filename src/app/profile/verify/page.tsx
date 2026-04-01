
"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Camera, RotateCcw, CheckCircle, AlertCircle, Loader2, ShieldCheck, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { verifyFace } from "@/ai/flows/verify-face-flow"

export default function VerifyIdentityPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const [isStarted, setIsStarted] = useState(false)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const userRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(userRef)

  const getCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
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
      // Disconnect camera access on unmount
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        
        // Mirror the image for capture as well to match preview
        context.translate(canvasRef.current.width, 0);
        context.scale(-1, 1);
        
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUri = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUri);
      }
    }
  }

  const handleRetake = () => {
    setCapturedImage(null);
  }

  const handleSubmit = async () => {
    if (!capturedImage || !profile || !currentUser) return;
    
    setIsVerifying(true);
    try {
      const profilePhoto = (profile.profilePhotoUrls && profile.profilePhotoUrls[0]) || "";
      
      const result = await verifyFace({
        profilePhotoUri: profilePhoto,
        livePhotoUri: capturedImage
      });

      if (result.isMatch) {
        const userDocRef = doc(firestore, "userProfiles", currentUser.uid);
        updateDocumentNonBlocking(userDocRef, {
          isVerified: true,
          updatedAt: new Date().toISOString()
        });
        toast({
          title: "Verification Successful",
          description: "Your identity has been verified! A tick has been added to your profile.",
        });
        router.push('/profile');
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: result.actionableFeedback || "The photos do not match. Please ensure your profile photo is a clear picture of yourself.",
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

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-y-auto">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-white z-50 border-b border-gray-50 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-gray-50 rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Verify Identity</h1>
      </header>

      <main className="flex-1 p-6 space-y-8 flex flex-col pb-20">
        {!isStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-10 animate-in fade-in slide-in-from-bottom-4">
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
                We'll use AI to compare your profile photo with a live selfie to verify it's really you. 
                <br /><br />
                <span className="text-xs font-black uppercase text-primary tracking-widest">Takes less than 1 minute</span>
              </p>
            </div>

            <div className="w-full space-y-4 pt-6">
              <Button 
                onClick={handleStart}
                className="w-full h-16 rounded-full bg-primary text-white font-black text-lg gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                Start Verification
              </Button>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] text-center">Your biometric data is never stored</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500 flex flex-col flex-1">
            <div className="space-y-2 text-center shrink-0">
              <h2 className="text-2xl font-black font-headline">Face Verification</h2>
              <p className="text-sm text-gray-500 font-medium">Please ensure your face is clearly visible within the frame.</p>
            </div>

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
                  <div className="absolute inset-0 border-[3px] border-white/20 rounded-[2.5rem] pointer-events-none m-8" />
                </>
              )}

              {hasCameraPermission === false && (
                <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center p-8 text-center text-white space-y-4">
                   <AlertCircle className="w-12 h-12 text-red-500" />
                   <p className="text-sm font-bold uppercase tracking-widest">Camera Access Required</p>
                   <Button onClick={() => window.location.reload()} variant="outline" className="border-white/20 text-white">Retry</Button>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="space-y-4 pt-4 shrink-0">
              {!capturedImage ? (
                <Button 
                  className="w-full h-16 rounded-full bg-zinc-900 text-white font-black text-lg gap-3 shadow-xl active:scale-95 transition-all"
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
                    className="h-16 rounded-full bg-primary text-white font-black text-lg gap-3 shadow-xl active:scale-95 transition-all"
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
