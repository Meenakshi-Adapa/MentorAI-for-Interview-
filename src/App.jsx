import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK DATA ---
const mockRecipes = [
  {
    id: 1,
    title: 'Classic Spaghetti Bolognese',
    image: 'https://images.unsplash.com/photo-1589227365533-5f830a79a378?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1287&q=80',
    time: 45,
    ingredients: ['pasta', 'onion', 'tomato', 'ground beef', 'garlic'],
    steps: [
      "Heat olive oil in a large skillet over medium-high heat. Add onion and garlic; cook and stir until softened, about 5 minutes.",
      "Add ground beef and cook until browned and crumbly, 5 to 7 minutes. Drain excess grease.",
      "Stir in crushed tomatoes, tomato paste, water, sugar, basil, oregano, salt, and pepper. Bring to a simmer, then reduce heat to low, cover, and let simmer for at least 1 hour, stirring occasionally.",
      "Meanwhile, bring a large pot of lightly salted water to a boil. Cook spaghetti in the boiling water, stirring occasionally, until tender yet firm to the bite, about 12 minutes. Drain.",
      "Serve sauce over hot spaghetti."
    ],
  },
  {
    id: 2,
    title: 'Tomato and Onion Bruschetta',
    image: 'https://images.unsplash.com/photo-1505253716362-afb74bf60d44?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    time: 20,
    ingredients: ['tomato', 'onion', 'bread', 'garlic', 'basil'],
    steps: [
        "Preheat your oven's broiler.",
        "Combine diced tomatoes, chopped onion, minced garlic, and fresh basil in a medium bowl.",
        "Drizzle with olive oil and season with salt and pepper to taste. Let it sit for about 10 minutes for the flavors to meld.",
        "Slice the bread into 1/2-inch thick slices. Arrange on a baking sheet.",
        "Broil for 1 to 2 minutes per side, or until lightly golden.",
        "Rub one side of each toast slice with the cut side of a garlic clove.",
        "Top the toasted bread with the tomato mixture and serve immediately."
    ],
  },
  {
    id: 3,
    title: 'Simple Chicken Curry',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c7373094?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1319&q=80',
    time: 35,
    ingredients: ['chicken', 'onion', 'tomato', 'ginger', 'garlic', 'curry powder'],
    steps: [
        "Heat oil in a large pot or Dutch oven over medium heat.",
        "Add chopped onion and cook until soft and translucent.",
        "Stir in minced garlic and grated ginger, and cook for another minute until fragrant.",
        "Add chicken pieces and sear on all sides.",
        "Sprinkle in curry powder, turmeric, and cumin. Stir to coat the chicken.",
        "Pour in chopped tomatoes and coconut milk. Season with salt.",
        "Bring to a simmer, then reduce heat, cover, and cook for 20-25 minutes, or until chicken is cooked through. Garnish with cilantro before serving."
    ],
  },
    {
    id: 4,
    title: 'Hearty Lentil Soup',
    image: 'https://images.unsplash.com/photo-1623059521999-95213c3a9a5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1287&q=80',
    time: 50,
    ingredients: ['lentils', 'onion', 'carrot', 'celery', 'tomato', 'garlic'],
    steps: [
        "Heat olive oil in a large pot or Dutch oven over medium heat.",
        "Add chopped onion, carrots, and celery. Cook until softened, about 5-7 minutes.",
        "Add minced garlic and cook for another minute until fragrant.",
        "Stir in rinsed lentils, diced tomatoes, vegetable broth, and dried thyme.",
        "Bring to a boil, then reduce heat and simmer for 30-40 minutes, or until lentils are tender.",
        "Season with salt and pepper to taste. For a creamier soup, you can use an immersion blender for a few seconds.",
        "Serve hot, garnished with fresh parsley."
    ],
  }
];

// --- UI Components ---
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

