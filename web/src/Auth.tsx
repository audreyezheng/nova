import { useState } from 'react'
import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowPathIcon, 
  SparklesIcon, 
  CpuChipIcon, 
  CalendarIcon, 
  CheckCircleIcon 
} from '@heroicons/react/24/outline'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login, register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isLogin) {
        await login(username, password)
      } else {
        await register(username, email, password, firstName, lastName)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-8 w-8 text-primary" />
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Nova</h1>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                  Beta
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium"
            >
              {isLogin ? 'Need an account?' : 'Already have an account?'}
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-80px)] py-12">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Hero Section */}
          <div className="text-center lg:text-left space-y-8">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                {isLogin ? 'Welcome back to Nova' : 'Meet Nova'}
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {isLogin 
                  ? 'Continue planning with your AI-powered assistant' 
                  : 'Transform your ideas into organized, scheduled action plans with the power of AI'
                }
              </p>
            </div>

            {/* Features Preview (only show on register) */}
            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <CpuChipIcon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">AI Planning</h3>
                  <p className="text-sm text-muted-foreground">Smart task breakdown and prioritization</p>
                </div>
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <CalendarIcon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Smart Scheduling</h3>
                  <p className="text-sm text-muted-foreground">Automatic calendar optimization</p>
                </div>
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <CheckCircleIcon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Task Management</h3>
                  <p className="text-sm text-muted-foreground">Track progress and stay organized</p>
                </div>
              </div>
            )}
          </div>

          {/* Auth Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="shadow-2xl border-0 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">
                  {isLogin ? 'Sign In' : 'Create Account'}
                </CardTitle>
                <CardDescription>
                  {isLogin 
                    ? 'Enter your credentials to access Nova' 
                    : 'Start organizing your tasks with AI'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  {!isLogin && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-lg">
                      {error}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className="w-full"
                    size="lg"
                  >
                    {isLoading && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}