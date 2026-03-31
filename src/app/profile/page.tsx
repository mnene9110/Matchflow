"use client"

import { Navbar } from "@/components/Navbar"
import { Settings, Camera, Edit2, Shield, Heart, LogOut, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { Badge } from "@/components/ui/badge"

export default function ProfilePage() {
  return (
    <div className="flex flex-col min-h-svh pb-20">
      <header className="p-6 flex justify-between items-center bg-primary/10 rounded-b-[3rem] pb-12">
        <h1 className="text-2xl font-headline font-bold text-primary">My Profile</h1>
        <Button variant="ghost" size="icon" className="text-primary">
          <Settings className="w-6 h-6" />
        </Button>
      </header>

      <main className="px-6 -mt-10 space-y-8">
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
              <AvatarImage src={PlaceHolderImages.find(i => i.id === 'user-3')?.imageUrl} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <Button size="icon" className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-primary text-white w-10 h-10 shadow-lg">
              <Camera className="w-5 h-5" />
            </Button>
          </div>
          <h2 className="mt-4 text-2xl font-bold">Alex, 25</h2>
          <p className="text-sm text-muted-foreground">Product Designer</p>
          <div className="mt-4 flex gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-600 border-none">
              <Heart className="w-3 h-3 mr-1" />
              Pro Member
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white border rounded-3xl p-4 text-center shadow-sm">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Matches</p>
             <p className="text-xl font-bold">24</p>
           </div>
           <div className="bg-white border rounded-3xl p-4 text-center shadow-sm">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Coin Balance</p>
             <p className="text-xl font-bold text-amber-500">150</p>
           </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Account Settings</h3>
          <div className="bg-white border rounded-[2rem] overflow-hidden divide-y">
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Edit2 className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm font-medium">Edit Profile Info</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-50 rounded-xl">
                  <Shield className="w-5 h-5 text-pink-500" />
                </div>
                <span className="text-sm font-medium">Privacy & Safety</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-red-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-xl">
                  <LogOut className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm font-medium">Logout</span>
              </div>
            </button>
          </div>
        </div>
      </main>

      <Navbar />
    </div>
  )
}
