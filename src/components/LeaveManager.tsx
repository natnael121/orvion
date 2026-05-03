import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
import { useNotification } from '../contexts/NotificationContext';
import { UserData } from '../types';
import { Calendar, FileText, Send, Clock, CheckCircle, XCircle } from 'lucide-react';

interface LeaveManagerProps {
    userData: UserData | null;
}

export const LeaveManager: React.FC<LeaveManagerProps> = ({ userData }) => {
    const { db } = useFirebase();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);

    const [leaveType, setLeaveType] = useState('sick');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    const [history, setHistory] = useState<any[]>([]);

    const fetchHistory = async () => {
        if (!userData?.uid) return;
        try {
            const q = query(collection(db, 'leave_requests'), where('userId', '==', userData.uid), orderBy('submittedAt', 'desc'));
            const snap = await getDocs(q);
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Failed to fetch leave history", e);
        }
    };

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData?.uid, db]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData?.uid) return;
        if (!startDate || !endDate || !reason) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'leave_requests'), {
                userId: userData.uid,
                userName: userData.name || userData.first_name || 'Employee',
                type: leaveType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                status: 'pending',
                submittedAt: new Date()
            });

            showNotification('Leave request submitted successfully', 'success');
            setStartDate('');
            setEndDate('');
            setReason('');
            fetchHistory();
        } catch (err) {
            console.error(err);
            showNotification('Failed to submit request', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircle className="text-green-500 w-5 h-5" />;
            case 'rejected': return <XCircle className="text-red-500 w-5 h-5" />;
            default: return <Clock className="text-orange-500 w-5 h-5" />;
        }
    };

    return (
        <div className="p-4 space-y-6 pb-24">
            {/* Leave Request Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                        <Calendar className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-xl font-bold">Request Time Off</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                        <select
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                        >
                            <option value="sick">Sick Leave</option>
                            <option value="annual">Annual Leave</option>
                            <option value="unpaid">Unpaid Leave</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why do you need this time off?"
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors resize-none"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex justify-center items-center space-x-2 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Clock className="animate-spin" /> : <Send size={18} />}
                        <span>Submit Request</span>
                    </button>
                </form>
            </div>

            {/* Leave History */}
            <div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-3 ml-1">My Requests</h3>
                {history.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <FileText className="mx-auto text-gray-400 mb-2" size={32} />
                        <p className="text-sm text-gray-500">No leave requests found.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map(req => (
                            <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold capitalize text-gray-800 dark:text-gray-200">
                                        {req.type} Leave
                                    </span>
                                    <div className="flex items-center space-x-1 auto text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                                        {getStatusIcon(req.status)}
                                        <span className="capitalize ml-1">{req.status}</span>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg flex items-center justify-between">
                                    <span>
                                        {req.startDate?.toDate ? req.startDate.toDate().toLocaleDateString() : ''}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span>
                                        {req.endDate?.toDate ? req.endDate.toDate().toLocaleDateString() : ''}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{req.reason}"</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
