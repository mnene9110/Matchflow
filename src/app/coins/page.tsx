
"use client"

import { Navbar } from "@/components/Navbar"
import { Coins, Zap, Check, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const PACKAGES = [
  { id: 1, amount: 100, price: "$4.99", label: "Starter Pack", icon: Zap },
  { id: 2, amount: 500, price: "$19.99", label: "Most Popular", icon: Star, featured: true },
  { id: 3, amount: 1200, price: "$39.99", label: "Elite Pack", icon: Coins },
]

export default function CoinsPage() {
  return (
    <div className="flex flex-col min-h-svh pb-24 gradient-bg">
      <header className="p-8 text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold text-primary">Refill Coins</h1>
        <p className="text-muted-foreground text-sm">Keep the conversation flowing</p>
      </header>

      <main className="px-6 space-y-6">
        <div className="bg-white/50 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-2xl">
              <Coins className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Balance</p>
              <p className="text-2xl font-bold">150 Coins</p>
            </div>
          </div>
          <Badge variant="outline" className="text-primary border-primary">Free Bonus +10</Badge>
        </div>

        <div className="space-y-4">
          {PACKAGES.map((pkg) => {
            const Icon = pkg.icon
            return (
              <Card key={pkg.id} className={`relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95 cursor-pointer border-none shadow-lg ${pkg.featured ? 'ring-2 ring-primary' : ''}`}>
                {pkg.featured && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Best Value
                  </div>
                )}
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${pkg.featured ? 'bg-primary/10' : 'bg-secondary'}`}>
                      <Icon className={`w-8 h-8 ${pkg.featured ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{pkg.amount} Coins</h3>
                      <p className="text-xs text-muted-foreground">{pkg.label}</p>
                    </div>
                  </div>
                  <Button className={`${pkg.featured ? 'bg-primary' : 'bg-secondary text-primary hover:bg-primary/10'}`}>
                    {pkg.price}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="bg-white/30 backdrop-blur-sm p-4 rounded-2xl border border-white/20 space-y-3">
          <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Coin Usage</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Check className="w-3 h-3 text-primary" />
              <span>5 coins / Message</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Check className="w-3 h-3 text-primary" />
              <span>50 coins / Video Call</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Check className="w-3 h-3 text-primary" />
              <span>20 coins / AI Tip</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Check className="w-3 h-3 text-primary" />
              <span>10 coins / Like</span>
            </div>
          </div>
        </div>
      </main>

      <Navbar />
    </div>
  )
}
