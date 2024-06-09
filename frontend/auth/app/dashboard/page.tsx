"use client"

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface FileData {
  fileid: string;
  filename: string;
  fileurl: string;
  destaudioformat: string;
  samplingrate: string;
}

const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usermail, setUsermail] = useState<string | undefined>(undefined);
  const router = useRouter();

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
        const filesData = Array.isArray(response.data) ? response.data : JSON.parse(response.data);
        setFiles(filesData);
      } else {
        console.error('Error fetching files', response.data);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadRedirect = () => {
    router.push('/upload');
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
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
        <button
          onClick={handleUploadRedirect}
          className="absolute top-4 right-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upload
        </button>
      </div>
      {files && (
        <div className="mt-6 w-full max-w-4xl ">
          <table className="min-w-full bg-white border border-gray-200 ">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">File ID</th>
                <th className="py-2 px-4 border-b">Filename</th>
                <th className="py-2 px-4 border-b">Audio Format</th>
                <th className="py-2 px-4 border-b">Sampling Rate</th>
                <th className="py-2 px-4 border-b">File URl</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.fileid}>
                  <td className="py-2 px-4 border-b">{file.fileid}</td>
                  <td className="py-2 px-4 border-b">{file.filename}</td>
                  <td className="py-2 px-4 border-b">{file.destaudioformat}</td>
                  <td className="py-2 px-4 border-b">{file.samplingrate}</td>
                  <td className="py-2 px-4 border-b">{file.fileurl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FilesPage;
