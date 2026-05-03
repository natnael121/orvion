import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
import { useNotification } from '../contexts/NotificationContext';
import { UserData } from '../types';
import { MapPin, Camera, Clock, CheckCircle, Video, Loader2, User as UserIcon, RefreshCw, Upload } from 'lucide-react';
import { uploadImageToImgBB } from '../services/imgbbService';

interface AttendanceManagerProps {
    userData: UserData | null;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({ userData }) => {
    const { db } = useFirebase();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = async (mode: 'user' | 'environment' = 'environment') => {
        setCameraActive(true); // Show the UI first
        setFacingMode(mode);

        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: mode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Force play
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error("Auto-play was prevented:", error);
                    });
                }
            }
        } catch (err) {
            console.error("Camera access error:", err);
            showNotification('error', 'Camera access failed. You can use Manual Upload below.');
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const toggleCamera = () => {
        const nextMode = facingMode === 'user' ? 'environment' : 'user';
        startCamera(nextMode);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            try {
                const canvas = document.createElement('canvas');
                // Use actual video dimensions or fallback
                const width = videoRef.current.videoWidth || 640;
                const height = videoRef.current.videoHeight || 480;

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

                    // Simple check if the image is mostly black (optional but helpful)
                    if (dataUrl.length < 1000) {
                        showNotification('warning', 'Image capture failed. Try switching cameras.');
                        return;
                    }

                    setPhoto(dataUrl);
                    stopCamera();
                }
            } catch (e) {
                console.error("Capture Error:", e);
                showNotification('error', 'Failed to capture frame');
            }
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result as string);
                stopCamera();
            };
            reader.readAsDataURL(file);
        }
    };

    const getLocation = () => {
        setFetchingLocation(true);
        if (!navigator.geolocation) {
            showNotification('error', 'Geolocation is not supported');
            setFetchingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setFetchingLocation(false);
                showNotification('success', 'Location secured');
            },
            (err) => {
                console.error("GPS Error:", err);
                showNotification('error', 'GPS failed. Please enable location on your phone.');
                setFetchingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleCheckIn = async (type: 'check-in' | 'check-out') => {
        if (!userData?.uid) {
            showNotification('error', 'Authentication required');
            return;
        }
        if (!photo) {
            showNotification('error', 'Capture photo first');
            return;
        }
        if (!location) {
            showNotification('error', 'GPS location required');
            return;
        }

        setLoading(true);
        try {
            showNotification('info', 'Processing attendance...');
            const photoUrl = await uploadImageToImgBB(photo);

            const attendanceData = {
                userId: userData.uid,
                userName: userData.displayName || 'Employee',
                type,
                timestamp: new Date(),
                location,
                photoUrl,
                status: 'completed'
            };

            await addDoc(collection(db, 'attendance'), attendanceData);
            showNotification('success', `Attendance ${type} successful!`);

            setPhoto(null);
            setLocation(null);
        } catch (err) {
            console.error(err);
            showNotification('error', 'Upload failed. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <div className="p-4 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <MapPin size={120} />
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-white">Daily Presence</h2>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Biometric & GPS Verification</p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                            <Clock className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Camera Section */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {photo ? (
                                <div className="relative rounded-2xl overflow-hidden h-64 w-full bg-black">
                                    <img src={photo} alt="Current" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setPhoto(null)}
                                        className="absolute bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg"
                                    >
                                        Retake Photo
                                    </button>
                                </div>
                            ) : cameraActive ? (
                                <div className="relative rounded-2xl overflow-hidden h-64 w-full bg-black">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3 px-4">
                                        <button
                                            onClick={capturePhoto}
                                            className="bg-white text-blue-600 rounded-2xl px-6 py-3 font-black shadow-xl flex items-center space-x-2 active:scale-90 transition-transform flex-1 justify-center"
                                        >
                                            <Camera size={20} />
                                            <span>TAKE PHOTO</span>
                                        </button>
                                        <button
                                            onClick={toggleCamera}
                                            className="bg-gray-900/40 text-white p-3 rounded-2xl backdrop-blur-md"
                                        >
                                            <RefreshCw size={24} />
                                        </button>
                                        <button
                                            onClick={stopCamera}
                                            className="bg-red-600/20 text-red-600 p-3 rounded-2xl backdrop-blur-md"
                                        >
                                            <Upload className="rotate-180" size={24} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => startCamera('environment')}
                                        className="w-full h-40 border-4 border-dashed border-blue-100 dark:border-blue-900/30 rounded-3xl flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                                    >
                                        <div className="bg-blue-100 dark:bg-blue-900/40 p-4 rounded-full mb-3">
                                            <Camera size={32} />
                                        </div>
                                        <span className="font-black text-sm">OPEN FIELD CAMERA</span>
                                    </button>

                                    <div className="flex items-center space-x-2">
                                        <div className="h-px bg-gray-200 flex-1"></div>
                                        <span className="text-[10px] font-black text-gray-400">OR USE SYSTEM</span>
                                        <div className="h-px bg-gray-200 flex-1"></div>
                                    </div>

                                    <label className="w-full py-4 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-2xl font-bold flex items-center justify-center cursor-pointer active:bg-gray-200">
                                        <Upload size={18} className="mr-2" />
                                        <span>SYSTEM CAMERA / GALLERY</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={handleFileInput}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Location Section */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`p-3 rounded-2xl ${location ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-sm uppercase tracking-tight">{location ? 'Location Secured' : 'GPS Authentication'}</p>
                                    <p className="text-[10px] font-bold text-gray-400 truncate max-w-[140px]">
                                        {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Wait for precision fix'}
                                    </p>
                                </div>
                            </div>
                            {!location ? (
                                <button
                                    onClick={getLocation}
                                    disabled={fetchingLocation}
                                    className="bg-gray-800 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-gray-900/10 disabled:opacity-50"
                                >
                                    {fetchingLocation ? <Loader2 className="animate-spin w-4 h-4" /> : 'FETCH GPS'}
                                </button>
                            ) : (
                                <CheckCircle className="text-emerald-500" size={28} />
                            )}
                        </div>

                        {/* Actions Section */}
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <button
                                onClick={() => handleCheckIn('check-in')}
                                disabled={loading || !photo || !location}
                                className="py-4 bg-gradient-to-br from-indigo-600 to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-[2rem] font-black flex items-center justify-center space-x-2 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Clock size={20} />}
                                <span>CHECK IN</span>
                            </button>

                            <button
                                onClick={() => handleCheckIn('check-out')}
                                disabled={loading || !photo || !location}
                                className="py-4 bg-gradient-to-br from-orange-500 to-red-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-[2rem] font-black flex items-center justify-center space-x-2 transition-all shadow-xl shadow-orange-500/20 active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Clock size={20} />}
                                <span>CHECK OUT</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance History */}
            <h3 className="font-black text-gray-800 dark:text-white px-2 mt-4 text-lg">My Activity Log</h3>
            <AttendanceHistory userId={userData?.uid} />
        </div>
    );
};

const AttendanceHistory: React.FC<{ userId?: string }> = ({ userId }) => {
    const { db } = useFirebase();
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (!userId) return;
        const fetchHistory = async () => {
            try {
                const q = query(collection(db, 'attendance'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
                const snap = await getDocs(q);
                setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Failed to fetch history", e);
            }
        };
        fetchHistory();
    }, [userId, db]);

    if (history.length === 0) {
        return <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">No entries yet.</div>;
    }

    return (
        <div className="space-y-3 pb-24">
            {history.slice(0, 5).map(record => (
                <div key={record.id} className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-50 dark:border-gray-700 flex items-center space-x-4">
                    {record.photoUrl ? (
                        <div className="relative">
                            <img src={record.photoUrl} alt="Check-in" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gray-50 dark:ring-gray-900" />
                            <div className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white ${record.type === 'check-in' ? 'bg-blue-500' : 'bg-orange-500 shadow-lg'}`}>
                                <Clock size={10} />
                            </div>
                        </div>
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <UserIcon size={24} className="text-gray-400" />
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <span className={`font-black text-xs uppercase tracking-wider ${record.type === 'check-in' ? 'text-indigo-600' : 'text-orange-600'}`}>
                                {record.type === 'check-in' ? 'WORK COMMENCED' : 'WORK CONCLUDED'}
                            </span>
                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md">
                                {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                            {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : ''} • GPS VERIFIED
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};
