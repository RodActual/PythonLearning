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
    
    // Always save if it's a higher step index (progress forward)
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
        setCurrentLesson(null);
      }
    });

    return () => unsubscribeAuth();
  }, []); 


  // --- NAVIGATION & STATE MANAGEMENT ---
  
  const loadLesson = (lessonId) => {
    fetch(`/api/lesson/${lessonId}`)
      .then(res => res.json())
      .then(data => {
        // Load saved progress. If undefined, start at 0.
        const initialStep = userProgress[lessonId] || 0; 
        
        setCurrentLesson({ id: lessonId, ...data });
        setCurrentStepIndex(initialStep);
      })
      .catch(error => console.error(`Failed to load lesson ${lessonId}:`, error));
  };
  
  const nextStep = () => {
    const totalSteps = currentLesson.steps.length;
    
    if (currentStepIndex < totalSteps - 1) {
      // Normal progression
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      saveProgress(currentLesson.id, nextIndex);
    } else {
      // Finished the lesson
      const completionIndex = totalSteps; // Index = length means "done"
      saveProgress(currentLesson.id, completionIndex); 
      setCurrentStepIndex(completionIndex); // Triggers Completion Screen in StepView
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };
  
  const handleRestart = () => {
     if (window.confirm('Restart this lesson?')) {
        setCurrentStepIndex(0);
        window.scrollTo(0, 0); 
    }
  };
  
  const handleLogout = async () => {
      await signOut(auth);
  };

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="container">
      <header className="app-header">
        <h1>🐍 Python Learning Path</h1>
        {user && (
            <div className="user-info">
                <small>{user.email}</small>
                <button onClick={handleLogout} className="logout-button">Log Out</button>
            </div>
        )}
      </header>

      {!user ? (
        <AuthForm onLoginSuccess={() => {}} />
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