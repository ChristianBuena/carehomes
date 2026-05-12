"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-sm">

        <CardHeader>
          <CardTitle className="text-center">Create Account</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Name */}
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input placeholder="John Doe" />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input placeholder="you@example.com" />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>

          {/* Button */}
          <Button className="w-full">
            Sign Up
          </Button>

          {/* Login link */}
          <p className="text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </p>

        </CardContent>
      </Card>
    </div>
  )
}