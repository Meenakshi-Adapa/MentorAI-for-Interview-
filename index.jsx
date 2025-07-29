import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { ArrowLeft, Lightbulb, BrainCircuit, CheckCircle, Award, Menu, X, User, Bot, Loader2, RefreshCw } from 'lucide-react';

// --- Firebase Configuration ---
// This configuration is provided by the environment.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-coding-mentor';

// --- App Data ---
const problems = [
    { id: 'p1_fizzbuzz', phase: 1, title: 'FizzBuzz', difficulty: 'Easy', companies: ['Google', 'Amazon', 'Microsoft'], description: 'Given an integer n, for each integer i in the range [1, n], print "Fizz" if i is divisible by 3, "Buzz" if i is divisible by 5, and "FizzBuzz" if i is divisible by both 3 and 5. If none of these conditions are true, print the number i itself.', starterCode: 'class Solution {\n    public void solve(int n) {\n        // Your logic here\n    }\n}' },
    { id: 'p2_two_sum', phase: 1, title: 'Two Sum', difficulty: 'Easy', companies: ['Google', 'Facebook', 'Amazon'], description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.', starterCode: 'class Solution {\n    public int[] solve(int[] nums, int target) {\n        // Your logic here\n        return new int[]{};\n    }\n}' },
    { id: 'p3_reverse_string', phase: 1, title: 'Reverse a String', difficulty: 'Easy', companies: ['Apple', 'Oracle', 'IBM'], description: 'Write a function that reverses a string. The input string is given as an array of characters `s`. You must do this by modifying the input array in-place with O(1) extra memory.', starterCode: 'class Solution {\n    public void solve(char[] s) {\n        // Your logic here\n    }\n}' },
     { id: 'p4_palindrome', phase: 2, title: 'Valid Palindrome', difficulty: 'Easy', companies: ['Microsoft', 'Facebook'], description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string s, return true if it is a palindrome, or false otherwise.', starterCode: 'class Solution {\n    public boolean solve(String s) {\n        // Your logic here\n        return false;\n    }\n}' },
];

const phases = [
    { id: 1, name: 'Phase 1: The Foundations', description: 'Mastering the absolute basics of logic, loops, and arrays.' },
    { id: 2, name: 'Phase 2: Core Patterns', description: 'Recognizing common patterns like two-pointers and basic string manipulation.' },
];

// --- Main App Component ---
export default function App() {
    const [page, setPage] = useState('dashboard'); // dashboard, problem
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // --- Firebase State ---
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [progress, setProgress] = useState({});

    // --- Sidebar Resizing State ---
    const [sidebarWidth, setSidebarWidth] = useState(288); // Default width (w-72)
    const isResizingSidebar = useRef(false);

    // --- Firebase Initialization and Auth ---
    useEffect(() => {
        if (Object.keys(firebaseConfig).length > 0) {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    try {
                        await signInAnonymously(authInstance);
                    } catch (error) {
                        console.error("Anonymous sign-in failed:", error);
                    }
                }
                if(authInstance.currentUser){
                    setUserId(authInstance.currentUser.uid);
                }
                setIsAuthReady(true);
            });
            return () => unsubscribe();
        }
    }, []);

    // --- Firestore Data Fetching ---
    useEffect(() => {
        if (isAuthReady && db && userId) {
            const progressColRef = collection(db, `artifacts/${appId}/users/${userId}/progress`);
            const unsubscribe = onSnapshot(progressColRef, (snapshot) => {
                const newProgress = {};
                snapshot.forEach(doc => {
                    newProgress[doc.id] = doc.data();
                });
                setProgress(newProgress);
            });
            return () => unsubscribe();
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

    if (!isAuthReady || !db) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white"><Loader2 className="animate-spin h-10 w-10" /></div>;
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
                    {problems.map(p => (
                        <button key={p.id} onClick={() => navigateToProblem(p)} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm ${selectedProblem?.id === p.id ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-gray-700'}`}>
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
                    {page === 'dashboard' && <Dashboard navigateToProblem={navigateToProblem} progress={progress} />}
                    {page === 'problem' && selectedProblem && <ProblemView problem={selectedProblem} onBack={navigateToDashboard} db={db} userId={userId} progressData={progress[selectedProblem.id]} />}
                </div>
            </main>
        </div>
    );
}

// --- Dashboard Component ---
function Dashboard({ navigateToProblem, progress }) {
    return (
        <div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-lg text-gray-400 mb-10">Let's rebuild your logical thinking, one step at a time. Your journey starts now.</p>
            
            {phases.map(phase => (
                <div key={phase.id} className="mb-8">
                    <h2 className="text-2xl font-semibold text-indigo-400 mb-2">{phase.name}</h2>
                    <p className="text-gray-400 mb-4">{phase.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {problems.filter(p => p.phase === phase.id).map(p => (
                            <ProblemCard key={p.id} problem={p} onSelect={navigateToProblem} status={progress[p.id]?.status} />
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
    const [mentorFeedback, setMentorFeedback] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const isCompleted = progressData?.status === 'completed';

    useEffect(() => {
        setNotes({
            understand: progressData?.understand || '',
            plan: progressData?.plan || '',
            execute: progressData?.execute || problem.starterCode,
            review: progressData?.review || '',
        });
        setMentorFeedback('');
    }, [problem, progressData]);

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
        setIsThinking(true);
        setMentorFeedback('');
        const feedback = await reviewCode(notes.execute);
        setMentorFeedback(feedback);
        setIsThinking(false);
        saveProgress(notes, 'completed');
    };

    const reattemptProblem = () => {
        const clearedNotes = { understand: '', plan: '', execute: problem.starterCode, review: '' };
        setNotes(clearedNotes);
        saveProgress(clearedNotes, 'in-progress');
    };

    const getHint = async () => {
        setIsThinking(true);
        setMentorFeedback('');
        const prompt = `You are a coding mentor. The user is stuck on the following problem: "${problem.description}". Their current plan is: "${notes.plan}". Provide one concise, high-level hint to guide them. Do not give away the solution. Frame your response as a gentle suggestion.`;
        const feedback = await callGemini(prompt);
        setMentorFeedback(feedback);
        setIsThinking(false);
    };

    const reviewCode = async (code) => {
        const prompt = `You are an expert Java code reviewer. The user is solving: "${problem.description}". Here is their code:\n\n\`\`\`java\n${code}\n\`\`\`\n\nReview their code for logical errors, missed edge cases, and adherence to requirements. Provide constructive feedback in a mentor-like tone using Markdown. If the code looks good, praise them and suggest one minor improvement or thing to consider. Start with "Here's my review of your solution:".`;
        return await callGemini(prompt);
    };

    const callGemini = async (prompt) => {
        const apiKey = ""; // Leave empty
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
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
            </div>
            {mentorFeedback || isThinking ? (
                <div className="bg-gray-800 p-4 rounded-lg mt-6">
                    <h3 className="font-semibold text-indigo-400 flex items-center gap-2 mb-2"><Bot /> Mentor Feedback</h3>
                    {isThinking ? (
                         <div className="flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin h-5 w-5" /> Thinking...</div>
                    ) : (
                        <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{__html: mentorFeedback.replace(/\n/g, '<br />')}}></div>
                    )}
                </div>
            ) : null}
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
                {!isCompleted && activeTab === 'plan' && <button onClick={getHint} disabled={isThinking} className="btn-secondary"><Lightbulb size={16} /> Get a Hint</button>}
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
