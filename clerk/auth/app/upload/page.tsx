// pages/signup.tsx
"use client"

import axios from 'axios';
import React, { useState } from 'react';

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    usermail: '',
    password: '',
    firstname: '',
    lastname: '',
    username: '',
  });

  const [signupStatus, setSignupStatus] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://172.17.0.2:8000/signup', formData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setSignupStatus(`Signup successful: ${response.data.message}`);
    } catch (error) {
        //@ts-ignore
      setSignupStatus(`Signup failed: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>User Signup</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="usermail"
          placeholder="Email"
          value={formData.usermail}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="firstname"
          placeholder="First Name"
          value={formData.firstname}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="lastname"
          placeholder="Last Name"
          value={formData.lastname}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <button type="submit">Submit</button>
      </form>
      {signupStatus && <p>{signupStatus}</p>}
    </div>
  );
};

export default SignupPage;
