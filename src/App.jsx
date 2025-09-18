import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCustomToken, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, collection, query, getDocs } from 'firebase/firestore';


// --- Firebase Initialization ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- Helper Functions ---
const convertToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
};


// --- UI Components ---
const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    key="modal-content"
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="bg-gray-800 rounded-xl shadow-lg p-8 max-w-lg w-full m-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};


const Card = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className={`bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);

const Button = ({ children, onClick, className = '', type = 'button', disabled = false }) => (
  <motion.button
    whileHover={{ scale: disabled ? 1 : 1.05, filter: disabled ? 'brightness(0.7)' : 'brightness(1.1)' }}
    whileTap={{ scale: disabled ? 1 : 0.95 }}
    onClick={onClick}
    type={type}
    disabled={disabled}
    className={`px-6 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-opacity-75 transition-all duration-200 ${disabled ? 'cursor-not-allowed' : ''} ${className}`}
  >
    {children}
  </motion.button>
);

const Input = (props) => (
    <input
        {...props}
        className={`w-full px-4 py-3 text-lg text-gray-200 bg-gray-700 border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${props.className}`}
    />
);

const Tag = ({ text }) => (
    <span className="inline-block bg-gray-700 rounded-full px-3 py-1 text-sm font-semibold text-gray-300 mr-2 mb-2">
        #{text}
    </span>
);

const Notification = ({ message }) => (
    <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.3 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
        className="fixed bottom-10 right-10 z-50 p-4 rounded-lg shadow-lg bg-emerald-500 text-white font-semibold"
    >
        {message}
    </motion.div>
);

// --- Main App ---
export default function App() {
  const [page, setPage] = useState('login');
  const [allRecipes, setAllRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [ingredientsInput, setIngredientsInput] = useState('');
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);
  const [groceryList, setGroceryList] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notification, setNotification] = useState('');
  const [bookmarkedRecipes, setBookmarkedRecipes] = useState([]);
  const [planner, setPlanner] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);


  // WOW Factor State
  const [isCooking, setIsCooking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [cookingMessage, setCookingMessage] = useState('');
  
  const recognitionRef = useRef(null);

  const showNotification = (message, isError = false) => {
      // Simple implementation for now
      setNotification(message);
      setTimeout(() => setNotification(''), 3000);
  };

  useEffect(() => {
    setIsLoading(true);
    const authAndSignIn = async () => {
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                 // No token, wait for user to login via form
            }
        } catch (error) {
            console.error("Firebase Authentication Error:", error);
            showNotification("Authentication failed. Please try again.", true);
        }
    };

    onAuthStateChanged(auth, (user) => {
        if (user) {
            setUserId(user.uid);
            setIsAuthenticated(true);
            setPage('home');
        } else {
            setUserId(null);
            setIsAuthenticated(false);
            setPage('login');
            setIsLoading(false);
        }
    });

    authAndSignIn();
  }, []);

  // Firestore Data Listeners
  useEffect(() => {
      if (!userId) {
          setIsLoading(false);
          return;
      };

      const fetchAllData = async () => {
          setIsLoading(true);
          // 1. Fetch Recipes (Public)
          const recipesCollectionRef = collection(db, `artifacts/${appId}/public/data/recipes`);
          const recipesQuery = query(recipesCollectionRef);
          try {
              const recipesSnapshot = await getDocs(recipesQuery);
              const fetchedRecipes = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setAllRecipes(fetchedRecipes);
              setSuggestedRecipes(fetchedRecipes);
          } catch (error) {
              console.error("Error fetching recipes:", error);
              showNotification("Could not load recipes.", true);
          }

          // 2. Listen to User Data (Private)
          const dataDocRef = doc(db, `artifacts/${appId}/users/${userId}/data`, 'userData');
          const unsubscribe = onSnapshot(dataDocRef, (docSnap) => {
              if (docSnap.exists()) {
                  const data = docSnap.data();
                  setGroceryList(data.groceryList || []);
                  setBookmarkedRecipes(data.bookmarkedRecipes || []);
                  setPlanner(data.planner || {});
              } else {
                  setDoc(dataDocRef, { groceryList: [], bookmarkedRecipes: [], planner: {} });
              }
              setIsLoading(false);
          }, (error) => {
              console.error("Error with user data listener:", error);
              showNotification("Could not sync your data.", true);
              setIsLoading(false);
          });
          
          return () => unsubscribe();
      }
      
      fetchAllData();
  }, [userId]);


  const handleAuthAction = async (isLogin, email, password) => {
      try {
          if (isLogin) {
              await signInWithEmailAndPassword(auth, email, password);
              showNotification("Login successful!");
          } else {
              await createUserWithEmailAndPassword(auth, email, password);
              showNotification("Account created successfully!");
          }
      } catch (error) {
          console.error(`Firebase ${isLogin ? 'Login' : 'Sign Up'} Error:`, error);
          showNotification(error.message, true);
      }
  };

  const handleLogout = () => {
    signOut(auth);
    setGroceryList([]);
    setBookmarkedRecipes([]);
    setPlanner({});
    setAllRecipes([]);
  };

  const handleIngredientSearch = () => {
    if (!ingredientsInput.trim()) {
        setSuggestedRecipes(allRecipes);
        return;
    }
    const searchTerms = ingredientsInput.toLowerCase().split(',').map(term => term.trim());
    const filtered = allRecipes.filter(recipe =>
      searchTerms.some(term =>
        recipe.ingredients.some(ing => ing.toLowerCase().includes(term))
      )
    );
    setSuggestedRecipes(filtered);
  };
    
  useEffect(handleIngredientSearch, [ingredientsInput, allRecipes]);

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setPage('recipe');
  };

  const updateFirestoreData = async (data) => {
      if (!userId) return;
      const dataDocRef = doc(db, `artifacts/${appId}/users/${userId}/data`, 'userData');
      try {
          await setDoc(dataDocRef, data, { merge: true });
      } catch (e) {
         console.error("Error updating document: ", e);
      }
  };

  const toggleBookmark = async (recipe) => {
    const isBookmarked = bookmarkedRecipes.some(r => r.id === recipe.id);
    let updatedBookmarks;
    if (isBookmarked) {
        updatedBookmarks = bookmarkedRecipes.filter(r => r.id !== recipe.id);
        showNotification(`${recipe.title} removed from your recipe book.`);
    } else {
        updatedBookmarks = [...bookmarkedRecipes, recipe];
        showNotification(`${recipe.title} added to your recipe book!`);
    }
    await updateFirestoreData({ bookmarkedRecipes: updatedBookmarks });
  };
    
  const handleDropOnPlanner = async (dateKey, recipe) => {
    const newPlanner = {...planner};
    const dayRecipes = newPlanner[dateKey] || [];
    if (!dayRecipes.some(r => r.id === recipe.id)) {
        newPlanner[dateKey] = [...dayRecipes, recipe];
        await updateFirestoreData({ planner: newPlanner });
        showNotification(`${recipe.title} added to your plan.`);
    } else {
        showNotification(`${recipe.title} is already planned for this day.`);
    }
  };
    
  const removeRecipeFromPlanner = async (dateKey, recipeId) => {
    const newPlanner = {...planner};
    newPlanner[dateKey] = newPlanner[dateKey].filter(r => r.id !== recipeId);
    await updateFirestoreData({ planner: newPlanner });
  };

  const analyzeImageWithAI = async (imageFile) => {
    if (!imageFile) {
        showNotification("Please select an image first.");
        return;
    }
    setIsAnalyzing(true);
    showNotification("AI is analyzing your ingredients...");
    try {
        const base64ImageData = await convertToBase64(imageFile);
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                parts: [
                    { text: "Identify all the food ingredients in this image. Respond with ONLY a comma-separated list of the items you find, for example: 'tomato, onion, garlic'. If you don't see any food, say 'No food items found'." },
                    { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
                ]
            }]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`API error: ${response.statusText}`);

        const result = await response.json();
        const ingredientsText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (ingredientsText && ingredientsText !== 'No food items found.') {
            setIngredientsInput(ingredientsText);
            showNotification("Ingredients found! Here are your recipe suggestions.");
        } else {
            showNotification("Sorry, the AI couldn't identify any food items. Please try another image.");
        }
    } catch (error) {
        console.error("AI Analysis Error:", error);
        showNotification("An error occurred during AI analysis.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const addToGroceryList = async () => {
    if (!selectedRecipe) return;
    const newItems = selectedRecipe.ingredients.filter(ing => !groceryList.some(item => item.name.toLowerCase() === ing.toLowerCase()));
    if (newItems.length > 0) {
      const updatedList = [...groceryList, ...newItems.map(name => ({name, checked: false}))];
      await updateFirestoreData({ groceryList: updatedList });
      showNotification(`${newItems.length} new item(s) added to your grocery list!`);
    } else {
      showNotification('All ingredients are already on your list.');
    }
  };
    
  const handleGroceryItemChange = async (index, newName) => {
      const updatedList = [...groceryList];
      updatedList[index].name = newName;
      await updateFirestoreData({ groceryList: updatedList });
  };
    
  const toggleGroceryItemChecked = async (index) => {
      const updatedList = [...groceryList];
      updatedList[index].checked = !updatedList[index].checked;
      await updateFirestoreData({ groceryList: updatedList });
  };
    
  const removeGroceryItem = async (index) => {
      const updatedList = groceryList.filter((_, i) => i !== index);
      await updateFirestoreData({ groceryList: updatedList });
  };

  const speak = (text) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };
  const startCookingAssistant = () => {
    setIsCooking(true);
    setCurrentStep(0);
    const firstStep = selectedRecipe.steps[0];
    const intro = `Let's start cooking ${selectedRecipe.title}. Step 1: ${firstStep}. Say 'Next' when you're ready.`;
    setCookingMessage(intro);
    speak(intro);
    startListening();
  };
  const stopCookingAssistant = () => {
    setIsCooking(false); setIsPaused(false);
    if(recognitionRef.current) { recognitionRef.current.stop(); }
    speechSynthesis.cancel();
    setCookingMessage('');
  };
  const startListening = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          const msg = "Sorry, your browser doesn't support speech recognition.";
          setCookingMessage(msg); speak(msg); return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true; recognition.interimResults = false; recognition.lang = 'en-US';
      recognition.onresult = (event) => {
          const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
          handleVoiceCommand(command);
      };
      recognition.onerror = (event) => {
        if(event.error !== 'no-speech' && event.error !== 'audio-capture') {
             setCookingMessage(`Speech recognition error: ${event.error}.`);
        }
      };
      recognition.onend = () => { if (isCooking) recognition.start(); };
      recognition.start();
      recognitionRef.current = recognition;
  };
  const handleVoiceCommand = (command) => {
      if (isPaused && !command.includes('resume')) return;
      if (command.includes('next')) {
          const nextStepIndex = currentStep + 1;
          if (nextStepIndex < selectedRecipe.steps.length) {
              setCurrentStep(nextStepIndex);
              const nextStepText = `Step ${nextStepIndex + 1}: ${selectedRecipe.steps[nextStepIndex]}`;
              setCookingMessage(nextStepText); speak(nextStepText);
          } else {
              const msg = "You've completed all the steps! Well done.";
              setCookingMessage(msg); speak(msg); stopCookingAssistant();
          }
      } else if (command.includes('repeat')) {
          const currentStepText = `Repeating Step ${currentStep + 1}: ${selectedRecipe.steps[currentStep]}`;
          setCookingMessage(currentStepText); speak(currentStepText);
      } else if (command.includes('back') || command.includes('previous')) {
           const prevStepIndex = currentStep - 1;
           if (prevStepIndex >= 0) {
               setCurrentStep(prevStepIndex);
               const prevStepText = `Step ${prevStepIndex + 1}: ${selectedRecipe.steps[prevStepIndex]}`;
               setCookingMessage(prevStepText); speak(prevStepText);
           } else {
               const msg = "You are already on the first step.";
               setCookingMessage(msg); speak(msg);
           }
      } else if (command.includes('pause')) {
          speechSynthesis.pause(); setIsPaused(true); setCookingMessage("Paused. Say 'resume' to continue.");
      } else if (command.includes('resume')) {
          speechSynthesis.resume(); setIsPaused(false); setCookingMessage(`Resuming step ${currentStep + 1}.`);
      } else if (command.match(/go to step (\d+)/)) {
          const stepNum = parseInt(command.match(/go to step (\d+)/)[1], 10);
          const stepIndex = stepNum - 1;
          if (stepIndex >= 0 && stepIndex < selectedRecipe.steps.length) {
              setCurrentStep(stepIndex);
              const stepText = `Okay, moving to step ${stepNum}: ${selectedRecipe.steps[stepIndex]}`;
              setCookingMessage(stepText); speak(stepText);
          } else {
              const msg = `Sorry, I can't find step number ${stepNum}.`;
              setCookingMessage(msg); speak(msg);
          }
      } else if (command.includes('stop') || command.includes('exit')) {
          const msg = "Stopping the cooking assistant. Goodbye!";
          setCookingMessage(msg); speak(msg); stopCookingAssistant();
      }
  };
    
  useEffect(() => {
    return () => { if(recognitionRef.current) recognitionRef.current.stop(); speechSynthesis.cancel(); };
  }, []);
    
  useEffect(() => {
      if (!isCooking && recognitionRef.current) {
          recognitionRef.current.stop(); recognitionRef.current = null;
      }
  }, [isCooking]);


  const renderPage = () => {
    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen text-xl">Loading Your Kitchen...</div>;
    }
     switch (page) {
      case 'login': return <LoginPage onAuthAction={handleAuthAction} />;
      case 'home': return <HomePage ingredientsInput={ingredientsInput} setIngredientsInput={setIngredientsInput} recipes={suggestedRecipes} onSelectRecipe={handleSelectRecipe} onAnalyzeImage={analyzeImageWithAI} isAnalyzing={isAnalyzing} bookmarkedRecipes={bookmarkedRecipes} onToggleBookmark={toggleBookmark} />;
      case 'recipe': return <RecipeDetailPage recipe={selectedRecipe} onBack={() => setPage('home')} onAddToGrocery={addToGroceryList} isCooking={isCooking} startCooking={startCookingAssistant} stopCooking={stopCookingAssistant} currentStep={currentStep} cookingMessage={cookingMessage} isPaused={isPaused} onToggleBookmark={toggleBookmark} isBookmarked={bookmarkedRecipes.some(r => r.id === selectedRecipe?.id)} />;
      case 'grocery': return <GroceryListPage list={groceryList} onItemChange={handleGroceryItemChange} onToggleChecked={toggleGroceryItemChecked} onRemoveItem={removeGroceryItem} onBack={() => setPage('home')} />;
      case 'recipeBook': return <RecipeBookPage bookmarkedRecipes={bookmarkedRecipes} onSelectRecipe={handleSelectRecipe} onToggleBookmark={toggleBookmark}/>;
      case 'planner': return <PlannerPage planner={planner} onDrop={handleDropOnPlanner} onRemoveRecipe={removeRecipeFromPlanner} allRecipes={allRecipes} ingredientsInput={ingredientsInput} setIngredientsInput={setIngredientsInput} showNotification={showNotification} />;
      default: return <LoginPage onAuthAction={handleAuthAction} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <AnimatePresence> {notification && <Notification message={notification} />} </AnimatePresence>
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {isAuthenticated && <Navbar onNavigate={setPage} onLogout={handleLogout} userId={userId} />}
        <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                {renderPage()}
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Page Components ---

const Navbar = ({ onNavigate, onLogout, userId }) => (
    <header className="flex justify-between items-center mb-8 p-4 bg-gray-800 rounded-xl shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold text-orange-500 cursor-pointer flex items-center gap-2" onClick={() => onNavigate('home')}>
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
           AI Sous-Chef
        </h1>
        <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6">
                <a href="#" className="text-lg font-medium text-gray-300 hover:text-orange-500 transition-colors" onClick={() => onNavigate('home')}>Home</a>
                <a href="#" className="text-lg font-medium text-gray-300 hover:text-orange-500 transition-colors" onClick={() => onNavigate('recipeBook')}>My Recipe Book</a>
                <a href="#" className="text-lg font-medium text-gray-300 hover:text-orange-500 transition-colors" onClick={() => onNavigate('planner')}>Meal Planner</a>
                <a href="#" className="text-lg font-medium text-gray-300 hover:text-orange-500 transition-colors" onClick={() => onNavigate('grocery')}>Grocery List</a>
            </nav>
            <div className="flex items-center gap-4">
                 <div className="text-xs text-gray-500 hidden sm:block" title="User ID">ID: {userId}</div>
                 <Button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white !px-4 !py-2">Logout</Button>
            </div>
        </div>
    </header>
);

const LoginPage = ({ onAuthAction }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onAuthAction(isLogin, email, password);
    };

    return(
        <div className="flex flex-col items-center justify-center min-h-screen">
            <Card className="w-full max-w-md p-8 text-center">
                <h1 className="text-4xl font-bold text-orange-500 mb-2">Welcome to AI Sous-Chef</h1>
                <p className="text-gray-400 mb-8">{isLogin ? 'Log in to continue.' : 'Create an account.'}</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg">
                        {isLogin ? 'Login' : 'Sign Up'}
                    </Button>
                </form>
                <p className="text-sm text-gray-400 mt-6">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-orange-400 hover:text-orange-300 ml-2">
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </Card>
        </div>
    );
};

