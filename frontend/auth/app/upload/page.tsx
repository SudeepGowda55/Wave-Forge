"use client"

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Split } from '@/components/Motion';

// fixed bar heights for the progress waveform (decorative)
const BARS = Array.from({ length: 56 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 0.9) * Math.sin(i * 0.23 + 1)));

const DashboardPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [objectId, setObjectId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [usermail, setUsermail] = useState<string | null>(null);
  const [firstname, setfirstname] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const [fileType, setFileType] = useState<string>('mp3');

  const router = useRouter();
  const [samplingRate, setSamplingRate] = useState<string>('n/a');
  const [customSamplingRate, setCustomSamplingRate] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  useEffect(() => {
    const storedUsermail = localStorage.getItem('usermail');
    if (storedUsermail) {
      setUsermail(storedUsermail);
    }
  }, []);
  useEffect(() => {
    const storedfirstname = localStorage.getItem('username');
    if (storedfirstname) {
      setfirstname(storedfirstname);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setObjectId(null); // Reset objectId on file change
    setProgress(0); // Reset progress on file change
    setDragging(false);
  };
  const handleSamplingRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      setSamplingRate(value);
    }
  };

  const handleCustomSamplingRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomSamplingRate(value);
    setSamplingRate(value);
  };
  const handleFileUpload = async () => {
    setError('');
    if (!file) {
      console.error('No file selected');
      setError('Choose a video first.');
      return;
    }
    if (!usermail) {
      console.error('No user email found');
      setError('No account found on this device. Sign up first.');
      return;
    }
    if (!firstname) {
      console.error('No firstname found');
      setError('No account found on this device. Sign up first.');
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append('firstname', firstname)
    formData.append('sourcefile', file);
    formData.append('usermail', usermail); // Use email from local storage
    formData.append('destaudioformat', fileType); // Use selected file type
    formData.append('samplingrate', samplingRate); // Use selected sampling rate

    try {
      const response = await axios.post('https://endless-cassy-sudeep-project-a4da03fb.koyeb.app/upload', formData, {
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
        setError('The gateway rejected the file.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Upload failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReupload = () => {
    setFile(null);
    setObjectId(null);
    setProgress(0);
  };

  const handleDone = () => {
    router.push('/dashboard');
  };

  return (
    <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl gap-10 px-4 pb-24 pt-32 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <div className="lg:sticky lg:top-32">
        <p className="eyebrow mb-5" data-reveal>Intake</p>
        <Split text="Drop in a video." className="font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-7xl" />
        <p className="mt-5 max-w-sm text-bone/70" data-reveal>
          It goes to GridFS, joins the file_uploaded queue, and you&apos;ll get an email when the audio is ready.
        </p>
      </div>

      <div className="panel p-5 sm:p-8" data-reveal>
        {/* the input covers the whole zone, so native drag-and-drop works */}
        <label
          className={`relative block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-amber bg-amber/5' : 'border-line hover:border-bone/30'}`}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
        >
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Choose a video file"
          />
          <svg className="mx-auto mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffb648" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="font-display text-lg font-semibold">Drag and drop or <span className="text-amber underline-offset-4 hover:underline">browse</span> your files.</p>
          <p className="mt-1 font-mono text-xs text-ash">MP4 works best</p>
        </label>

        {file && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="truncate font-semibold">{file.name}</p>
              <p className="shrink-0 font-mono text-xs text-ash">{`${(file.size / (1024 * 1024)).toFixed(2)} MB`}</p>
            </div>
            {/* upload progress drawn as a waveform that heats up left to right */}
            <div
              className="mt-3 flex h-12 items-center gap-[3px]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Upload progress"
            >
              {BARS.map((b, i) => {
                const lit = (i / BARS.length) * 100 < progress;
                return (
                  <span
                    key={i}
                    className="flex-1 rounded-full transition-colors duration-300"
                    style={{ height: `${b * 100}%`, background: lit ? (i % 3 ? '#ff5b1f' : '#ffb648') : 'rgba(239,230,216,0.12)' }}
                  />
                );
              })}
            </div>
            {isLoading && <p className="mt-2 font-mono text-xs text-amber">Uploading... {progress}%</p>}
          </div>
        )}

        <fieldset className="mt-8">
          <legend className="label">File Type</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {['mp3', 'wav'].map((t) => (
              <label
                key={t}
                className={`cursor-pointer rounded-lg border px-4 py-3 text-center font-mono text-sm uppercase transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber ${fileType === t ? 'border-ember bg-ember/10 text-bone' : 'border-line text-ash hover:border-bone/30'}`}
              >
                <input type="radio" name="filetype" value={t} checked={fileType === t} onChange={(e) => setFileType(e.target.value)} className="sr-only" />
                {t}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6">
          <label htmlFor="samplingrate" className="label">Sampling Rate</label>
          <select
            id="samplingrate"
            value={isCustom ? 'custom' : samplingRate}
            onChange={handleSamplingRateChange}
            className="field cursor-pointer"
          >
            <option value="22400">22400 Hz</option>
            <option value="48000">48000 Hz</option>
            <option value="n/a">n/a (keep original)</option>
            <option value="custom">Custom</option>
          </select>
          {isCustom && (
            <input
              type="number"
              value={customSamplingRate}
              onChange={handleCustomSamplingRateChange}
              placeholder="Enter custom sampling rate"
              aria-label="Custom sampling rate in Hz"
              className="field"
            />
          )}
        </div>

        <button onClick={handleFileUpload} disabled={isLoading} className="btn-hot mt-8 w-full" data-magnetic>
          {isLoading ? 'Uploading...' : 'Upload'}
        </button>
        {error && <p role="alert" className="mt-4 font-mono text-xs text-ember">{error}</p>}

        {objectId && (
          <div className="mt-6 rounded-xl border border-amber/30 bg-amber/5 p-5">
            <p className="font-mono text-xs text-amber">File Successfully Uploaded with the ObjectID: <span className="break-all text-bone">{objectId}</span></p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={handleReupload} className="btn-cold">Reupload</button>
              <button onClick={handleDone} className="btn-hot">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
