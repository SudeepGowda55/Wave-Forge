"use client"

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Amp } from '@/components/Motion';
import { SITE } from '@/lib/site';

const Field = dynamic(() => import('@/components/Field'), { ssr: false });

const SignupPage: React.FC = () => {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedUsermail = localStorage.getItem('usermail');
    if (storedUsername && storedUsermail) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${SITE.api}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstname: firstName,
          username: username,
          usermail: email,
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        // 409 = email already registered; the gateway relays the auth service's message
        throw new Error(typeof data === 'string' ? data : 'Failed to signup');
      }

      localStorage.setItem('username', data.firstname);
      localStorage.setItem('usermail', email);
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      setError(error instanceof Error ? error.message : 'Signup failed. Check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { id: 'firstName', label: 'First name', type: 'text', value: firstName, set: setFirstName, auto: 'given-name' },
    { id: 'username', label: 'Username', type: 'text', value: username, set: setUsername, auto: 'username' },
    { id: 'email', label: 'Email', type: 'email', value: email, set: setEmail, auto: 'email' },
    { id: 'password', label: 'Password (8+ characters)', type: 'password', value: password, set: setPassword, auto: 'new-password' },
  ];

  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col justify-center px-4 pb-16 pt-28 sm:px-8 lg:pl-[max(2rem,calc((100vw-90rem)/2+2rem))]">
        <Amp text="Tune in." className="title text-[clamp(2.2rem,5.5vw,5rem)]" />
        <p className="mt-4 max-w-sm text-fg/75" data-reveal>Your email is where the converted audio link is sent.</p>

        <form onSubmit={handleSignup} className="plate mt-10 w-full max-w-md space-y-5 p-6" data-reveal>
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
                minLength={f.type === 'password' ? 8 : undefined}
                required
              />
            </div>
          ))}
          <button type="submit" disabled={isLoading} className="key-rec w-full" data-magnetic>
            <span className="h-2.5 w-2.5 rounded-full bg-void" aria-hidden="true" />
            {isLoading ? 'Signing up…' : 'Sign up'}
          </button>
          {error && <p role="alert" className="font-read text-xs font-medium text-rose">{error}</p>}
          <p className="font-read text-xs text-ink/70">Already have an account? <Link href="/signin" className="font-bold text-ink underline underline-offset-4">Sign in</Link></p>
        </form>
      </div>
      <div className="relative hidden overflow-hidden border-l border-cyan/10 lg:block">
        <Field mode="auto" className="absolute inset-0" />
        <p className="absolute bottom-6 left-6 bg-void/80 px-2 py-1 font-read text-[11px] uppercase tracking-[0.14em] text-cyan">Simulation · listen → extract → understand → speak</p>
      </div>
    </div>
  );
};

export default SignupPage;
