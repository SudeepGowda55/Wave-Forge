"use client"

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Amp } from '@/components/Motion';
import { SITE } from '@/lib/site';

const Field = dynamic(() => import('@/components/Field'), { ssr: false });

const SigninPage: React.FC = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${SITE.api}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usermail: email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Sign in failed');
      }

      localStorage.setItem('username', data.firstname);
      localStorage.setItem('usermail', email);
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (error) {
      console.error('Signin error:', error);
      setError(error instanceof Error ? error.message : 'Sign in failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { id: 'email', label: 'Email', type: 'email', value: email, set: setEmail, auto: 'email' },
    { id: 'password', label: 'Password', type: 'password', value: password, set: setPassword, auto: 'current-password' },
  ];

  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col justify-center px-4 pb-16 pt-28 sm:px-8 lg:pl-[max(2rem,calc((100vw-90rem)/2+2rem))]">
        <Amp text="Welcome back." className="title text-[clamp(1.9rem,4.4vw,4.2rem)]" />
        <p className="mt-4 max-w-sm text-fg/75" data-reveal>Sign in to see your files and start new conversions.</p>

        <form onSubmit={handleSignin} className="plate mt-10 w-full max-w-md space-y-5 p-6" data-reveal>
          {fields.map((f) => (
            <div key={f.id}>
              <label htmlFor={f.id} className="tag">{f.label}</label>
              <input
                type={f.type}
                id={f.id}
                className="slot"
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                autoComplete={f.auto}
                required
              />
            </div>
          ))}
          <button type="submit" disabled={isLoading} className="key-rec w-full" data-magnetic>
            <span className="h-2.5 w-2.5 rounded-full bg-void" aria-hidden="true" />
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
          {error && <p role="alert" className="font-read text-xs font-medium text-rose">{error}</p>}
          <div className="border-t border-fg/10 pt-5 text-center">
            <p className="font-read text-xs text-ink/70">Don&apos;t have an account?</p>
            <Link href="/signup" className="key-cream mt-2 w-full" data-magnetic>
              Create an account
            </Link>
          </div>
        </form>
      </div>
      <div className="relative hidden overflow-hidden border-l border-cyan/10 lg:block">
        <Field mode="auto" className="absolute inset-0" />
        <p className="absolute bottom-6 left-6 bg-void/80 px-2 py-1 font-read text-[11px] uppercase tracking-[0.14em] text-cyan">Simulation · listen → extract → understand → speak</p>
      </div>
    </div>
  );
};

export default SigninPage;
