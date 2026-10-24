"use client"

import axios from 'axios';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Amp } from '@/components/Motion';

interface FileData {
  fileid: string;
  filename: string;
  fileurl: string;
  destaudioformat: string;
  samplingrate: string;
}

// decorative optical-track glyph seeded by the file id, so each file gets a stable silhouette
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
        <rect key={i} x={i * 4} y={12 - b / 2} width="3" height={b} fill={i % 4 ? '#0c0f2a' : '#ff3d2e'} />
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
    <div className="relative z-10 mx-auto min-h-screen max-w-[90rem] px-4 pb-24 pt-28 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Amp text="Cue sheet." className="title text-[clamp(3.6rem,10vw,9rem)]" />
        <Link href="/upload" className="key-rec mb-3" data-magnetic>
          <span className="h-2.5 w-2.5 rounded-full bg-cream" aria-hidden="true" /> Upload
        </Link>
      </div>
      <p className="mt-2 max-w-md text-cream/85" data-reveal>Every file you have fed the deck, with its format, rate and a link once the converter is done.</p>

      <form onSubmit={handleGetFiles} className="plate mt-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-end" data-reveal>
        <label className="flex-1">
          <span className="tag">Account email</span>
          <input
            type="email"
            value={usermail ?? ''}
            onChange={(e) => setUsermail(e.target.value)}
            placeholder="Enter your email"
            className="slot"
            required
          />
        </label>
        <button type="submit" disabled={isLoading} className="key-cream sm:min-w-[11rem]" data-magnetic>
          <span className={`led ${isLoading ? 'led-on' : '!bg-ink/25'}`} aria-hidden="true" />
          {isLoading ? 'Loading…' : 'Get files'}
        </button>
      </form>
      {error && <p role="alert" className="mt-4 inline-block bg-ink px-2 py-1 font-read text-xs text-cream">{error}</p>}

      {!files && (
        <div className="mt-10 border-2 border-dashed border-cream/40 px-6 py-14 text-center" data-reveal>
          <p className="title text-4xl text-cream/80">No cues loaded</p>
          <p className="mt-2 text-sm text-cream/70">Enter the email you signed up with and press Get files.</p>
        </div>
      )}

      {files && files.length === 0 && (
        <p className="mt-16 text-center text-lg">No files yet. <Link href="/upload" className="font-bold underline underline-offset-4">Upload your first video</Link>.</p>
      )}

      {files && files.length > 0 && (
        <div className="plate mt-10 overflow-x-auto" data-lenis-prevent>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink text-cream">
              <tr className="font-read text-[11px] uppercase">
                <th className="px-5 py-3 font-medium">Cue</th>
                <th className="px-5 py-3 font-medium">File</th>
                <th className="px-5 py-3 font-medium">File ID</th>
                <th className="px-5 py-3 font-medium">Audio Format</th>
                <th className="px-5 py-3 font-medium">Sampling Rate</th>
                <th className="px-5 py-3 font-medium">File URL</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, i) => (
                <tr
                  key={file.fileid}
                  className="border-t-2 border-ink/15 transition-colors hover:bg-white motion-safe:animate-[rowIn_500ms_cubic-bezier(0.2,0.9,0.3,1)_both]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <td className="px-5 py-4 font-title text-2xl font-black">{String(i + 1).padStart(2, '0')}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-3 font-bold"><Glyph seed={file.fileid} />{file.filename}</span>
                  </td>
                  <td className="px-5 py-4 font-read text-xs text-ink/60">{file.fileid}</td>
                  <td className="px-5 py-4">
                    <span className="border-2 border-ink px-2 py-0.5 font-read text-[11px] font-medium uppercase">{file.destaudioformat}</span>
                  </td>
                  <td className="px-5 py-4 font-read text-xs">{file.samplingrate}</td>
                  <td className="px-5 py-4">
                    {file.fileurl ? (
                      <a href={file.fileurl} target="_blank" rel="noopener noreferrer" className="font-bold text-rec underline-offset-4 hover:underline">
                        Play ↗
                      </a>
                    ) : (
                      <span className="flex items-center gap-2 font-read text-xs text-ink/60"><span className="led led-on animate-pulse" aria-hidden="true" />converting</span>
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
