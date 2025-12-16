import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from './firebaseConfig'; 
import LessonList from './components/LessonList';
import StepView from './components/StepView';
import AuthForm from './components/AuthForm';

const USER_PROGRESS_COLLECTION = "user_progress";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0); 
  const [userProgress, setUserProgress] = useState({});

  // --- PROGRESS SAVING ---
  const saveProgress = useCallback((lessonId, stepIndex) => {
    if (!user || !db) return;

    const progressRef = doc(db, USER_PROGRESS_COLLECTION, user.uid);
    const currentSavedStep = userProgress[lessonId] || 0;
    
    // Only save if the step index is higher than the current saved value
    if (stepIndex > currentSavedStep) {
        const newProgress = { 
            ...userProgress, 
            [lessonId]: stepIndex 
        };
        setUserProgress(newProgress);
        
        setDoc(progressRef, { completed_steps: newProgress }, { merge: true })
            .catch(error => console.error("Error saving progress:", error));
    }
  }, [user, userProgress]);


  // --- INITIAL DATA LOADING ---
  useEffect(() => {
    // 1. Fetch Lesson List (from Vercel/Flask API)
    fetch('/api/lessons')
      .then(res => res.json())
      .then(data => setLessons(data))
      .catch(error => console.error("Failed to fetch lessons:", error));
  }, []);


  // --- AUTHENTICATION & PROGRESS LISTENER ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        // 2. Listen for real-time progress updates
        const progressRef = doc(db, USER_PROGRESS_COLLECTION, currentUser.uid);
        const unsubscribeProgress = onSnapshot(progressRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().completed_steps) {
            setUserProgress(docSnap.data().completed_steps);
          } else {
            setUserProgress({});
          }
        }, error => console.error("Error fetching progress:", error));
        
        return () => unsubscribeProgress(); 
      } else {
        setUserProgress({});
        setCurrentLesson(null); // Clear view on logout
      }
    });

    return () => unsubscribeAuth();
  }, []); 


  // --- NAVIGATION & STATE MANAGEMENT ---
  
  const loadLesson = (lessonId) => {
    fetch(`/api/lesson/${lessonId}`)
      .then(res => res.json())
      .then(data => {
        // Set current step to the last saved progress point, or 0
        const initialStep = userProgress[lessonId] || 0; 
        
        setCurrentLesson({ id: lessonId, ...data });
        setCurrentStepIndex(initialStep);
      })
      .catch(error => console.error(`Failed to load lesson ${lessonId}:`, error));
  };
  
  const nextStep = () => {
    const totalSteps = currentLesson.steps.length;
    if (currentStepIndex < totalSteps - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      saveProgress(currentLesson.id, nextIndex);
    } else {
      // User finished the lesson
      saveProgress(currentLesson.id, totalSteps); 
      alert('Lesson Completed!');
      setCurrentLesson(null); 
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };
  
  const handleRestart = () => {
     if (window.confirm('Are you sure you want to restart this lesson? Your progress will be reset.')) {
        setCurrentStepIndex(0);
        // Optional: Reset saved progress to 0 if they confirm a restart
        saveProgress(currentLesson.id, 0); 
        window.scrollTo(0, 0); 
    }
  };
  
  const handleLogout = async () => {
      await signOut(auth);
  };

  // --- RENDER ---
  
  if (loading) {
    return <div className="loading-screen">Checking authentication status...</div>;
  }

  return (
    <div className="container">
      <header className="app-header">
        <h1>🐍 Python Learning Path</h1>
        {user && (
            <div className="user-info">
                <small>Welcome, {user.email}!</small>
                <button onClick={handleLogout} className="logout-button">Log Out</button>
            </div>
        )}
      </header>

      {!user ? (
        <AuthForm onLoginSuccess={() => { /* listener handles state */ }} />
      ) : (
        <div>
           {currentLesson ? (
            <StepView 
              lesson={currentLesson} 
              stepIndex={currentStepIndex} 
              onNext={nextStep} 
              onPrev={prevStep} 
              onBackToMenu={() => setCurrentLesson(null)} 
              onRestart={handleRestart}
            />
          ) : (
            <LessonList 
              lessons={lessons} 
              onLoadLesson={loadLesson} 
              userProgress={userProgress}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
