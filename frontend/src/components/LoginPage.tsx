import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { loginUser } from '../api/client';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginUser(username, password);
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-modal overflow-hidden animate-slide-up border border-border">
        <div className="p-8 text-center bg-surface-alt/50 border-b border-border">
          <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30 mx-auto mb-4">
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Marketing Auto<span className="text-primary-600">AI</span>
          </h1>
          <p className="text-sm text-text-muted mt-2">Sign in to access your agentic workspace</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 font-medium text-center">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-surface-alt border border-border-light rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-surface-alt border border-border-light rounded-xl text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-primary-500/20"
          >
            {loading ? (
              <div className="spinner !w-5 !h-5 !border-white/30 !border-t-white mr-2" />
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
