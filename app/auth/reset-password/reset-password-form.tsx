'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function ResetPasswordForm({ token }: { token?: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token })
      if (error) throw new Error(error.message)
      toast.success('Password reset successfully')
      router.push('/login')
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>
          Please enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input id="password" name="password" type="password" required disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required disabled={loading} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Reset Password
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="link" asChild>
          <Link href="/login">Back to Login</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
