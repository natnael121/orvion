import React, { useEffect, useState, useRef } from 'react';
import { collection, query, getDocs, where, limit } from 'firebase/firestore';
import { useFirebase } from '../../contexts/FirebaseContext';
import { MapPin, Users, Clock, Navigation, X } from 'lucide-react';

interface OperationsMapProps {
    userData: any;
}

export const OperationsMap: React.FC<OperationsMapProps> = ({ userData }) => {
    const { db } = useFirebase();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Initialize Leaflet via CDN to avoid npm complexity
    useEffect(() => {
        const loadLeaflet = () => {
            if (window.L) {
                setMapLoaded(true);
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => setMapLoaded(true);
            document.head.appendChild(script);
        };

        loadLeaflet();
    }, []);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                // Fetch last 50 attendance records from today/yesterday for the map
                const q = query(
                    collection(db, 'attendance'),
                    limit(50)
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter(r => r.location && r.location.lat && r.location.lng);
                setRecords(data);
            } catch (e) {
                console.error("Map fetch error", e);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [db]);

    useEffect(() => {
        if (!mapLoaded || !mapRef.current || records.length === 0) return;

        // Initialize map
        const L = (window as any).L;
        const mapContainer = mapRef.current;

        // Clear existing map instance if it exists
        if ((mapContainer as any)._leaflet_id) return;

        const map = L.map(mapRef.current).setView([records[0].location.lat, records[0].location.lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const markers = L.featureGroup();

        records.forEach(record => {
            const marker = L.marker([record.location.lat, record.location.lng])
                .bindPopup(`
                    <div style="font-family: sans-serif; min-width: 150px;">
                        <b style="color: #1e293b; display: block; margin-bottom: 4px;">${record.userName}</b>
                        <span style="font-size: 10px; color: ${record.type === 'check-in' ? '#2563eb' : '#ea580c'}; font-weight: bold; text-transform: uppercase;">
                            ${record.type}
                        </span>
                        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                            ${new Date(record.timestamp?.toDate ? record.timestamp.toDate() : record.timestamp).toLocaleString()}
                        </div>
                        ${record.photoUrl ? `<img src="${record.photoUrl}" style="width: 100%; height: 80px; object-cover; border-radius: 8px; margin-top: 8px;"/>` : ''}
                    </div>
                `);

            marker.on('click', () => setSelectedRecord(record));
            markers.addLayer(marker);
        });

        markers.addTo(map);
        if (records.length > 0) {
            map.fitBounds(markers.getBounds(), { padding: [50, 50] });
        }

        return () => {
            map.remove();
        };
    }, [mapLoaded, records]);

    return (
        <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-lg overflow-hidden relative">
                <div className="flex items-center space-x-3 relative z-10">
                    <div className="p-3 bg-white/10 backdrop-blur rounded-xl">
                        <Navigation className="text-cyan-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tracking-tight">Fleet Intelligence</h3>
                        <p className="text-blue-300 text-[10px] uppercase font-bold tracking-widest">Live Presence Map • OpenStreetMap</p>
                    </div>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <MapPin size={100} />
                </div>
            </div>

            <div className="relative bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border-4 border-white dark:border-gray-700 shadow-2xl" style={{ height: '400px' }}>
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 z-20">
                        <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                        <span className="text-xs font-bold text-gray-400">LOADING OPERATIONS MAP...</span>
                    </div>
                )}
                <div ref={mapRef} className="w-full h-full z-10" />
            </div>

            {selectedRecord && (
                <div className="fixed inset-x-4 bottom-24 z-50 animate-in slide-in-from-bottom duration-300">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-2xl border border-blue-100 dark:border-gray-700 max-w-sm mx-auto flex items-center space-x-4">
                        <div className="relative">
                            <img src={selectedRecord.photoUrl} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500" alt="Selected" />
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="absolute -top-2 -right-2 bg-gray-900 text-white p-1 rounded-full shadow-lg"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-gray-800 dark:text-white text-sm">{selectedRecord.userName}</h4>
                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">{selectedRecord.type} VERIFIED</p>
                            <div className="flex items-center text-[10px] text-gray-400 font-bold">
                                <Clock size={10} className="mr-1" />
                                <span>{new Date(selectedRecord.timestamp?.toDate ? selectedRecord.timestamp.toDate() : selectedRecord.timestamp).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Legend</h4>
                <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Personnel Online</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Historical Fix</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Loader2 = ({ className, size }: { className?: string; size?: number }) => (
    <div className={className}>
        <RefreshCw size={size} className="animate-spin" />
    </div>
);

const RefreshCw = ({ size, className }: { size?: number; className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
    </svg>
);
