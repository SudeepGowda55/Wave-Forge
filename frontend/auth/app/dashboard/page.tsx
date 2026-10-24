"use client"

import axios from 'axios';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Split } from '@/components/Motion';

interface FileData {
  fileid: string;
  filename: string;
  fileurl: string;
  destaudioformat: string;
  samplingrate: string;
}

// decorative waveform glyph seeded by the file id, so each file gets a stable silhouette
function Glyph({ seed }: { seed: string }) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bars = Array.from({ length: 18 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    return 3 + ((h >>> 16) % 14) * Math.sin(((i + 1) / 19) * Math.PI);
  });
  return (
    <svg width="72" height="24" viewBox="0 0 72 24" aria-hidden="true" className="shrink-0">
      {bars.map((b, i) => (
        <rect key={i} x={i * 4} y={12 - b / 2} width="2" height={b} rx="1" fill={i % 3 ? '#ff5b1f' : '#ffb648'} />
      ))}
    </svg>
  );
}

const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usermail, setUsermail] = useState<string | undefined>(undefined);

  useEffect(() => {
    const storedUsermail = localStorage.getItem('usermail');
    if (storedUsermail) {
      setUsermail(storedUsermail);
    }
  }, []);

  const handleGetFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('https://endless-cassy-sudeep-project-a4da03fb.koyeb.app/getfiles', null, {
        headers: {
          'usermail': usermail,
        },
      });

      if (response.status === 200) {
        const filesData = Array.isArray(response.data) ? response.data : JSON.parse(response.data);
        setFiles(filesData);
      } else {
        console.error('Error fetching files', response.data);
        setError('Could not fetch files.');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Could not fetch files. Is the gateway up?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-6xl px-4 pb-24 pt-32 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-5" data-reveal>Your library</p>
          <Split text="Forged files" className="font-display text-5xl font-extrabold tracking-[-0.03em] sm:text-7xl" />
        </div>
        <Link href="/upload" className="btn-hot" data-magnetic>Upload ↑</Link>
      </div>

      <form onSubmit={handleGetFiles} className="panel mt-10 flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5" data-reveal>
        <label className="flex-1">
          <span className="label">Account email</span>
          <input
            type="email"
            value={usermail ?? ''}
            onChange={(e) => setUsermail(e.target.value)}
            placeholder="Enter your email"
            className="field"
            required
          />
        </label>
        <button type="submit" disabled={isLoading} className="btn-hot sm:min-w-[10rem]" data-magnetic>
          {isLoading ? 'Loading…' : 'Get files'}
        </button>
      </form>
      {error && <p role="alert" className="mt-4 font-mono text-xs text-ember">{error}</p>}

      {files && files.length === 0 && (
        <p className="mt-16 text-center font-mono text-sm text-ash">No files yet. <Link href="/upload" className="text-amber hover:underline">Upload your first video</Link>.</p>
      )}

      {files && files.length > 0 && (
        <div className="mt-10 overflow-x-auto rounded-2xl border border-line" data-lenis-prevent>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-coal">
              <tr className="label">
                <th className="px-5 py-4 font-medium">File</th>
                <th className="px-5 py-4 font-medium">File ID</th>
                <th className="px-5 py-4 font-medium">Audio Format</th>
                <th className="px-5 py-4 font-medium">Sampling Rate</th>
                <th className="px-5 py-4 font-medium">File URL</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, i) => (
                <tr
                  key={file.fileid}
                  className="border-t border-line transition-colors hover:bg-bone/[0.03] motion-safe:animate-[rowIn_600ms_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-3 font-semibold"><Glyph seed={file.fileid} />{file.filename}</span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-ash">{file.fileid}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-amber/40 px-2.5 py-1 font-mono text-[11px] uppercase text-amber">{file.destaudioformat}</span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{file.samplingrate}</td>
                  <td className="px-5 py-4">
                    {file.fileurl ? (
                      <a href={file.fileurl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-amber hover:underline">
                        Open ↗
                      </a>
                    ) : (
                      <span className="font-mono text-xs text-ash">forging…</span>
                    )}
                  </td>
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
