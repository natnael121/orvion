import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
import { useNotification } from '../contexts/NotificationContext';
import { UserData } from '../types';
import { MapPin, Camera, CheckCircle, Loader2, RefreshCw, Upload, Search, Users } from 'lucide-react';
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

    // Proxy Check-in States
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [isProxyMode, setIsProxyMode] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const canProxy = userData?.role === 'admin' || userData?.role === 'supervisor';

    useEffect(() => {
        if (canProxy) {
            fetchEmployees();
        }
    }, [canProxy]);

    const fetchEmployees = async () => {
        try {
            const q = query(collection(db, 'shop_customers'), where('shopId', '==', userData?.activeShopId || 'hr-system-company'));
            const snap = await getDocs(q);
            setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Fetch employees error", e);
        }
    };

    const startCamera = async (mode: 'user' | 'environment' = 'environment') => {
        setCameraActive(true);
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
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => console.error("Auto-play prevented", error));
                }
            }
        } catch (err) {
            console.error("Camera access error:", err);
            showNotification('error', 'Camera access failed. Use native camera fallback.');
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
                const width = videoRef.current.videoWidth || 640;
                const height = videoRef.current.videoHeight || 480;
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    if (dataUrl.length < 1000) {
                        showNotification('warning', 'Image capture failed.');
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
            showNotification('error', 'Geolocation not supported');
            setFetchingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                setFetchingLocation(false);
                showNotification('success', 'GPS Secure');
            },
            (err) => {
                console.error("GPS Error:", err);
                showNotification('error', 'GPS failed. Please enable location.');
                setFetchingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleCheckIn = async (type: 'check-in' | 'check-out') => {
        if (!userData?.uid) {
            showNotification('error', 'Auth required');
            return;
        }

        let targetUserId = userData.uid;
        let targetUserName = userData.displayName || 'Employee';

        if (isProxyMode) {
            if (!selectedEmployeeId) {
                showNotification('error', 'Select an employee to check in');
                return;
            }
            const emp = employees.find(e => e.id === selectedEmployeeId);
            targetUserId = emp.id;
            targetUserName = emp.displayName || emp.name || 'Member';
        }

        if (!photo) {
            showNotification('error', 'Capture photo first');
            return;
        }
        if (!location) {
            showNotification('error', 'GPS required');
            return;
        }

        setLoading(true);
        try {
            showNotification('info', 'Processing biometric verification...');
            const photoUrl = await uploadImageToImgBB(photo);

            const attendanceData = {
                userId: targetUserId,
                userName: targetUserName,
                type,
                timestamp: new Date(),
                location,
                photoUrl,
                status: 'completed',
                proxiedBy: isProxyMode ? userData.uid : null,
                proxiedByName: isProxyMode ? userData.displayName : null
            };

            await addDoc(collection(db, 'attendance'), attendanceData);
            showNotification('success', `Attendance for ${targetUserName} saved!`);

            setPhoto(null);
            setLocation(null);
            if (isProxyMode) {
                setIsProxyMode(false);
                setSelectedEmployeeId('');
            }
        } catch (err) {
            console.error(err);
            showNotification('error', 'Submission failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <div className="p-4 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-white">Attendance</h2>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                                {isProxyMode ? '👥 SUPERVISOR PROXY MODE' : '🤳 BIOMETRIC & GPS VERIFICATION'}
                            </p>
                        </div>
                        {canProxy && !isProxyMode && (
                            <button
                                onClick={() => setIsProxyMode(true)}
                                className="bg-blue-600 text-white rounded-xl px-4 py-2 text-[10px] font-black shadow-lg shadow-blue-500/30 flex items-center space-x-1"
                            >
                                <Users size={14} />
                                <span>PROXY MODE</span>
                            </button>
                        )}
                        {isProxyMode && (
                            <button
                                onClick={() => setIsProxyMode(false)}
                                className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-xl px-4 py-2 text-[10px] font-black"
                            >
                                EXIT PROXY
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Proxy Selection */}
                        {isProxyMode && (
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-2 block">SELECT TEAM MEMBER</label>
                                <div className="relative">
                                    <select
                                        value={selectedEmployeeId}
                                        onChange={e => setSelectedEmployeeId(e.target.value)}
                                        className="w-full p-4 bg-white dark:bg-gray-800 rounded-xl outline-none font-bold text-sm border border-blue-200 dark:border-blue-900 appearance-none"
                                    >
                                        <option value="">-- Search Member --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.displayName || emp.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-4 pointer-events-none">
                                        <Search size={18} className="text-blue-500" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Camera Section */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {photo ? (
                                <div className="relative rounded-2xl overflow-hidden h-64 w-full bg-black shadow-inner">
                                    <img src={photo} alt="Current" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setPhoto(null)}
                                        className="absolute bottom-4 right-4 bg-red-600 text-white px-6 py-2 rounded-xl font-black shadow-xl"
                                    >
                                        RETAKE
                                    </button>
                                </div>
                            ) : cameraActive ? (
                                <div className="relative rounded-2xl overflow-hidden h-64 w-full bg-black">
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3 px-4">
                                        <button onClick={capturePhoto} className="bg-white text-blue-600 rounded-2xl px-6 py-4 font-black shadow-2xl flex items-center space-x-2 flex-1 justify-center">
                                            <Camera size={20} />
                                            <span>TAKE DATA PHOTO</span>
                                        </button>
                                        <button onClick={toggleCamera} className="bg-black/40 text-white p-4 rounded-2xl backdrop-blur-md">
                                            <RefreshCw size={24} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => startCamera('environment')}
                                        className="w-full h-40 border-4 border-dashed border-blue-100 dark:border-blue-900/30 rounded-3xl flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800/50 hover:bg-blue-50 transition-all"
                                    >
                                        <div className="bg-blue-600 text-white p-4 rounded-2xl mb-3 shadow-lg shadow-blue-500/40">
                                            <Camera size={32} />
                                        </div>
                                        <span className="font-black text-sm">OPEN FIELD SCANNER</span>
                                    </button>

                                    <label className="w-full py-4 bg-gray-50 dark:bg-gray-700/50 text-gray-500 rounded-2xl font-bold flex items-center justify-center cursor-pointer border border-gray-100 dark:border-gray-600">
                                        <Upload size={18} className="mr-2" />
                                        <span>SYSTEM CAMERA / BROWSE</span>
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Location Section */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-left">
                                <div className={`p-4 rounded-xl ${location ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-xs uppercase text-gray-400 tracking-widest">{location ? 'POS SECURED' : 'GPS AUTH'}</p>
                                    <p className="text-[10px] font-black text-gray-800 dark:text-white truncate max-w-[140px]">
                                        {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Awaiting Satellite fix...'}
                                    </p>
                                </div>
                            </div>
                            {!location ? (
                                <button onClick={getLocation} disabled={fetchingLocation} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black">
                                    {fetchingLocation ? <Loader2 className="animate-spin" /> : 'FETCH GPS'}
                                </button>
                            ) : (
                                <CheckCircle className="text-emerald-500" size={32} />
                            )}
                        </div>

                        {/* Final Actions */}
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <button
                                onClick={() => handleCheckIn('check-in')}
                                disabled={loading || !photo || !location}
                                className="py-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] font-black shadow-xl shadow-blue-500/20 disabled:from-gray-300 active:scale-95 transition-all"
                            >
                                START SHIFT
                            </button>
                            <button
                                onClick={() => handleCheckIn('check-out')}
                                disabled={loading || !photo || !location}
                                className="py-5 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-[2rem] font-black shadow-xl shadow-orange-500/20 disabled:from-gray-300 active:scale-95 transition-all"
                            >
                                END SHIFT
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <h3 className="font-black text-gray-800 dark:text-white px-2 text-lg">Activity Journal</h3>
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
                console.error("Failed history", e);
            }
        };
        fetchHistory();
    }, [userId, db]);

    if (history.length === 0) return null;

    return (
        <div className="space-y-3 pb-24">
            {history.slice(0, 5).map(record => (
                <div key={record.id} className="bg-white dark:bg-gray-800 p-4 rounded-[2rem] shadow-sm border border-gray-50 flex items-center space-x-4">
                    {record.photoUrl && <img src={record.photoUrl} className="w-14 h-14 rounded-2xl object-cover" alt="Log" />}
                    <div className="flex-1">
                        <div className="flex justify-between">
                            <span className={`font-black text-[10px] uppercase ${record.type === 'check-in' ? 'text-blue-600' : 'text-orange-500'}`}>
                                {record.type} {record.proxiedBy ? '• BY SUPERVISOR' : ''}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400">
                                {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleTimeString() : ''}
                            </span>
                        </div>
                        <h4 className="font-black text-xs text-gray-800 dark:text-white mt-1">{record.userName}</h4>
                    </div>
                </div>
            ))}
        </div>
    );
};
