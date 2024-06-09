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
       localStorage.setItem('username', firstName);
      localStorage.setItem('usermail', email);
      localStorage.setItem('token',data);
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
    }
  };

  return (
   <div className="flex min-h-screen">
      <div className="w-1/2 flex flex-col justify-center items-center p-8">
        <h1 className="text-4xl font-bold mb-10">Create an account</h1>
      
        <div className="w-full max-w-sm">
          <div className="mb-4">
            <label htmlFor="firstName" className="block text-gray-700">FirstName</label>
            <input
              type="text"
              id="firstName"
              className="w-full p-2 border border-gray-300 rounded mt-1"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700">Username</label>
            <input
              type="text"
              id="username"
              className="w-full p-2 border border-gray-300 rounded mt-1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              className="w-full p-2 border border-gray-300 rounded mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              className="w-full p-2 border border-gray-300 rounded mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            onClick={handleSignup}
            className="w-full text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700 p-2  mt-4"
          >
            Sign up
          </button>
        </div>
        {jwtToken && <p className="mt-4">JWT Token: {jwtToken}</p>}
      </div>
     <div className="w-1/2 bg-gray-100 flex justify-center items-center ">
        <video
        key="background-video"
          className="w-full h-full object-cover"
          //controls
          autoPlay
          loop
          muted
           playsInline
          src="https://cdn.dribbble.com/uploads/48226/original/b8bd4e4273cceae2889d9d259b04f732.mp4?1689028949"
        />
      </div>
    </div>
  );
};
//https://cdn.dribbble.com/uploads/48226/original/b8bd4e4273cceae2889d9d259b04f732.mp4?1689028949
export default SignupPage;
