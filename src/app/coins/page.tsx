
"use client"

import { Navbar } from "@/components/Navbar"
import { Coins, Zap, Check, Star, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

const PACKAGES = [
  { id: 1, amount: 100, price: "$4.99", label: "Starter Pack", icon: Zap },
  { id: 2, amount: 500, price: "$19.99", label: "Most Popular", icon: Star, featured: true },
  { id: 3, amount: 1200, price: "$39.99", label: "Elite Pack", icon: Coins },
]

export default function CoinsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const coinAccountRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Fixed path to ensure even number of segments
    return doc(firestore, "users", user.uid, "coinAccount", "primary");
  }, [firestore, user])
  
  const { data: coinAccount, isLoading } = useDoc(coinAccountRef)

  const handlePurchase = (amount: number, price: string) => {
    if (!coinAccountRef || !coinAccount || !user || !firestore) return;

    const newBalance = (coinAccount.balance || 0) + amount;
    
    // Update balance
    updateDocumentNonBlocking(coinAccountRef, {
      balance: newBalance,
      updatedAt: new Date().toISOString()
    });

    // Log transaction in subcollection: /users/{userId}/coinAccount/primary/transactions
    const transactionsRef = collection(firestore, "users", user.uid, "coinAccount", "primary", "transactions");
    addDocumentNonBlocking(transactionsRef, {
      type: 'purchase',
      amount: amount,
      transactionDate: new Date().toISOString(),
      description: `Purchased ${amount} coins for ${price}`,
      coinAccountId: user.uid
    });

    toast({
      title: "Purchase Successful",
      description: `You've added ${amount} coins to your account.`,
    });
  }

  return (
    <div className="flex flex-col min-h-svh pb-24 bg-white">
      <header className="p-8 text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold text-primary">Refill Coins</h1>
        <p className="text-muted-foreground text-sm">Keep the conversation flowing</p>
      </header>

      <main className="px-6 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-border shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-2xl">
              <Coins className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Balance</p>
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <p className="text-2xl font-bold">{coinAccount?.balance || 0} Coins</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-primary border-primary">Free Bonus +10</Badge>
        </div>

        <div className="space-y-4">
          {PACKAGES.map((pkg) => {
            const Icon = pkg.icon
            return (
              <Card 
                key={pkg.id} 
                className={`relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95 cursor-pointer border shadow-lg ${pkg.featured ? 'ring-2 ring-primary border-primary' : ''}`}
                onClick={() => handlePurchase(pkg.amount, pkg.price)}
              >
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

        <div className="bg-muted/30 p-4 rounded-2xl border border-border space-y-3">
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
