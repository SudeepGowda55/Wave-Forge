"use client"

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Amp } from '@/components/Motion';

const SEGMENTS = 40;

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
    <div className="relative z-10 mx-auto grid min-h-screen max-w-[90rem] gap-10 px-4 pb-24 pt-28 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:items-start">
      <div className="lg:sticky lg:top-28">
        <Amp text="Feed the gate." className="title text-[clamp(3.6rem,9vw,8.5rem)]" />
        <p className="mt-5 max-w-sm text-cream/85" data-reveal>
          It goes to GridFS, joins the file_uploaded queue, and you&apos;ll get an email when the audio is ready.
        </p>
      </div>

      <div className="plate p-5 sm:p-7" data-reveal>
        {/* the input covers the whole gate, so native drag-and-drop works */}
        <label
          className={`relative block cursor-pointer border-2 border-ink text-center text-cream transition-colors ${dragging ? 'bg-rec' : 'bg-ink hover:bg-[#151a45]'}`}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
        >
          <div className="sprockets h-3" aria-hidden="true" />
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Choose a video file"
          />
          <div className="px-6 py-10">
            <p className="title text-4xl">{dragging ? 'Let go.' : 'Drop a video here'}</p>
            <p className="mt-2 text-sm text-cream/75">Drag and drop or <span className="font-bold underline underline-offset-4">browse</span> your files. MP4 works best.</p>
          </div>
          <div className="sprockets h-3" aria-hidden="true" />
        </label>

        {file && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="truncate font-bold">{file.name}</p>
              <p className="shrink-0 font-read text-xs text-ink/60">{`${(file.size / (1024 * 1024)).toFixed(2)} MB`}</p>
            </div>
            {/* upload progress as a segmented level meter */}
            <div
              className="mt-3 flex h-6 gap-[3px] border-2 border-ink bg-ink p-1"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Upload progress"
            >
              {Array.from({ length: SEGMENTS }, (_, i) => {
                const lit = (i / SEGMENTS) * 100 < progress;
                return <span key={i} className={`flex-1 transition-colors duration-150 ${lit ? (i > SEGMENTS * 0.85 ? 'bg-cream' : 'bg-rec') : 'bg-cream/10'}`} />;
              })}
            </div>
            {isLoading && <p className="mt-2 font-read text-xs text-rec">Uploading... {progress}%</p>}
          </div>
        )}

        <fieldset className="mt-8">
          <legend className="tag">File Type</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {['mp3', 'wav'].map((t) => (
              <label
                key={t}
                className={`key cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ink ${fileType === t ? 'translate-y-[5px] bg-ink text-cream !shadow-none' : 'bg-white text-ink'}`}
              >
                <input type="radio" name="filetype" value={t} checked={fileType === t} onChange={(e) => setFileType(e.target.value)} className="sr-only" />
                <span className={`led ${fileType === t ? 'led-on' : '!bg-ink/20'}`} aria-hidden="true" />
                {t}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-7">
          <label htmlFor="samplingrate" className="tag">Sampling Rate</label>
          <select
            id="samplingrate"
            value={isCustom ? 'custom' : samplingRate}
            onChange={handleSamplingRateChange}
            className="slot cursor-pointer !bg-ink !text-cream"
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
              className="slot"
            />
          )}
        </div>

        <button onClick={handleFileUpload} disabled={isLoading} className="key-rec mt-8 w-full" data-magnetic>
          <span className="h-2.5 w-2.5 rounded-full bg-cream" aria-hidden="true" />
          {isLoading ? 'Uploading...' : 'Upload'}
        </button>
        {error && <p role="alert" className="mt-4 font-read text-xs font-medium text-rec">{error}</p>}

        {objectId && (
          <div className="mt-6 border-2 border-ink bg-white p-5">
            <p className="font-read text-xs">File Successfully Uploaded with the ObjectID: <span className="break-all font-medium text-rec">{objectId}</span></p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={handleReupload} className="key-cream">Reupload</button>
              <button onClick={handleDone} className="key-rec">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