const Button = ({ children, onClick, className = '', type = 'button' }) => (
  <motion.button
    whileHover={{ scale: 1.05, filter: 'brightness(1.1)' }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    type={type}
    className={`px-6 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-opacity-75 transition-all duration-200 ${className}`}
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
  const [page, setPage] = useState('login'); // login, home, recipe, grocery
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [ingredientsInput, setIngredientsInput] = useState('');
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);
  const [groceryList, setGroceryList] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notification, setNotification] = useState('');

  // WOW Factor State
  const [isCooking, setIsCooking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [cookingMessage, setCookingMessage] = useState('');
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem('smart-recipe-auth') === 'true';
    if (loggedIn) {
      setIsAuthenticated(true);
      setPage('home');
    }
    const savedList = JSON.parse(localStorage.getItem('smart-recipe-grocery')) || [];
    setGroceryList(savedList);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    localStorage.setItem('smart-recipe-auth', 'true');
    setIsAuthenticated(true);
    setPage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('smart-recipe-auth');
    setIsAuthenticated(false);
    setPage('login');
  };

  const handleIngredientSearch = () => {
    if (!ingredientsInput.trim()) {
        setSuggestedRecipes(mockRecipes);
        return;
    }
    const searchTerms = ingredientsInput.toLowerCase().split(',').map(term => term.trim());
    const filtered = mockRecipes.filter(recipe =>
      searchTerms.some(term =>
        recipe.ingredients.some(ing => ing.toLowerCase().includes(term))
      )
    );
    setSuggestedRecipes(filtered);
  };
    
  useEffect(handleIngredientSearch, [ingredientsInput]);

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setPage('recipe');
  };

  const showNotification = (message) => {
      setNotification(message);
      setTimeout(() => setNotification(''), 3000);
  };

  const addToGroceryList = () => {
    if (!selectedRecipe) return;
    const newItems = selectedRecipe.ingredients.filter(ing => !groceryList.some(item => item.name.toLowerCase() === ing.toLowerCase()));
    if (newItems.length > 0) {
      const updatedList = [...groceryList, ...newItems.map(name => ({name, checked: false}))];
      setGroceryList(updatedList);
      localStorage.setItem('smart-recipe-grocery', JSON.stringify(updatedList));
      showNotification(`${newItems.length} new item(s) added to your grocery list!`);
    } else {
      showNotification('All ingredients are already on your list.');
    }
  };
    
  const handleGroceryItemChange = (index, newName) => {
      const updatedList = [...groceryList];
      updatedList[index].name = newName;
      setGroceryList(updatedList);
      localStorage.setItem('smart-recipe-grocery', JSON.stringify(updatedList));
  };
    
  const toggleGroceryItemChecked = (index) => {
      const updatedList = [...groceryList];
      updatedList[index].checked = !updatedList[index].checked;
      setGroceryList(updatedList);
      localStorage.setItem('smart-recipe-grocery', JSON.stringify(updatedList));
  };
    
  const removeGroceryItem = (index) => {
      const updatedList = groceryList.filter((_, i) => i !== index);
      setGroceryList(updatedList);
      localStorage.setItem('smart-recipe-grocery', JSON.stringify(updatedList));
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
    setIsCooking(false);
    setIsPaused(false);
    if(recognitionRef.current) {
        recognitionRef.current.stop();
    }
    speechSynthesis.cancel();
    setCookingMessage('');
  };

  const startListening = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          const msg = "Sorry, your browser doesn't support speech recognition.";
          setCookingMessage(msg);
          speak(msg);
          return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
          const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
          handleVoiceCommand(command);
      };

      recognition.onerror = (event) => {
        if(event.error !== 'no-speech' && event.error !== 'audio-capture') {
             setCookingMessage(`Speech recognition error: ${event.error}.`);
        }
      };
      
      recognition.onend = () => {
          if (isCooking) recognition.start();
      };

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
              setCookingMessage(nextStepText);
              speak(nextStepText);
          } else {
              const msg = "You've completed all the steps! Well done.";
              setCookingMessage(msg);
              speak(msg);
              stopCookingAssistant();
          }
      } else if (command.includes('repeat')) {
          const currentStepText = `Repeating Step ${currentStep + 1}: ${selectedRecipe.steps[currentStep]}`;
          setCookingMessage(currentStepText);
          speak(currentStepText);
      } else if (command.includes('back') || command.includes('previous')) {
           const prevStepIndex = currentStep - 1;
           if (prevStepIndex >= 0) {
               setCurrentStep(prevStepIndex);
               const prevStepText = `Step ${prevStepIndex + 1}: ${selectedRecipe.steps[prevStepIndex]}`;
               setCookingMessage(prevStepText);
               speak(prevStepText);
           } else {
               const msg = "You are already on the first step.";
               setCookingMessage(msg);
               speak(msg);
           }
      } else if (command.includes('pause')) {
          speechSynthesis.pause();
          setIsPaused(true);
          setCookingMessage("Paused. Say 'resume' to continue.");
      } else if (command.includes('resume')) {
          speechSynthesis.resume();
          setIsPaused(false);
          setCookingMessage(`Resuming step ${currentStep + 1}.`);
      } else if (command.match(/go to step (\d+)/)) {
          const stepNum = parseInt(command.match(/go to step (\d+)/)[1], 10);
          const stepIndex = stepNum - 1;
          if (stepIndex >= 0 && stepIndex < selectedRecipe.steps.length) {
              setCurrentStep(stepIndex);
              const stepText = `Okay, moving to step ${stepNum}: ${selectedRecipe.steps[stepIndex]}`;
              setCookingMessage(stepText);
              speak(stepText);
          } else {
              const msg = `Sorry, I can't find step number ${stepNum}.`;
              setCookingMessage(msg);
              speak(msg);
          }
      } else if (command.includes('stop') || command.includes('exit')) {
          const msg = "Stopping the cooking assistant. Goodbye!";
          setCookingMessage(msg);
          speak(msg);
          stopCookingAssistant();
      }
  };
    
  useEffect(() => {
    return () => {
        if(recognitionRef.current) recognitionRef.current.stop();
        speechSynthesis.cancel();
    };
  }, []);
    
  useEffect(() => {
      if (!isCooking && recognitionRef.current) {
          recognitionRef.current.stop();
          recognitionRef.current = null;
      }
  }, [isCooking]);


  const renderPage = () => {
    // ... (render logic as before)
     switch (page) {
      case 'login': return <LoginPage onLogin={handleLogin} />;
      case 'home': return <HomePage ingredientsInput={ingredientsInput} setIngredientsInput={setIngredientsInput} recipes={suggestedRecipes} onSelectRecipe={handleSelectRecipe} />;
      case 'recipe': return <RecipeDetailPage recipe={selectedRecipe} onBack={() => setPage('home')} onAddToGrocery={addToGroceryList} isCooking={isCooking} startCooking={startCookingAssistant} stopCooking={stopCookingAssistant} currentStep={currentStep} cookingMessage={cookingMessage} isPaused={isPaused} />;
      case 'grocery': return <GroceryListPage list={groceryList} onItemChange={handleGroceryItemChange} onToggleChecked={toggleGroceryItemChecked} onRemoveItem={removeGroceryItem} onBack={() => setPage('home')} />;
      default: return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <AnimatePresence>
        {notification && <Notification message={notification} />}
      </AnimatePresence>
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">
        {isAuthenticated && <Navbar onNavigate={setPage} onLogout={handleLogout} />}
        <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }}>
                {renderPage()}
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Page Components ---

