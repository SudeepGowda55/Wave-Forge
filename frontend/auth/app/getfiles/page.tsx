"use client"

import axios from 'axios';
import { useState } from 'react';

const FilesPage = () => {
  const [files, setFiles] = useState<string | null>(null);
  const [usermail, setUsermail] = useState<string>('user@example.com'); // Replace with actual user email
  const [isLoading, setIsLoading] = useState(false);

  const handleGetFiles = async () => {
    setIsLoading(true);

    try {
      const response = await axios.post('https://kube.nostrclient.social/getfiles', null, {
        headers: {
          'usermail': usermail,
        },
      });

      if (response.status === 200) {
        setFiles(response.data);
      } else {
        console.error('Error fetching files', response.data);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Files</h1>
      <p>Retrieve your files here!</p>
      <input
        type="email"
        value={usermail}
        onChange={(e) => setUsermail(e.target.value)}
        placeholder="Enter your email"
      />
      <button onClick={handleGetFiles} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Get Files'}
      </button>
      {files && <pre>{files}</pre>}
    </div>
  );
};

export default FilesPage;
