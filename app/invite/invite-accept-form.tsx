'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { rejectInvitation } from '@/app/actions/invitations'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
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

export function InviteAcceptForm({ email, token }: { email: string; token: string }) {
  const [loading, setLoading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
      })

      if (error) {
        toast.error(error.message || 'Failed to sign up')
        return
      }

      toast.success('Account created successfully!')
      router.push('/')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setRejecting(true)
    try {
      await rejectInvitation(token)
      toast.success('Invitation rejected')
      router.push('/login')
      router.refresh()
    } catch (error: any) {
      toast.error('Failed to reject invitation')
    } finally {
      setRejecting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" name="name" required placeholder="John Doe" disabled={loading || rejecting} autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input id="password" name="password" type={showPassword ? "text" : "password"} required disabled={loading || rejecting} autoComplete="new-password" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            disabled={loading || rejecting}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" className="flex-1" disabled={loading || rejecting}>
              {rejecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Reject
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Invitation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject this invitation? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Reject Invitation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button type="submit" className="flex-1" disabled={loading || rejecting}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Accept & Join
        </Button>
      </div>
    </form>
  )
}
