"use client"
// pages/signup.tsx

// pages/signup.tsx

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const SignupPage: React.FC = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jwtToken, setJwtToken] = useState('');

  const handleSignup = async () => {
    try {
      const response = await fetch('https://kube.nostrclient.social/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstname: firstName,
          lastname: lastName,
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
     //   console.log('JWT Token:', data.token); // Log JWT token to console
      setJwtToken(data.token);
      // Redirect after successful signup
      
      if(data)
        console.log("sdfusdfsdf signup")
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
    }
  };

  return (
    <div>
      <h1>Sign Up</h1>
      <div>
        <label htmlFor="firstName">First Name:</label>
        <input
          type="text"
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="lastName">Last Name:</label>
        <input
          type="text"
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="username">Username:</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button onClick={handleSignup}>Sign Up</button>
      {jwtToken && <p>JWT Token: {jwtToken}</p>}
    </div>
  );
};

export default SignupPage;
