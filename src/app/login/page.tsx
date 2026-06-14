"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          
          <div className="space-y-2">
            <Label>Email</Label>
            <Input placeholder="you@example.com" />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>

          <Button className="w-full">
            Sign In
          </Button>

          <p className="text-sm text-center text-[var(--color-muted)]">
            No account?{" "}
            <Link href="/signup" className="underline text-[var(--color-secondary)]">
              Sign up
            </Link>
          </p>

        </CardContent>
      </Card>
    </div>
  )
}