"use client"

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Split } from '@/components/Motion';

const Forge = dynamic(() => import('@/components/Forge'), { ssr: false });

const SignupPage: React.FC = () => {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [jwtToken, setJwtToken] = useState('');
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
      const response = await fetch('https://endless-cassy-sudeep-project-a4da03fb.koyeb.app/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstname: firstName,
          username: username,
          usermail: email,
        }),
      });
      console.log('Signup response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to signup');
      }

      const data = await response.json();
      console.log('Signup response data:', data);
      setJwtToken(data.token);

      localStorage.setItem('username', firstName);
      localStorage.setItem('usermail', email);
      localStorage.setItem('token', data);
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      setError('Signup failed. Check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { id: 'firstName', label: 'First name', type: 'text', value: firstName, set: setFirstName, auto: 'given-name' },
    { id: 'username', label: 'Username', type: 'text', value: username, set: setUsername, auto: 'username' },
    { id: 'email', label: 'Email', type: 'email', value: email, set: setEmail, auto: 'email' },
    { id: 'password', label: 'Password', type: 'password', value: password, set: setPassword, auto: 'new-password' },
  ];

  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-4 pb-16 pt-28 sm:px-8 lg:px-16">
        <p className="eyebrow mb-5" data-reveal>Step 0 · Account</p>
        <Split text="Create an account" className="font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-6xl" />
        <p className="mt-4 max-w-sm text-bone/70" data-reveal>Your email is where the converted audio link is sent.</p>

        <form onSubmit={handleSignup} className="mt-10 w-full max-w-sm space-y-5" data-reveal>
          {fields.map((f) => (
            <div key={f.id}>
              <label htmlFor={f.id} className="label">{f.label}</label>
              <input
                type={f.type}
                id={f.id}
                className="field"
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                autoComplete={f.auto}
                required
              />
            </div>
          ))}
          <button type="submit" disabled={isLoading} className="btn-hot mt-2 w-full" data-magnetic>
            {isLoading ? 'Signing up…' : 'Sign up'}
          </button>
          {error && <p role="alert" className="font-mono text-xs text-ember">{error}</p>}
        </form>
        {jwtToken && <p className="mt-4 break-all font-mono text-xs text-ash">JWT Token: {jwtToken}</p>}
      </div>
      <div className="relative hidden overflow-hidden border-l border-line bg-coal/40 lg:block">
        <Forge mode="auto" className="absolute inset-0" />
        <p className="eyebrow absolute bottom-6 left-8">Frame → queue → forge → resample · simulated</p>
      </div>
    </div>
  );
};

export default SignupPage;
