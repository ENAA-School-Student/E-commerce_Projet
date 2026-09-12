import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ firstName: '', lastName: '', email: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(registerForm);
      toast.success('Account created!');
      navigate('/');
    } catch {
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-3xl font-medium tracking-wider">LUXEMART</Link>
        </div>

        <div className="flex border-b border-light mb-8">
          {['Login', 'Register'].map((tab) => (
            <button
              key={tab}
              onClick={() => setIsLogin(tab === 'Login')}
              className={`flex-1 py-3 text-sm font-medium tracking-wide transition-colors border-b-2 ${
                (tab === 'Login' ? isLogin : !isLogin)
                  ? 'border-charcoal text-charcoal' : 'border-transparent text-muted'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">Email</label>
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">Password</label>
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-charcoal text-white py-3 text-sm font-medium tracking-wide hover:bg-charcoal/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <p className="text-center text-xs text-muted mt-4">
              Demo: <span className="text-charcoal">demo@luxemart.com</span> / <span className="text-charcoal">demo123</span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">First Name</label>
                <input
                  type="text"
                  required
                  value={registerForm.firstName}
                  onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                  className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">Last Name</label>
                <input
                  type="text"
                  required
                  value={registerForm.lastName}
                  onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                  className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">Email</label>
              <input
                type="email"
                required
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide uppercase mb-1.5 block text-charcoal/70">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                className="w-full border border-light px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-charcoal text-white py-3 text-sm font-medium tracking-wide hover:bg-charcoal/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
