// pages/dashboard.tsx

"use client"

import axios from 'axios';
import { useState } from 'react';

const DashboardPage = () => {
const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [objectId, setObjectId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setObjectId(null); // Reset objectId on file change
    setProgress(0); // Reset progress on file change
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
        },
         onUploadProgress: (progressEvent) => {
          if (progressEvent.total) { // Ensure total is not undefined
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
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
     <div className="flex justify-center items-center min-h-screen bg-blue-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-2/3 max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">File upload</h1>
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg mb-4">
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
          <p className="mt-2 text-sm text-gray-500">Drag and drop or <a href="#" className="text-blue-600 hover:underline">browse</a> your files.</p>
        </div>
        {file && (
          <div className="mb-4">
            <p className="mb-1 text-sm text-gray-700">{file.name}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="mt-1 text-sm text-gray-500">{`${(file.size / (1024 * 1024)).toFixed(2)} MB`}</p>
            {isLoading && <p className="mt-1 text-sm text-gray-500">Uploading... {progress}%</p>}
          </div>
        )}
        <button
          onClick={handleFileUpload}
          disabled={isLoading}
          className="w-full bg-purple-600 text-white py-2 rounded-lg mt-4 hover:bg-purple-700 transition-colors"
        >
          {isLoading ? 'Uploading...' : 'Done'}
        </button>
        {objectId && <p className="mt-4 text-green-600">File Successfully Uploaded with the ObjectID: {objectId}</p>}
      </div>
    </div>
    </>
  );
};

export default DashboardPage;
