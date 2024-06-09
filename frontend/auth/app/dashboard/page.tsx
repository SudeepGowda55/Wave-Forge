"use client"

import axios from 'axios';
import { useEffect, useState } from 'react';

const FilesPage = () => {
  const [files, setFiles] = useState<string | null>(null);
 // const [usermail, setUsermail] = useState<string>('user@example.com'); // Replace with actual user email
  const [isLoading, setIsLoading] = useState(false);
  const [usermail, setUsermail] = useState<string | undefined>(undefined);

useEffect(() => {
    const storedUsermail = localStorage.getItem('usermail');
    if (storedUsermail) {
      setUsermail(storedUsermail);
    }
  }, []);
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
     <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Welcome to <span className="text-blue-600">MyFolders</span></h1>
          <p className="text-gray-600 mt-2">Easily and safely helps collect and organize your documents</p>
        </div>
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg mb-4">
          <input
            type="email"
            value={usermail}
            onChange={(e) => setUsermail(e.target.value)}
            placeholder="Enter your email"
            className="block w-full text-sm text-gray-900 border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
          />
        </div>
        <button
          onClick={handleGetFiles}
          disabled={isLoading}
          className="w-full bg-purple-600 text-white py-2 rounded-lg mt-4 hover:bg-purple-700 transition-colors"
        >
          {isLoading ? 'Loading...' : 'Get Files'}
        </button>
        {files && (
          <pre className="mt-4 p-4 bg-gray-200 rounded-lg text-sm text-gray-800">{files}</pre>
        )}
      </div>
    </div>
  );
};

export default FilesPage;
