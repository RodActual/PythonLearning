import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, updateDoc, deleteField, onSnapshot } from "firebase/firestore"; // Added updateDoc, deleteField
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
    
    // Optimistic UI update
    const newProgress = { ...userProgress, [lessonId]: stepIndex };
    setUserProgress(newProgress);
    
    // Save to Firestore (merge ensures we don't wipe other lessons)
    setDoc(progressRef, { completed_steps: newProgress }, { merge: true })
        .catch(error => console.error("Error saving progress:", error));
  }, [user, userProgress]);

  // --- NEW: RESET SINGLE LESSON ---
  const resetLessonProgress = async (lessonId) => {
    if (!user || !db) return;
    if (!window.confirm("Are you sure you want to reset your progress for this lesson?")) return;

    try {
      const progressRef = doc(db, USER_PROGRESS_COLLECTION, user.uid);
      
      // 1. Remove from local state immediately
      const updatedProgress = { ...userProgress };
      delete updatedProgress[lessonId];
      setUserProgress(updatedProgress);

      // 2. Remove from Firestore using deleteField()
      // We target the specific key inside the 'completed_steps' map
      await updateDoc(progressRef, {
        [`completed_steps.${lessonId}`]: deleteField()
      });
      
      // If currently viewing this lesson, reset view to start
      if (currentLesson && currentLesson.id === lessonId) {
        setCurrentStepIndex(0);
      }
    } catch (error) {
      console.error("Error resetting lesson:", error);
    }
  };

  // --- NEW: RESET ALL PROGRESS ---
  const resetAllProgress = async () => {
    if (!user || !db) return;
    const confirmText = "⚠️ WARNING: This will permanently erase ALL your progress history.\n\nAre you sure?";
    if (!window.confirm(confirmText)) return;

    try {
      const progressRef = doc(db, USER_PROGRESS_COLLECTION, user.uid);
      
      // 1. Clear local state
      setUserProgress({});
      
      // 2. Clear Firestore (set completed_steps to empty object)
      await setDoc(progressRef, { completed_steps: {} });

      // If currently in a lesson, reset index
      if (currentLesson) {
        setCurrentStepIndex(0);
      }
    } catch (error) {
      console.error("Error resetting all progress:", error);
    }
  };

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
        });
        return () => unsubscribeProgress(); 
      } else {
        setUserProgress({});
        setCurrentLesson(null);
      }
    });
    return () => unsubscribeAuth();
  }, []); 

  // --- NAVIGATION ---
  const loadLesson = (lessonId) => {
    fetch(`/api/lesson/${lessonId}`)
      .then(res => res.json())
      .then(data => {
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
      const completionIndex = totalSteps;
      saveProgress(currentLesson.id, completionIndex); 
      setCurrentStepIndex(completionIndex);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
  };
  
  // Local restart (doesn't wipe DB, just moves cursor)
  const handleLocalRestart = () => {
     if (window.confirm('Restart this lesson?')) {
        setCurrentStepIndex(0);
        window.scrollTo(0, 0); 
    }
  };
  
  const handleLogout = async () => { await signOut(auth); };

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="container">
      <header className="app-header">
        <h1>🐍 Python Learning Path</h1>
        {user && (
            <div className="user-info">
                <small>{user.email}</small>
                {/* NEW: RESET ALL BUTTON */}
                <button onClick={resetAllProgress} className="reset-all-btn">Reset All Progress</button>
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
              onRestart={handleLocalRestart}
            />
          ) : (
            <LessonList 
              lessons={lessons} 
              onLoadLesson={loadLesson} 
              userProgress={userProgress}
              // NEW: Pass the reset function down
              onResetLesson={resetLessonProgress} 
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;