const Navbar = ({ onNavigate, onLogout }) => (
    <header className="flex justify-between items-center mb-8 p-4 bg-gray-800 rounded-xl shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold text-orange-500 cursor-pointer flex items-center gap-2" onClick={() => onNavigate('home')}>
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
           AI Sous-Chef
        </h1>
        <nav className="hidden md:flex items-center space-x-6">
            <a href="#" className="text-lg font-medium text-gray-300 hover:text-orange-500 transition-colors" onClick={() => onNavigate('home')}>Home</a>
            <a href="#" className="text-lg font-medium text-gray-300 hover:text-orange-500 transition-colors" onClick={() => onNavigate('grocery')}>Grocery List</a>
            <Button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white !px-4 !py-2">Logout</Button>
        </nav>
    </header>
);

const LoginPage = ({ onLogin }) => (
  <div className="flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="text-4xl font-bold text-orange-500 mb-2">Welcome to AI Sous-Chef</h1>
        <p className="text-gray-400 mb-8">Your smart, hands-free cooking assistant.</p>
        <form onSubmit={onLogin} className="space-y-6">
            <Input type="email" placeholder="Email (e.g., user@example.com)" defaultValue="user@example.com" required />
            <Input type="password" placeholder="Password" defaultValue="password" required />
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg">
                Login
            </Button>
        </form>
        <p className="text-sm text-gray-500 mt-6">This is a mocked login for the hackathon demo.</p>
    </Card>
  </div>
);

