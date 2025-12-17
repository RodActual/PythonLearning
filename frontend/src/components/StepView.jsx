import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti'; // Import the confetti package
import CodeSandbox from './CodeSandbox';

// Helper for static code blocks (in text steps)
const CodeBlock = ({ code }) => (
  <pre className="code-block"><code>{code}</code></pre>
);

function StepView({ lesson, stepIndex, onNext, onPrev, onBackToMenu, onRestart }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);
  const [isCodePassed, setIsCodePassed] = useState(false);
  
  // State to control window size for confetti
  const [windowDimension, setWindowDimension] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });

  // Track window resize for accurate confetti bounds
  const detectSize = () => {
    setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
  }

  useEffect(() => {
    window.addEventListener('resize', detectSize);
    return () => window.removeEventListener('resize', detectSize);
  }, [windowDimension]);

  // 1. SAFETY CHECK: Check if the lesson is finished
  const isFinished = stepIndex >= lesson.steps.length;
  const step = !isFinished ? lesson.steps[stepIndex] : null;

  // Reset local state when moving between steps
  useEffect(() => {
    setSelectedOption(null);
    setIsQuizCorrect(false);
    setIsCodePassed(false);
  }, [stepIndex]);

  // Handle Quiz Logic
  const handleOptionClick = (option) => {
    if (isQuizCorrect) return;

    setSelectedOption(option);
    
    if (option.toString().trim() === step.answer.toString().trim()) {
      setIsQuizCorrect(true);
    } else {
      setIsQuizCorrect(false);
    }
  };

  // 2. RENDER COMPLETION SCREEN
  if (isFinished) {
    return (
      <div className="lesson-container completion-screen">
        {/* Render Confetti only when finished */}
        <Confetti 
          width={windowDimension.width} 
          height={windowDimension.height} 
          recycle={false} // Stops after one burst (set to true for infinite)
          numberOfPieces={500}
        />
        
        <div className="top-controls">
          <button className="back-button" onClick={onBackToMenu}>← Back to Menu</button>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 20px', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎉 Lesson Complete!</h2>
          <p>You have successfully finished <strong>{lesson.title}</strong>.</p>
          <div style={{ marginTop: '30px' }}>
            <button onClick={onBackToMenu} className="nav-button next">Return to Lessons</button>
            <button onClick={onRestart} className="restart-button" style={{ marginLeft: '10px' }}>Review Lesson</button>
          </div>
        </div>
      </div>
    );
  }

  // Helper to determine if we can move to next step
  const canProceed = 
    step.type === 'text' || 
    (step.type === 'quiz' && isQuizCorrect) || 
    (step.type === 'code' && isCodePassed);

  // 3. RENDER NORMAL STEP
  return (
    <div className="lesson-container">
      <div className="top-controls">
        <button className="back-button" onClick={onBackToMenu}>← Menu</button>
        <button className="restart-button" onClick={onRestart}>🔁 Restart</button>
      </div>

      <h2>{lesson.title}</h2>
      <div className="step-content-box">
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
          Step {stepIndex + 1} of {lesson.steps.length}
        </p>

        {/* DYNAMIC HEADING */}
        <h3>
          {step.type === 'quiz' ? 'Quiz Question' : 
           step.type === 'code' ? 'Coding Challenge' : 
           step.heading || 'Instruction'}
        </h3>
        
        {/* --- TYPE: TEXT --- */}
        {step.type === 'text' && (
          <div>
            <p>{step.content}</p>
            {step.example_code && <CodeBlock code={step.example_code} />}
          </div>
        )}

        {/* --- TYPE: QUIZ --- */}
        {step.type === 'quiz' && (
          <div className="quiz-section">
            <p className="question-text"><strong>{step.question}</strong></p>
            <div className="options-grid">
              {step.options.map((option, index) => {
                let btnClass = "option-button";
                if (selectedOption === option) {
                   btnClass += (isQuizCorrect && option === step.answer) ? " correct" : " incorrect";
                }
                return (
                  <button 
                    key={index} 
                    className={btnClass} 
                    onClick={() => handleOptionClick(option)}
                    disabled={isQuizCorrect}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TYPE: CODE SANDBOX --- */}
        {step.type === 'code' && (
          <div className="code-section">
            <p><strong>Task:</strong> {step.instruction}</p>
            <CodeSandbox 
              initialCode={step.initial_code} 
              expectedOutput={step.expected_output}
              onPass={() => setIsCodePassed(true)}
            />
          </div>
        )}

      </div>

      {/* FOOTER NAVIGATION */}
      <div className="lesson-nav-controls">
        <button onClick={onPrev} disabled={stepIndex === 0} className="nav-button prev">
          Previous
        </button>
        
        {/* Show Next button only when allowed */}
        {canProceed && (
          <button onClick={onNext} className="nav-button next">
            {stepIndex === lesson.steps.length - 1 ? "Finish Lesson" : "Next Step →"}
          </button>
        )}
      </div>
    </div>
  );
}

export default StepView;