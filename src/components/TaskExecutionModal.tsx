import React, { useState } from 'react'
import { updateDoc, doc, arrayUnion, collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useNotification } from '../contexts/NotificationContext'
import { uploadImageToImgBB } from '../services/imgbbService'
import { X, Camera, MapPin, CheckCircle, AlertTriangle, Send, Package } from 'lucide-react'

interface TaskExecutionModalProps {
    task: any
    onClose: () => void
    onRefresh: () => void
    userData: any
}

export const TaskExecutionModal: React.FC<TaskExecutionModalProps> = ({ task, onClose, onRefresh, userData }) => {
    const { db } = useFirebase()
    const { showNotification } = useNotification()

    const [submitting, setSubmitting] = useState(false)
    const [view, setView] = useState<'details' | 'log' | 'materials' | 'finish'>('details')

    // Log state
    const [logNote, setLogNote] = useState('')
    const [logPhoto, setLogPhoto] = useState<File | null>(null)
    const [isIssue, setIsIssue] = useState(false)

    // Finish state
    const [completedQty, setCompletedQty] = useState('')
    const [finishPhoto, setFinishPhoto] = useState<File | null>(null)

    // Materials state
    const [materialName, setMaterialName] = useState('')
    const [materialQty, setMaterialQty] = useState('')

    const handleAddLog = async () => {
        if (!logNote && !logPhoto) return
        setSubmitting(true)
        try {
            let photoUrl = ''
            if (logPhoto) {
                photoUrl = await uploadImageToImgBB(logPhoto)
            }

            // get geoloc
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const newLog = {
                    note: logNote,
                    photoUrl,
                    isIssue,
                    timestamp: new Date(),
                    loggedBy: userData.uid,
                    location: {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    }
                }

                await updateDoc(doc(db, 'tasks', task.id), {
                    progressLogs: arrayUnion(newLog)
                })

                showNotification('success', 'Log added!')
                setLogNote('')
                setLogPhoto(null)
                setIsIssue(false)
                setSubmitting(false)
                onRefresh()
                setView('details')
            }, (err) => {
                showNotification('error', 'Location access required to log.')
                setSubmitting(false)
            })
        } catch (e) {
            console.error(e)
            showNotification('error', 'Failed to add log')
            setSubmitting(false)
        }
    }

    const handleFinishTask = async () => {
        if (!completedQty) {
            showNotification('error', 'Complete quantity required')
            return
        }
        setSubmitting(true)
        try {
            let photoUrl = ''
            if (finishPhoto) {
                photoUrl = await uploadImageToImgBB(finishPhoto)
            }

            navigator.geolocation.getCurrentPosition(async (pos) => {
                await updateDoc(doc(db, 'tasks', task.id), {
                    status: 'verification_pending',
                    completedAt: new Date(),
                    completedQty,
                    finalProofPhoto: photoUrl,
                    endLocation: {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    }
                })
                showNotification('success', 'Task submitted for verification!')
                setSubmitting(false)
                onRefresh()
                onClose()
            }, (err) => {
                showNotification('error', 'Location required to finish task')
                setSubmitting(false)
            })
        } catch (e) {
            console.error(e)
            showNotification('error', 'Failed to finish task')
            setSubmitting(false)
        }
    }

    const handleRequestMaterial = async () => {
        if (!materialName || !materialQty) return
        setSubmitting(true)
        try {
            await addDoc(collection(db, 'material_requests'), {
                taskId: task.id,
                taskTitle: task.title,
                teamId: task.assignedToTeam,
                materialName,
                quantity: materialQty,
                requestedBy: userData.uid,
                status: 'pending',
                timestamp: new Date()
            })
            showNotification('success', 'Material requested from store')
            setMaterialName('')
            setMaterialQty('')
            setSubmitting(false)
        } catch (e) {
            console.error(e)
            showNotification('error', 'Failed to request material')
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">Task Execution</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 overflow-x-auto hide-scrollbar">
                    <button onClick={() => setView('details')} className={`flex-none px-4 py-3 text-sm font-bold ${view === 'details' ? 'bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Details</button>
                    <button onClick={() => setView('log')} className={`flex-none px-4 py-3 text-sm font-bold ${view === 'log' ? 'bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Logs</button>
                    <button onClick={() => setView('materials')} className={`flex-none px-4 py-3 text-sm font-bold ${view === 'materials' ? 'bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Materials</button>
                    <button onClick={() => setView('finish')} className={`flex-none px-4 py-3 text-sm font-bold ${view === 'finish' ? 'bg-white dark:bg-gray-800 text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Finish</button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {view === 'details' && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-bold">{task.title}</h2>
                                <p className="text-gray-500 text-sm mt-1">{task.area}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-sm">
                                <div><span className="text-gray-500 block">Target</span><span className="font-bold">{task.target}</span></div>
                                <div><span className="text-gray-500 block">Deadline</span><span className="font-bold">{task.deadline}</span></div>
                                <div><span className="text-gray-500 block">Type</span><span className="font-bold">{task.taskType}</span></div>
                                <div><span className="text-gray-500 block">Priority</span><span className={`font-bold ${task.priority === 'Urgent' ? 'text-red-500' : ''}`}>{task.priority}</span></div>
                            </div>

                            <div className="mt-4">
                                <h4 className="font-bold mb-2">Activity Timeline</h4>
                                {(!task.progressLogs || task.progressLogs.length === 0) ? (
                                    <p className="text-gray-400 text-sm italic">No logs recorded yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {task.progressLogs.map((log: any, idx: number) => (
                                            <div key={idx} className={`p-3 rounded-lg border text-sm ${log.isIssue ? 'bg-red-50 border-red-100' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>{new Date(log.timestamp?.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleString()}</span>
                                                    {log.isIssue && <span className="text-red-600 font-bold flex items-center"><AlertTriangle size={12} className="mr-1" /> Issue</span>}
                                                </div>
                                                <p className="text-gray-800 dark:text-gray-200">{log.note}</p>
                                                {log.photoUrl && (
                                                    <img src={log.photoUrl} alt="Progress log" className="mt-2 rounded-lg max-h-32 object-cover" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {view === 'log' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">Record a progress update or report an issue blocking the work.</p>

                            <textarea
                                placeholder="Describe progress or issue..."
                                value={logNote}
                                onChange={e => setLogNote(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 min-h-[100px]"
                            />

                            <div className="flex items-center space-x-2">
                                <input type="checkbox" id="isIssue" checked={isIssue} onChange={e => setIsIssue(e.target.checked)} className="w-4 h-4" />
                                <label htmlFor="isIssue" className="text-red-600 font-bold text-sm">Flag as Warning / Issue</label>
                            </div>

                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                                <input type="file" accept="image/*" capture="environment" onChange={e => setLogPhoto(e.target.files?.[0] || null)} className="hidden" id="log-photo" />
                                <label htmlFor="log-photo" className="cursor-pointer flex flex-col items-center">
                                    <Camera className={`w-8 h-8 mb-2 ${logPhoto ? 'text-green-500' : 'text-gray-400'}`} />
                                    <span className="text-sm text-gray-500 font-medium">
                                        {logPhoto ? 'Photo selected' : 'Tap to take a photo'}
                                    </span>
                                </label>
                            </div>

                            <button
                                onClick={handleAddLog}
                                disabled={submitting || (!logNote && !logPhoto)}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : <><Send size={18} className="mr-2" /> Submit Log</>}
                            </button>
                        </div>
                    )}

                    {view === 'finish' && (
                        <div className="space-y-4 bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-800">
                            <h3 className="font-bold text-green-800 dark:text-green-400 flex items-center">
                                <CheckCircle className="mr-2" /> Finalize Task
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400">This will submit the task to your supervisor for verification.</p>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Completed Quantity / Metric</label>
                                <input
                                    type="text"
                                    placeholder={`Target was: ${task.target}`}
                                    value={completedQty}
                                    onChange={e => setCompletedQty(e.target.value)}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-green-500"
                                    required
                                />
                            </div>

                            <div className="border-2 border-dashed border-green-200 dark:border-green-700 bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
                                <input type="file" accept="image/*" capture="environment" onChange={e => setFinishPhoto(e.target.files?.[0] || null)} className="hidden" id="finish-photo" />
                                <label htmlFor="finish-photo" className="cursor-pointer flex flex-col items-center">
                                    <Camera className={`w-8 h-8 mb-2 ${finishPhoto ? 'text-green-500' : 'text-gray-400'}`} />
                                    <span className="text-sm text-gray-500 font-medium">
                                        {finishPhoto ? 'Final proof photo selected' : 'Take final proof photo (Optional)'}
                                    </span>
                                </label>
                            </div>

                            <button
                                onClick={handleFinishTask}
                                disabled={submitting || !completedQty}
                                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold flex justify-center items-center disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Submit for Verification'}
                            </button>
                        </div>
                    )}

                    {view === 'materials' && (
                        <div className="space-y-4">
                            <h3 className="font-bold flex items-center text-gray-800 dark:text-gray-200">
                                <Package className="mr-2 text-indigo-500" /> Request Materials
                            </h3>
                            <p className="text-sm text-gray-500">Request materials needed to complete this target from the main store.</p>

                            <input
                                type="text"
                                placeholder="Item Name (e.g. Fiber Cable)"
                                value={materialName}
                                onChange={e => setMaterialName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-indigo-500"
                            />

                            <input
                                type="text"
                                placeholder="Quantity (e.g. 600m)"
                                value={materialQty}
                                onChange={e => setMaterialQty(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-indigo-500"
                            />

                            <button
                                onClick={handleRequestMaterial}
                                disabled={submitting || !materialName || !materialQty}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex justify-center items-center disabled:opacity-50"
                            >
                                {submitting ? 'Requesting...' : 'Send Request to Store'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
