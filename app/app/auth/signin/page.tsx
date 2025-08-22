
'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, Brain, BarChart3 } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials. Please try again.');
      } else {
        // Force session refresh
        await getSession();
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding and features */}
        <div className="space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Project Foundry PSA
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              AI-enhanced timesheet and project management system
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Time Tracking</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Intelligent time tracking with real-time suggestions
              </p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <Brain className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Insights</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Get productivity insights and optimization tips
              </p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <BarChart3 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Advanced Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Comprehensive reporting and project analytics
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your timesheet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-blue-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-2">
                Demo Account:
              </p>
              <p className="text-sm font-mono text-center">
                <span className="text-blue-600">john@doe.com</span> / <span className="text-blue-600">johndoe123</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
