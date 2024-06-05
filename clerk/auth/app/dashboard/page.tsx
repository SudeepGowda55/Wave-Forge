// pages/dashboard.tsx

"use client"

import axios from 'axios';
import { useState } from 'react';

const DashboardPage = () => {
const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [objectId, setObjectId] = useState<string | null>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleFileUpload = async () => {
    if (!file) {
      console.error('No file selected');
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append('sourcefile', file);
    formData.append('usermail', 'user@example.com'); // Replace with actual user email
    formData.append('destaudioformat', 'mp3'); // Replace with actual destination audio format
    formData.append('samplingrate', '44100'); // Replace with actual sampling rate

    try {
      const response = await axios.post('https://kube.nostrclient.social/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 201) {
        console.log('File Successfully Uploaded with the ObjectID:', response.data);
         setObjectId(response.data); 
      } else {
        console.error('Error in File Data Entry', response.data);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div>
        <h1>Dashboard</h1>
        <p>Welcome to your dashboard!</p>
        <input type="file" onChange={handleFileChange} />
       <button onClick={handleFileUpload} disabled={isLoading}>
        {isLoading ? 'Uploading...' : 'Upload File'}
      </button>
      {objectId && <p>File Successfully Uploaded with the ObjectID: {objectId}</p>}
      </div>
    </>
  );
};

export default DashboardPage;
