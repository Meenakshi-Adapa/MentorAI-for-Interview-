import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, getDocs, query } from 'firebase/firestore';
import { ArrowLeft, Lightbulb, BrainCircuit, CheckCircle, Award, Menu, X, User, Bot, Loader2, RefreshCw, AlertTriangle, Terminal, Send } from 'lucide-react';

// --- Environment Variable Configuration ---
const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG;
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const appId = import.meta.env.VITE_APP_ID || 'default-coding-mentor';
let firebaseConfig = {};
let configError = null;

try {
    if (firebaseConfigString) {
        firebaseConfig = JSON.parse(firebaseConfigString);
    } else {
        configError = "VITE_FIREBASE_CONFIG is missing.";
    }
    if (!geminiApiKey) {
        configError = "VITE_GEMINI_API_KEY is missing.";
    }
} catch (e) {
    console.error("Failed to parse Firebase config:", e);
    configError = "VITE_FIREBASE_CONFIG is not valid JSON. Please check the value in your Vercel settings.";
}

// --- Main App Component ---
export default function App() {
    const [page, setPage] = useState('dashboard'); // dashboard, problem
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // --- App Data State ---
    const [problems, setProblems] = useState([]);
    const [phases, setPhases] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // --- Firebase State ---
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [initError, setInitError] = useState(null);
    const [progress, setProgress] = useState({});

    // --- Sidebar Resizing State ---
    const [sidebarWidth, setSidebarWidth] = useState(288); // Default width (w-72)
    const isResizingSidebar = useRef(false);

    // --- Firebase Initialization and Auth ---
    useEffect(() => {
        if (configError) {
            setInitError(configError);
            return;
        }
        if (Object.keys(firebaseConfig).length > 0) {
            try {
                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);
                setAuth(authInstance);
                setDb(dbInstance);

                const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        await signInAnonymously(authInstance);
                    }
                    if(authInstance.currentUser){
                        setUserId(authInstance.currentUser.uid);
                    }
                    setIsAuthReady(true);
                });
                return () => unsubscribe();
            } catch (error) {
                console.error("Firebase initialization failed:", error);
                setInitError(`Firebase initialization failed: ${error.message}. This is often caused by incorrect Firebase config values.`);
            }
        }
    }, []);

    // --- Firestore Data Fetching ---
    useEffect(() => {
        if (isAuthReady && db && userId) {
            // Fetch public problems and phases
            const fetchData = async () => {
                try {
                    const problemsQuery = query(collection(db, "problems"));
                    const phasesQuery = query(collection(db, "phases"));
                    
                    const [problemsSnapshot, phasesSnapshot] = await Promise.all([
                        getDocs(problemsQuery),
                        getDocs(phasesQuery)
                    ]);

                    const problemsData = problemsSnapshot.docs.map(doc => doc.data());
                    const phasesData = phasesSnapshot.docs.map(doc => doc.data());
                    
                    // Sort phases by ID
                    phasesData.sort((a, b) => a.id - b.id);

                    setProblems(problemsData);
                    setPhases(phasesData);
                } catch (error) {
                     console.error("Error fetching public data:", error);
                     setInitError(`Failed to fetch problems/phases. Check your Firestore security rules. Error: ${error.message}`);
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchData();

            // Listen for user progress
            const progressColRef = collection(db, `artifacts/${appId}/users/${userId}/progress`);
            const unsubscribeProgress = onSnapshot(progressColRef, (snapshot) => {
                const newProgress = {};
                snapshot.forEach(doc => {
                    newProgress[doc.id] = doc.data();
                });
                setProgress(newProgress);
            }, (error) => {
                console.error("Firestore progress snapshot error:", error);
                setInitError(`Failed to listen to progress. Check your Firestore security rules. Error: ${error.message}`);
            });
            return () => unsubscribeProgress();
        }
    }, [isAuthReady, db, userId]);

    const handleSidebarMouseDown = (e) => {
        e.preventDefault();
        isResizingSidebar.current = true;
        document.body.style.cursor = 'col-resize';
    };

    const handleSidebarMouseUp = useCallback(() => {
        isResizingSidebar.current = false;
        document.body.style.cursor = 'default';
    }, []);

    const handleSidebarMouseMove = useCallback((e) => {
        if (!isResizingSidebar.current) return;
        const newWidth = e.clientX;
        if (newWidth >= 240 && newWidth <= 500) { // Min/max width constraints
            setSidebarWidth(newWidth);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleSidebarMouseMove);
        window.addEventListener('mouseup', handleSidebarMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleSidebarMouseMove);
            window.removeEventListener('mouseup', handleSidebarMouseUp);
        };
    }, [handleSidebarMouseMove, handleSidebarMouseUp]);

    const navigateToProblem = (problem) => {
        setSelectedProblem(problem);
        setPage('problem');
        setIsMenuOpen(false);
    };

    const navigateToDashboard = () => {
        setSelectedProblem(null);
        setPage('dashboard');
        setIsMenuOpen(false);
    };

    // --- Configuration Check ---
    if (initError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8">
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-8 max-w-3xl">
                    <div className="text-center">
                        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <h1 className="text-2xl font-bold text-red-400 mb-4">Application Error</h1>
                    </div>
                    <div className="text-left space-y-4 mt-4">
                        <p className="text-gray-300"><strong className="text-yellow-400">Error Details:</strong></p>
                        <pre className="bg-gray-800 p-4 rounded-lg text-sm text-red-300 whitespace-pre-wrap">{initError}</pre>
                        <p className="text-gray-300"><strong className="text-yellow-400">How to Fix:</strong> Please follow the debugging guides to verify your Vercel environment variables and Firebase security rules, then redeploy.</p>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!isAuthReady || !db || isLoadingData) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white"><Loader2 className="animate-spin h-10 w-10" /> Initializing...</div>;
    }

    const Sidebar = ({ width }) => (
        <aside style={{ width: `${width}px` }} className={`fixed top-0 left-0 h-full bg-gray-900 text-white p-6 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-30 flex-shrink-0`}>
             <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-indigo-400 flex items-center gap-2 overflow-hidden"><BrainCircuit /> <span className="truncate">Mentor</span></h1>
                <button onClick={() => setIsMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                    <X />
                </button>
            </div>
            <nav className="flex flex-col gap-4">
                <button onClick={navigateToDashboard} className={`flex items-center gap-3 p-3 rounded-lg text-left ${page === 'dashboard' ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-gray-700'}`}>
                    <Award /> Dashboard
                </button>
                <div className="mt-4">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase px-3 mb-2">Problems</h2>
                    {problems.map((p, index) => (
                        <button key={p.id ?? index} onClick={() => navigateToProblem(p)} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm ${selectedProblem?.id === p.id ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-gray-700'}`}>
                            {progress[p.id]?.status === 'completed' ? <CheckCircle className="h-4 w-4 text-green-400" /> : <div className="h-4 w-4" />}
                            <span className="truncate">{p.title}</span>
                        </button>
                    ))}
                </div>
            </nav>
            <div className="absolute bottom-4 left-4 right-4 bg-gray-800 p-3 rounded-lg">
                <p className="text-xs text-gray-400 flex items-center gap-2"><User className="h-4 w-4"/> Your User ID:</p>
                <p className="text-xs text-white break-all">{userId}</p>
            </div>
        </aside>
    );

    return (
        <div className="flex h-screen bg-gray-800 text-gray-200 font-sans">
            <div className="hidden md:flex">
                <Sidebar width={sidebarWidth} />
                <div 
                    onMouseDown={handleSidebarMouseDown}
                    className="w-2 cursor-col-resize bg-gray-700 hover:bg-indigo-500 transition-colors duration-200 flex-shrink-0"
                    title="Drag to resize"
                />
            </div>
             {/* Mobile Sidebar */}
            <div className="md:hidden">
                <Sidebar width={288} />
            </div>
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-900/50 border-b border-gray-700 md:hidden">
                     <h1 className="text-xl font-bold text-indigo-400 flex items-center gap-2"><BrainCircuit /> Mentor</h1>
                    <button onClick={() => setIsMenuOpen(true)} className="text-gray-400 hover:text-white">
                        <Menu />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {page === 'dashboard' && <Dashboard navigateToProblem={navigateToProblem} progress={progress} problems={problems} phases={phases} />}
                    {page === 'problem' && selectedProblem && <ProblemView problem={selectedProblem} onBack={navigateToDashboard} db={db} userId={userId} progressData={progress[selectedProblem.id]} />}
                </div>
            </main>
        </div>
    );
}

// --- Dashboard Component ---
function Dashboard({ navigateToProblem, progress, problems, phases }) {
    return (
        <div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-lg text-gray-400 mb-10">Let's rebuild your logical thinking, one step at a time. Your journey starts now.</p>
            
            {phases.map((phase, index) => (
                <div key={phase.id ?? index} className="mb-8">
                    <h2 className="text-2xl font-semibold text-indigo-400 mb-2">{phase.name}</h2>
                    <p className="text-gray-400 mb-4">{phase.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {problems.filter(p => p.phase === phase.id).map((p, idx) => (
                            <ProblemCard key={p.id ?? idx} problem={p} onSelect={navigateToProblem} status={progress[p.id]?.status} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ProblemCard({ problem, onSelect, status }) {
    const isCompleted = status === 'completed';
    return (
        <div onClick={() => onSelect(problem)} className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 hover:border-indigo-500 cursor-pointer transition-all duration-300">
            <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold text-white mb-2">{problem.title}</h3>
                {isCompleted && <CheckCircle className="text-green-400" />}
            </div>
            <p className={`text-sm font-medium ${problem.difficulty === 'Easy' ? 'text-green-400' : 'text-yellow-400'}`}>{problem.difficulty}</p>
            <div className="mt-4 flex flex-wrap gap-2">
                {problem.companies.map(c => <span key={c} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">{c}</span>)}
            </div>
        </div>
    );
}

// --- Resizable Panel Component ---
const ResizablePanels = ({ leftPanel, rightPanel }) => {
    const [leftWidth, setLeftWidth] = useState(50); // Initial width in percentage
    const isResizing = useRef(false);
    const containerRef = useRef(null);

    const handleMouseDown = (e) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
    };

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.body.style.cursor = 'default';
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current || !containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newLeftWidth > 20 && newLeftWidth < 80) { // Min/Max width constraints
            setLeftWidth(newLeftWidth);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div ref={containerRef} className="flex h-full w-full">
            <div style={{ width: `${leftWidth}%` }} className="min-w-[20%] max-w-[80%]">
                {leftPanel}
            </div>
            <div 
                onMouseDown={handleMouseDown}
                className="w-2 cursor-col-resize bg-gray-700 hover:bg-indigo-500 transition-colors duration-200"
                title="Drag to resize"
            />
            <div className="flex-1">
                {rightPanel}
            </div>
        </div>
    );
};


// --- Problem View Component ---
function ProblemView({ problem, onBack, db, userId, progressData }) {
    const [activeTab, setActiveTab] = useState('understand');
    const [notes, setNotes] = useState({ understand: '', plan: '', execute: problem.starterCode, review: '' });
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const isCompleted = progressData?.status === 'completed';
    const chatEndRef = useRef(null);

    useEffect(() => {
        setNotes({
            understand: progressData?.understand || '',
            plan: progressData?.plan || '',
            execute: progressData?.execute || problem.starterCode,
            review: progressData?.review || '',
        });
        setChatMessages([]);
    }, [problem, progressData]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleNoteChange = (tab, value) => {
        if (isCompleted) return;
        const newNotes = { ...notes, [tab]: value };
        setNotes(newNotes);
        const handler = setTimeout(() => saveProgress(newNotes), 1500);
        return () => clearTimeout(handler);
    };

    const saveProgress = async (currentNotes, statusOverride = null) => {
        if (!db || !userId) return;
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/progress`, problem.id);
        const dataToSave = {
            id: problem.id,
            status: statusOverride || progressData?.status || 'in-progress',
            ...currentNotes,
            lastUpdated: new Date().toISOString(),
        };
        try {
            await setDoc(docRef, dataToSave, { merge: true });
        } catch (error) {
            console.error("Failed to save progress:", error);
        }
    };
    
    const handleCompletion = async () => {
        if (notes.execute.trim() === problem.starterCode.trim()) {
             setChatMessages(prev => [...prev, { sender: 'bot', text: "It looks like you haven't written any code yet. Please try solving the problem in the 'Execute' tab before asking for a review." }]);
            return;
        }

        setIsThinking(true);
        const feedback = await reviewCode(notes.execute);
        setChatMessages(prev => [...prev, { sender: 'bot', text: feedback }]);
        setIsThinking(false);
        saveProgress(notes, 'completed');
    };

    const reattemptProblem = () => {
        const clearedNotes = { understand: '', plan: '', execute: problem.starterCode, review: '' };
        setNotes(clearedNotes);
        saveProgress(clearedNotes, 'in-progress');
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isThinking) return;

        const newMessages = [...chatMessages, { sender: 'user', text: chatInput }];
        setChatMessages(newMessages);
        setChatInput('');
        setIsThinking(true);

        const prompt = `You are a Socratic coding mentor. The user is working on a problem.
        Problem Description: "${problem.description}"
        Their current code is: \`\`\`java\n${notes.execute}\n\`\`\`
        The user's question is: "${chatInput}"
        
        Your task is to guide them without giving the direct answer. Ask leading questions, suggest concepts to research, or point out potential logical flaws in their current code. Keep your response concise and encouraging.`;

        const response = await callGemini(prompt);
        setChatMessages(prev => [...prev, { sender: 'bot', text: response }]);
        setIsThinking(false);
    };

    const reviewCode = async (code) => {
        const prompt = `You are an expert Java code reviewer. The user is solving: "${problem.description}". Here is their code:\n\n\`\`\`java\n${code}\n\`\`\`\n\nReview their code for logical errors, missed edge cases, and adherence to requirements. Provide constructive feedback in a mentor-like tone using Markdown. If the code looks good, praise them and suggest one minor improvement or thing to consider. Start with "Here's my review of your solution:".`;
        return await callGemini(prompt);
    };

    const callGemini = async (prompt) => {
        if (!geminiApiKey) {
            return "Error: VITE_GEMINI_API_KEY is not configured.";
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        const payload = { contents: [{ parts: [{ text: prompt }] }] };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`API call failed: ${response.status}`);
            const result = await response.json();
            return result.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
        } catch (error) {
            console.error(error);
            return `An error occurred: ${error.message}. Please try again.`;
        }
    };

    const tabs = [
        { id: 'understand', label: '1. Understand' },
        { id: 'plan', label: '2. Plan' },
        { id: 'execute', label: '3. Execute' },
        { id: 'review', label: '4. Review' },
    ];

    const leftPanelContent = (
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 overflow-y-auto flex flex-col h-full">
            <div className="flex-grow">
                <button onClick={onBack} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-4">
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
                <h2 className="text-3xl font-bold text-white mb-2">{problem.title}</h2>
                <p className="text-gray-400 mb-6">{problem.description}</p>
                
                <h3 className="text-lg font-semibold text-indigo-400 flex items-center gap-2 mb-2"><Terminal /> Test Cases</h3>
                <div className="space-y-3">
                    {problem.testCases?.map((tc, index) => (
                        <div key={index} className="bg-gray-800 p-3 rounded-md text-sm">
                            <p className="font-mono text-gray-400">Input: <span className="text-cyan-300">{tc.input}</span></p>
                            <p className="font-mono text-gray-400">Expected Output: <span className="text-green-300">{tc.expectedOutput}</span></p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg mt-6 flex-shrink-0">
                <h3 className="font-semibold text-indigo-400 flex items-center gap-2 mb-2"><Bot /> Mentor Chat</h3>
                <div className="h-48 overflow-y-auto bg-gray-900/50 p-2 rounded-md space-y-3">
                    {chatMessages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'bot' && <Bot className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-1" />}
                            <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${msg.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-700'}`}>
                                <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{__html: msg.text.replace(/\n/g, '<br />')}}></div>
                            </div>
                            {msg.sender === 'user' && <User className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />}
                        </div>
                    ))}
                    {isThinking && (
                         <div className="flex items-start gap-2">
                             <Bot className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-1" />
                             <div className="p-3 rounded-lg bg-gray-700">
                                <Loader2 className="animate-spin h-5 w-5" />
                             </div>
                         </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="mt-2 flex gap-2">
                    <input 
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask a question..."
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isThinking}
                    />
                    <button onClick={handleSendMessage} disabled={isThinking} className="btn-secondary px-3"><Send size={16} /></button>
                </div>
            </div>
        </div>
    );

    const rightPanelContent = (
        <div className="flex flex-col bg-gray-900/50 rounded-lg border border-gray-700 h-full">
            <div className="flex border-b border-gray-700">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 p-4 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-indigo-500/20 text-indigo-300 border-b-2 border-indigo-400' : 'text-gray-400 hover:bg-gray-800'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
                {activeTab === 'understand' && <Editor value={notes.understand} onChange={(e) => handleNoteChange('understand', e.target.value)} placeholder="What are the inputs? Outputs? Edge cases? Write them here." disabled={isCompleted} />}
                {activeTab === 'plan' && <Editor value={notes.plan} onChange={(e) => handleNoteChange('plan', e.target.value)} placeholder="Write your step-by-step plan in plain English or pseudocode." disabled={isCompleted} />}
                {activeTab === 'execute' && <CodeEditor value={notes.execute} onChange={(e) => handleNoteChange('execute', e.target.value)} disabled={isCompleted} />}
                {activeTab === 'review' && <Editor value={notes.review} onChange={(e) => handleNoteChange('review', e.target.value)} placeholder="How did you test your code? What inputs did you use? Did you find any bugs?" disabled={isCompleted} />}
            </div>
            <div className="p-4 border-t border-gray-700 flex flex-wrap gap-2 justify-end">
                {isCompleted ? (
                    <button onClick={reattemptProblem} className="btn-secondary"><RefreshCw size={16} /> Re-attempt</button>
                ) : (
                    <button onClick={handleCompletion} disabled={isThinking} className="btn-primary"><CheckCircle size={16} /> Review & Complete</button>
                )}
            </div>
        </div>
    );

    // This check handles mobile view where panels are stacked
    const isMobileView = () => window.innerWidth < 768;
    const [mobileView, setMobileView] = useState(isMobileView());

    useEffect(() => {
        const checkResize = () => setMobileView(isMobileView());
        window.addEventListener('resize', checkResize);
        return () => window.removeEventListener('resize', checkResize);
    }, []);

    if (mobileView) {
        return (
            <div className="flex flex-col gap-6 h-full p-4">
                {leftPanelContent}
                {rightPanelContent}
            </div>
        );
    }

    return <ResizablePanels leftPanel={leftPanelContent} rightPanel={rightPanelContent} />;
}

const Editor = ({ value, onChange, placeholder, disabled }) => (
    <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-full bg-transparent text-gray-300 p-2 rounded-md focus:outline-none resize-none disabled:text-gray-500"
        style={{ minHeight: '300px' }}
    />
);

const CodeEditor = ({ value, onChange, disabled }) => (
    <textarea
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-full bg-gray-900 text-cyan-300 font-mono p-4 rounded-md focus:outline-none resize-none disabled:bg-gray-800 disabled:text-gray-500"
        style={{ minHeight: '300px' }}
        spellCheck="false"
    />
);

// --- CSS for buttons ---
const style = document.createElement('style');
style.textContent = `
    .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background-color: #6366f1; /* indigo-500 */
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 600;
        transition: background-color 0.2s;
    }
    .btn-primary:hover {
        background-color: #4f46e5; /* indigo-600 */
    }
    .btn-primary:disabled {
        background-color: #4338ca; /* indigo-800 */
        cursor: not-allowed;
    }
    .btn-secondary {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background-color: #374151; /* gray-700 */
        color: #d1d5db; /* gray-300 */
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 600;
        border: 1px solid #4b5563; /* gray-600 */
        transition: background-color 0.2s;
    }
    .btn-secondary:hover {
        background-color: #4b5563; /* gray-600 */
    }
    .btn-secondary:disabled {
        background-color: #1f2937; /* gray-800 */
        color: #6b7280; /* gray-500 */
        cursor: not-allowed;
    }
    .prose-invert a { color: #818cf8; }
    .prose-invert code { color: #93c5fd; background-color: rgba(0,0,0,0.2); padding: 2px 4px; border-radius: 4px; }
`;
document.head.appendChild(style);