const HomePage = ({ ingredientsInput, setIngredientsInput, recipes, onSelectRecipe }) => (
    <div>
        <Card className="p-8 mb-8 bg-gray-800/50 backdrop-blur-sm">
            <h2 className="text-3xl font-bold mb-4 text-gray-100">What's in your pantry?</h2>
            <p className="text-gray-400 mb-6">Enter ingredients you have (comma-separated) to find delicious recipes.</p>
            <Input type="text" placeholder="e.g., tomato, onion, pasta" value={ingredientsInput} onChange={(e) => setIngredientsInput(e.target.value)} />
        </Card>
        
        <div>
            <h3 className="text-2xl font-bold mb-6 text-gray-200">Suggested Recipes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {recipes.length > 0 ? recipes.map(recipe => (
                    <motion.div key={recipe.id} whileHover={{y: -5, scale: 1.03}} className="cursor-pointer" onClick={() => onSelectRecipe(recipe)}>
                        <Card className="h-full flex flex-col group">
                           <div className="overflow-hidden"><img className="h-48 w-full object-cover group-hover:scale-110 transition-transform duration-300" src={recipe.image} alt={recipe.title} /></div>
                            <div className="p-6 flex-grow flex flex-col">
                                <h4 className="font-bold text-xl mb-2 text-gray-100">{recipe.title}</h4>
                                <p className="text-gray-400 text-base mb-4 flex-grow">A delicious meal ready in {recipe.time} minutes.</p>
                                <div>{recipe.ingredients.slice(0, 3).map(ing => <Tag key={ing} text={ing} />)}</div>
                            </div>
                        </Card>
                    </motion.div>
                )) : (
                     <div className="col-span-full text-center py-12">
                        <p className="text-xl text-gray-500">No recipes found. Try different ingredients!</p>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const RecipeDetailPage = ({ recipe, onBack, onAddToGrocery, isCooking, startCooking, stopCooking, currentStep, cookingMessage, isPaused }) => {
    if (!recipe) return <p>Recipe not found.</p>;

    return (
        <div>
            <Button onClick={onBack} className="mb-8 bg-gray-700 hover:bg-gray-600 text-gray-200"> &larr; Back to Recipes </Button>
            <Card className="overflow-visible">
                <div className="md:flex">
                    <div className="md:flex-shrink-0"><img className="h-64 w-full object-cover md:w-64" src={recipe.image} alt={recipe.title} /></div>
                    <div className="p-8 flex-grow">
                        <h2 className="text-4xl font-bold text-gray-100 mb-4">{recipe.title}</h2>
                        <div className="flex items-center text-gray-400 mb-6">
                            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>{recipe.time} minutes</span>
                        </div>
                        <div className="flex space-x-4">
                            <Button onClick={onAddToGrocery} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add to Grocery List</Button>
                             <Button onClick={isCooking ? stopCooking : startCooking} className={`${isCooking ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'} text-white flex items-center space-x-2`}>
                                {isCooking ? 'Stop Cooking' : 'Start Cooking (Hands-Free)'}
                            </Button>
                        </div>
                    </div>
                </div>

                {isCooking && (
                    <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} className="p-8 bg-gray-900/50 border-t-2 border-gray-700">
                        <h3 className="text-2xl font-bold text-orange-400 mb-4">AI Cooking Assistant</h3>
                        <div className="text-lg text-orange-200 p-4 bg-orange-500/10 rounded-lg">
                            <p><strong>{isPaused ? 'Paused...' : 'Listening...'}</strong> {cookingMessage}</p>
                            <p className="text-sm mt-2 text-orange-400">Say: "Next", "Repeat", "Back", "Pause", "Resume", "Go to step [number]", or "Stop".</p>
                        </div>
                    </motion.div>
                )}

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1">
                            <h3 className="text-2xl font-bold mb-4 border-b-2 border-gray-700 pb-2 text-gray-200">Ingredients</h3>
                            <ul className="space-y-3">
                                {recipe.ingredients.map((ing, i) => (
                                    <li key={i} className="flex items-center">
                                       <input id={`ing-${i}`} type="checkbox" className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500" />
                                       <label htmlFor={`ing-${i}`} className="ml-3 text-lg text-gray-300 capitalize">{ing}</label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="md:col-span-2">
                             <h3 className="text-2xl font-bold mb-4 border-b-2 border-gray-700 pb-2 text-gray-200">Instructions</h3>
                             <div className="space-y-6">
                                {recipe.steps.map((step, i) => (
                                   <AnimatePresence key={i}>
                                     <motion.div className={`p-6 rounded-lg transition-all duration-300 ${isCooking && currentStep === i ? 'bg-orange-500/10 ring-4 ring-orange-500/50 shadow-xl' : 'bg-gray-700/50'}`} animate={{ scale: isCooking && currentStep === i ? 1.03 : 1 }} layout>
                                         <div className="flex items-start">
                                             <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-orange-500 text-white font-bold text-lg">{i + 1}</div>
                                             <p className="ml-4 text-lg text-gray-300">{step}</p>
                                         </div>
                                     </motion.div>
                                   </AnimatePresence>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

const GroceryListPage = ({ list, onItemChange, onToggleChecked, onRemoveItem, onBack }) => (
    <div>
        <Button onClick={onBack} className="mb-8 bg-gray-700 hover:bg-gray-600 text-gray-200">&larr; Back Home</Button>
        <Card className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-100">Your Grocery List</h2>
            {list.length > 0 ? (
                <ul className="space-y-4">
                    {list.map((item, index) => (
                        <motion.li key={index} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="flex items-center p-4 bg-gray-700/50 rounded-lg">
                            <input type="checkbox" checked={item.checked} onChange={() => onToggleChecked(index)} className="h-6 w-6 rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500" />
                            <input type="text" value={item.name} onChange={(e) => onItemChange(index, e.target.value)} className={`flex-grow mx-4 px-2 py-1 bg-transparent text-lg focus:outline-none focus:bg-gray-800 rounded ${item.checked ? 'line-through text-gray-500' : 'text-gray-200'}`} />
                            <button onClick={() => onRemoveItem(index)} className="text-red-500 hover:text-red-400 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </motion.li>
                    ))}
                </ul>
            ) : (
                <p className="text-lg text-gray-500">Your grocery list is empty. Add ingredients from a recipe!</p>
            )}
        </Card>
    </div>
);

