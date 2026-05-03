import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
import { useNotification } from '../contexts/NotificationContext';
import { UserData } from '../types';
import { MapPin, Camera, Clock, CheckCircle, Video, Loader2, User as UserIcon, RefreshCw } from 'lucide-react';
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
        try {
            if (streamRef.current) {
                stopCamera();
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: mode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Important for mobile autoplay
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => console.error("Video play error:", e));
                };
            }
            streamRef.current = stream;
            setCameraActive(true);
            setFacingMode(mode);
        } catch (err) {
            console.error("Camera access error:", err);
            showNotification('error', 'Unable to access camera: ' + (err as Error).message);
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
        if (videoRef.current && videoRef.current.readyState >= 2) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setPhoto(dataUrl);
                stopCamera();
            }
        } else {
            showNotification('warning', 'Camera not ready yet');
        }
    };

    const getLocation = () => {
        setFetchingLocation(true);
        if (!navigator.geolocation) {
            showNotification('error', 'Geolocation is not supported by your browser');
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
                showNotification('success', 'Location captured successfully');
            },
            (err) => {
                console.error("GPS Error:", err);
                showNotification('error', 'Unable to retrieve your location. Please check GPS settings.');
                setFetchingLocation(false);
            }
        );
    };

    const handleCheckIn = async (type: 'check-in' | 'check-out') => {
        if (!userData?.uid) {
            showNotification('error', 'User not authenticated');
            return;
        }
        if (!photo) {
            showNotification('error', 'Please capture a photo first');
            return;
        }
        if (!location) {
            showNotification('error', 'Please capture your location first');
            return;
        }

        setLoading(true);
        try {
            showNotification('info', 'Uploading photo...');
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
            showNotification('success', `Successfully ${type === 'check-in' ? 'checked in' : 'checked out'}`);

            setPhoto(null);
            setLocation(null);
        } catch (err) {
            console.error(err);
            showNotification('error', 'Failed to process attendance record');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <div className="p-4 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <MapPin size={100} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Daily Attendance</h2>
                <p className="text-gray-500 text-sm mb-6">Capture your presence with photo and GPS location.</p>

                <div className="space-y-4 relative z-10">
                    {/* Camera Section */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        {photo ? (
                            <div className="relative rounded-lg overflow-hidden h-48 w-full max-w-xs mx-auto">
                                <img src={photo} alt="Current" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setPhoto(null)}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                                >
                                    Retake
                                </button>
                            </div>
                        ) : cameraActive ? (
                            <div className="relative rounded-lg overflow-hidden h-48 w-full max-w-xs mx-auto bg-black">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                                    <button
                                        onClick={capturePhoto}
                                        className="bg-white text-blue-500 rounded-full px-4 py-2 font-bold shadow-lg flex items-center space-x-2 active:scale-95 transition-transform"
                                    >
                                        <Camera size={20} />
                                        <span>Capture</span>
                                    </button>
                                    <button
                                        onClick={toggleCamera}
                                        className="bg-gray-800/50 text-white p-2 rounded-full backdrop-blur-md"
                                        title="Switch Camera"
                                    >
                                        <RefreshCw size={20} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => startCamera('environment')}
                                className="w-full h-32 border-2 border-dashed border-blue-300 dark:border-blue-900 rounded-xl flex flex-col items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Video size={32} className="mb-2" />
                                <span className="font-semibold">Tap to Open Camera</span>
                                <span className="text-[10px] opacity-70">Requires permission</span>
                            </button>
                        )}
                    </div>

                    {/* Location Section */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${location ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{location ? 'Location Ready' : 'Location Required'}</p>
                                {location && <p className="text-xs text-gray-500 max-w-[150px] truncate">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>}
                            </div>
                        </div>
                        {!location && (
                            <button
                                onClick={getLocation}
                                disabled={fetchingLocation}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center"
                            >
                                {fetchingLocation ? <Loader2 className="animate-spin w-4 h-4" /> : 'Get Location'}
                            </button>
                        )}
                        {location && (
                            <CheckCircle className="text-green-500" size={24} />
                        )}
                    </div>

                    {/* Actions Section */}
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <button
                            onClick={() => handleCheckIn('check-in')}
                            disabled={loading || !photo || !location}
                            className="py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-colors shadow-md"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Clock size={20} />}
                            <span>Check In</span>
                        </button>

                        <button
                            onClick={() => handleCheckIn('check-out')}
                            disabled={loading || !photo || !location}
                            className="py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-colors shadow-md"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Clock size={20} />}
                            <span>Check Out</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Attendance History */}
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300 ml-2">Recent Records</h3>
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
        return <div className="p-4 text-center text-gray-500 text-sm">No recent attendance records.</div>;
    }

    return (
        <div className="space-y-3 pb-24">
            {history.slice(0, 5).map(record => (
                <div key={record.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
                    {record.photoUrl ? (
                        <img src={record.photoUrl} alt="Check-in" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <UserIcon size={20} className="text-gray-400" />
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <span className={`font-semibold text-sm ${record.type === 'check-in' ? 'text-blue-600' : 'text-orange-500'}`}>
                                {record.type === 'check-in' ? 'Check In' : 'Check Out'}
                            </span>
                            <span className="text-xs text-gray-500">
                                {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 truncate">
                            {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : ''} • {record.location?.lat.toFixed(2)}, {record.location?.lng.toFixed(2)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};