const RecipeCard = ({ recipe, onSelect, onToggleBookmark, isBookmarked, isDraggable = false }) => {
    const handleDragStart = (e) => {
        e.dataTransfer.setData("recipe", JSON.stringify(recipe));
    };
    
    const stopPropagation = (e) => e.stopPropagation();

    return (
        <motion.div 
            whileHover={{y: -5, scale: 1.03}} 
            className="cursor-pointer" 
            onClick={() => onSelect(recipe)}
            draggable={isDraggable}
            onDragStart={handleDragStart}
        >
            <Card className="h-full flex flex-col group relative">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleBookmark(recipe); }} 
                    className="absolute top-2 right-2 z-10 p-2 bg-gray-900/50 rounded-full text-white hover:bg-orange-500 transition-colors"
                    aria-label="Bookmark"
                >
                    <svg className={`w-6 h-6 ${isBookmarked ? 'text-orange-400 fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                </button>
                <div className="overflow-hidden">
                    <img 
                        className="h-48 w-full object-cover group-hover:scale-110 transition-transform duration-300" 
                        src={recipe.image} alt={recipe.title} 
                        onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/600x400/1f2937/9ca3af?text=Image+Not+Found'}}
                    />
                </div>
                <div className="p-6 flex-grow flex flex-col" draggable="false" onDragStart={stopPropagation}>
                    <h4 className="font-bold text-xl mb-2 text-gray-100">{recipe.title}</h4>
                    <p className="text-gray-400 text-base mb-4 flex-grow">Ready in {recipe.time} mins.</p>
                    <div>{recipe.ingredients.slice(0, 3).map(ing => <Tag key={ing} text={ing} />)}</div>
                </div>
            </Card>
        </motion.div>
    );
};

const HomePage = ({ ingredientsInput, setIngredientsInput, recipes, onSelectRecipe, onAnalyzeImage, isAnalyzing, bookmarkedRecipes, onToggleBookmark }) => {
    const fileInputRef = useRef(null);
    return (
    <div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="p-8 bg-gray-800/50 backdrop-blur-sm">
                <h2 className="text-3xl font-bold mb-4 text-gray-100">Search by Ingredients</h2>
                <p className="text-gray-400 mb-6">Enter what you have, comma-separated.</p>
                <Input type="text" placeholder="e.g., tomato, onion, pasta" value={ingredientsInput} onChange={(e) => setIngredientsInput(e.target.value)} />
            </Card>
            <Card className="p-8 bg-gray-800/50 backdrop-blur-sm">
                <h2 className="text-3xl font-bold mb-4 text-gray-100">Scan with AI</h2>
                <p className="text-gray-400 mb-6">Upload a photo of your ingredients.</p>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => onAnalyzeImage(e.target.files[0])}/>
                <Button onClick={() => fileInputRef.current.click()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isAnalyzing}>
                    {isAnalyzing ? "Analyzing..." : "Upload Image"}
                </Button>
            </Card>
        </div>
        
        <div>
            <h3 className="text-2xl font-bold mb-6 text-gray-200">Suggested Recipes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {recipes.length > 0 ? recipes.map(recipe => (
                   <RecipeCard 
                       key={recipe.id}
                       recipe={recipe}
                       onSelect={onSelectRecipe}
                       onToggleBookmark={onToggleBookmark}
                       isBookmarked={bookmarkedRecipes.some(r => r.id === recipe.id)}
                       isDraggable={true}
                   />
                )) : (
                     <div className="col-span-full text-center py-12">
                        <p className="text-xl text-gray-500">No recipes found. Try different ingredients!</p>
                    </div>
                )}
            </div>
        </div>
    </div>
    );
};

const RecipeBookPage = ({ bookmarkedRecipes, onSelectRecipe, onToggleBookmark }) => (
    <div>
        <h2 className="text-3xl font-bold mb-6 text-gray-100">My Recipe Book</h2>
        {bookmarkedRecipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {bookmarkedRecipes.map(recipe => (
                    <RecipeCard 
                        key={recipe.id}
                        recipe={recipe}
                        onSelect={onSelectRecipe}
                        onToggleBookmark={onToggleBookmark}
                        isBookmarked={true}
                        isDraggable={true}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-16">
                <p className="text-xl text-gray-500">You haven't bookmarked any recipes yet.</p>
                <p className="text-gray-400 mt-2">Click the bookmark icon on any recipe to save it here.</p>
            </div>
        )}
    </div>
);

const PlannerRecipeCard = ({ recipe, onRemove }) => (
    <motion.div layout className="bg-gray-700 p-2 rounded text-sm text-gray-200 flex justify-between items-center group">
        <span className="font-semibold flex-1 truncate pr-2">{recipe.title}</span>
        <button onClick={onRemove} className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
    </motion.div>
);

const PlannerSidebarRecipeCard = ({ recipe, isMatch }) => {
    const handleDragStart = (e) => {
        e.dataTransfer.setData("recipe", JSON.stringify(recipe));
    };
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className={`p-2 bg-gray-700 rounded-lg flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all duration-200 ${isMatch ? 'ring-2 ring-emerald-500' : 'ring-2 ring-transparent'}`}
        >
            <img src={recipe.image} className="w-10 h-10 rounded object-cover flex-shrink-0" alt={recipe.title} onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/40x40/1f2937/9ca3af?text=?'}} />
            <span className="text-sm font-medium text-gray-300 truncate">{recipe.title}</span>
        </div>
    );
};

const PlannerPage = ({ planner, onDrop, onRemoveRecipe, allRecipes, ingredientsInput, setIngredientsInput, showNotification }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dragOverDate, setDragOverDate] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const calendarDays = Array(daysInMonth).fill(0).map((_, i) => i + 1);
    const emptyDays = Array(firstDay).fill(null);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const changeMonth = (offset) => {
        setCurrentDate(new Date(year, month + offset, 1));
    };
    
    const handleDragOver = (e, dateKey) => {
        e.preventDefault();
        setDragOverDate(dateKey);
    };

    const handleDrop = (e, dateKey) => {
        e.preventDefault();
        const recipe = JSON.parse(e.dataTransfer.getData("recipe"));
        onDrop(dateKey, recipe);
        setDragOverDate(null);
    };

    const generateShoppingList = () => {
        const allIngredients = new Set();
        Object.values(planner).flat().forEach(recipe => {
            recipe.ingredients.forEach(ingredient => {
                allIngredients.add(ingredient.trim().toLowerCase().replace(/^\w/, c => c.toUpperCase()));
            });
        });
        const list = Array.from(allIngredients).sort();
        if (list.length > 0) {
            const listString = list.join(', ');
            navigator.clipboard.writeText(listString);
            showNotification('Shopping list copied to clipboard!');
        } else {
            showNotification("Your meal plan is empty!");
        }
    };

    const filteredRecipes = React.useMemo(() => {
        if (!ingredientsInput.trim()) return allRecipes;
        const searchTerms = ingredientsInput.toLowerCase().split(',').map(term => term.trim());
        return allRecipes.filter(recipe =>
            searchTerms.some(term =>
                recipe.ingredients.some(ing => ing.toLowerCase().includes(term))
            )
        );
    }, [ingredientsInput, allRecipes]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-100">Meal Planner</h2>
                    <Button onClick={generateShoppingList} className="bg-emerald-600 hover:bg-emerald-700 text-white">Generate Shopping List</Button>
                </div>
                <Card className="p-4">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700">&lt;</button>
                        <h3 className="text-xl font-bold text-orange-400">{monthName} {year}</h3>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-700">&gt;</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-400">
                        {weekDays.map(day => <div key={day} className="py-2">{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {emptyDays.map((_, i) => <div key={`empty-${i}`} className="border border-gray-800 rounded-md min-h-[120px]"></div>)}
                        {calendarDays.map(day => {
                            const dateKey = `${year}-${month}-${day}`;
                            const dayRecipes = planner[dateKey] || [];
                            return (
                                <div
                                    key={day}
                                    onDragOver={(e) => handleDragOver(e, dateKey)}
                                    onDragLeave={() => setDragOverDate(null)}
                                    onDrop={(e) => handleDrop(e, dateKey)}
                                    className={`border rounded-md min-h-[120px] p-1.5 transition-colors ${dragOverDate === dateKey ? 'bg-orange-500/20 border-orange-500' : 'bg-gray-800/50 border-gray-700'}`}
                                >
                                    <span className="font-bold text-sm">{day}</span>
                                    <div className="space-y-1 mt-1">
                                        {dayRecipes.map(recipe => (
                                            <PlannerRecipeCard key={recipe.id} recipe={recipe} onRemove={() => onRemoveRecipe(dateKey, recipe.id)} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
            <aside>
                <h3 className="text-2xl font-bold mb-6 text-gray-100">Recipe Library</h3>
                <div className="sticky top-8">
                    <Card className="p-4">
                        <p className="text-gray-400 mb-2 text-sm">What ingredients do you have?</p>
                        <Input
                            type="text"
                            placeholder="e.g., chicken, rice"
                            value={ingredientsInput}
                            onChange={(e) => setIngredientsInput(e.target.value)}
                            className="mb-4 !text-base"
                        />
                        <div className="space-y-2 h-[60vh] overflow-y-auto pr-2">
                             {allRecipes.map(recipe => (
                                <PlannerSidebarRecipeCard
                                    key={recipe.id}
                                    recipe={recipe}
                                    isMatch={filteredRecipes.some(r => r.id === recipe.id) && ingredientsInput.trim() !== ''}
                                />
                            ))}
                        </div>
                    </Card>
                </div>
            </aside>
        </div>
    );
};

const RecipeDetailPage = ({ recipe, onBack, onAddToGrocery, isCooking, startCooking, stopCooking, currentStep, cookingMessage, isPaused, onToggleBookmark, isBookmarked }) => {
    if (!recipe) return <p>Recipe not found.</p>;

    return (
        <div>
            <Button onClick={onBack} className="mb-8 bg-gray-700 hover:bg-gray-600 text-gray-200"> &larr; Back to Recipes </Button>
            <Card className="overflow-visible">
                <div className="relative">
                    <img className="h-96 w-full object-cover" src={recipe.image} alt={recipe.title} onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/1200x400/1f2937/9ca3af?text=Image+Not+Found'}}/>
                    <div className="absolute top-4 right-4">
                         <button 
                            onClick={() => onToggleBookmark(recipe)} 
                            className="p-3 bg-gray-900/50 rounded-full text-white hover:bg-orange-500 transition-colors"
                            aria-label="Bookmark"
                        >
                            <svg className={`w-8 h-8 ${isBookmarked ? 'text-orange-400 fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                        </button>
                    </div>
                </div>
                <div className="p-8">
                    <h2 className="text-4xl font-bold text-gray-100 mb-4">{recipe.title}</h2>
                    <div className="flex items-center text-gray-400 mb-6"><svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>{recipe.time} minutes</span></div>
                    <div className="flex space-x-4"><Button onClick={onAddToGrocery} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add to Grocery List</Button><Button onClick={isCooking ? stopCooking : startCooking} className={`${isCooking ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'} text-white flex items-center space-x-2`}>{isCooking ? 'Stop Cooking' : 'Start Cooking (Hands-Free)'}</Button></div>
                </div>

                {isCooking && ( <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} className="p-8 bg-gray-900/50 border-t-2 border-gray-700"><h3 className="text-2xl font-bold text-orange-400 mb-4">AI Cooking Assistant</h3><div className="text-lg text-orange-200 p-4 bg-orange-500/10 rounded-lg"><p><strong>{isPaused ? 'Paused...' : 'Listening...'}</strong> {cookingMessage}</p><p className="text-sm mt-2 text-orange-400">Say: "Next", "Repeat", "Back", "Pause", "Resume", "Go to step [number]", or "Stop".</p></div></motion.div> )}

                <div className="p-8"><div className="grid grid-cols-1 md:grid-cols-3 gap-8"><div className="md:col-span-1"><h3 className="text-2xl font-bold mb-4 border-b-2 border-gray-700 pb-2 text-gray-200">Ingredients</h3><ul className="space-y-3">{recipe.ingredients.map((ing, i) => ( <li key={i} className="flex items-center"><input id={`ing-${i}`} type="checkbox" className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500" /><label htmlFor={`ing-${i}`} className="ml-3 text-lg text-gray-300 capitalize">{ing}</label></li> ))}</ul></div><div className="md:col-span-2"><h3 className="text-2xl font-bold mb-4 border-b-2 border-gray-700 pb-2 text-gray-200">Instructions</h3><div className="space-y-6">{recipe.steps.map((step, i) => ( <AnimatePresence key={i}><motion.div className={`p-6 rounded-lg transition-all duration-300 ${isCooking && currentStep === i ? 'bg-orange-500/10 ring-4 ring-orange-500/50 shadow-xl' : 'bg-gray-700/50'}`} animate={{ scale: isCooking && currentStep === i ? 1.03 : 1 }} layout><div className="flex items-start"><div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-orange-500 text-white font-bold text-lg">{i + 1}</div><p className="ml-4 text-lg text-gray-300">{step}</p></div></motion.div></AnimatePresence> ))}</div></div></div></div>
            </Card>
        </div>
    );
};

const GroceryListPage = ({ list, onItemChange, onToggleChecked, onRemoveItem, onBack }) => (
    <div>
        <Button onClick={onBack} className="mb-8 bg-gray-700 hover:bg-gray-600 text-gray-200">&larr; Back Home</Button>
        <Card className="p-8"><h2 className="text-3xl font-bold mb-6 text-gray-100">Your Grocery List</h2>{list.length > 0 ? ( <ul className="space-y-4">{list.map((item, index) => ( <motion.li key={index} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="flex items-center p-4 bg-gray-700/50 rounded-lg"><input type="checkbox" checked={item.checked} onChange={() => onToggleChecked(index)} className="h-6 w-6 rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500" /><input type="text" value={item.name} onChange={(e) => onItemChange(index, e.target.value)} className={`flex-grow mx-4 px-2 py-1 bg-transparent text-lg focus:outline-none focus:bg-gray-800 rounded ${item.checked ? 'line-through text-gray-500' : 'text-gray-200'}`} /><button onClick={() => onRemoveItem(index)} className="text-red-500 hover:text-red-400 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></motion.li> ))}</ul> ) : ( <p className="text-lg text-gray-500">Your grocery list is empty. Add ingredients from a recipe!</p> )} </Card>
    </div>
);

