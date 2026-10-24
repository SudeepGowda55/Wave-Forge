"use client"

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Amp } from '@/components/Motion';

const Film = dynamic(() => import('@/components/Film'), { ssr: false });

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
    <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col justify-center px-4 pb-16 pt-28 sm:px-8 lg:pl-[max(2rem,calc((100vw-90rem)/2+2rem))]">
        <Amp text="Load a new reel." className="title text-[clamp(3.6rem,8vw,7.5rem)]" />
        <p className="mt-4 max-w-sm text-cream/85" data-reveal>Your email is where the converted audio link is sent.</p>

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
                required
              />
            </div>
          ))}
          <button type="submit" disabled={isLoading} className="key-rec w-full" data-magnetic>
            <span className="h-2.5 w-2.5 rounded-full bg-cream" aria-hidden="true" />
            {isLoading ? 'Signing up…' : 'Sign up'}
          </button>
          {error && <p role="alert" className="font-read text-xs font-medium text-rec">{error}</p>}
        </form>
        {jwtToken && <p className="mt-4 break-all font-read text-xs text-cream/70">JWT Token: {jwtToken}</p>}
      </div>
      <div className="relative hidden overflow-hidden border-l-2 border-ink lg:block">
        <Film mode="auto" className="absolute inset-0" />
        <p className="absolute bottom-6 left-6 bg-ink px-2 py-1 font-read text-[11px] uppercase text-cream">Simulation · picture → queue → sound → samples</p>
      </div>
    </div>
  );
};

export default SignupPage;
