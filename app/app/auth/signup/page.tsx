
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Shield, Zap } from 'lucide-react';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        // Auto-sign in after successful signup
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError('Account created but sign-in failed. Please try signing in manually.');
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      } else {
        const data = await response.json();
        setError(data.error || 'An error occurred during signup');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding and features */}
        <div className="space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Join Project Foundry PSA
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Start tracking your time with AI-powered insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Team Collaboration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Work seamlessly with your team members
              </p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Secure & Reliable</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Enterprise-grade security for your data
              </p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Quick time entry and instant insights
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Signup form */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Sign up to start tracking your time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
