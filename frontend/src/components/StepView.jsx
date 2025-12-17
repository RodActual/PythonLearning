import React, { useState, useEffect } from 'react';

// Helper for code blocks
const CodeBlock = ({ code }) => (
  <pre className="code-block"><code>{code}</code></pre>
);

function StepView({ lesson, stepIndex, onNext, onPrev, onBackToMenu, onRestart }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // 1. SAFETY CHECK: Check if the lesson is finished
  const isFinished = stepIndex >= lesson.steps.length;
  // Only grab the step object if we aren't finished to avoid crashing
  const step = !isFinished ? lesson.steps[stepIndex] : null;

  // Reset local state when moving between steps
  useEffect(() => {
    setSelectedOption(null);
    setIsCorrect(false);
  }, [stepIndex]);

  // Handle Quiz Logic
  const handleOptionClick = (option) => {
    if (isCorrect) return; // Lock if already correct

    setSelectedOption(option);
    
    // Robust comparison (trim whitespace, to string)
    if (option.toString().trim() === step.answer.toString().trim()) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
  };

  // 2. RENDER COMPLETION SCREEN (If Finished)
  if (isFinished) {
    return (
      <div className="lesson-container completion-screen">
        <div className="top-controls">
          <button className="back-button" onClick={onBackToMenu}>← Back to Menu</button>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2>🎉 Lesson Complete!</h2>
          <p>You have successfully finished <strong>{lesson.title}</strong>.</p>
          <div style={{ marginTop: '30px' }}>
            <button onClick={onBackToMenu} className="nav-button next">Return to Lessons</button>
            <button onClick={onRestart} className="restart-button" style={{ marginLeft: '10px' }}>Review Lesson</button>
          </div>
        </div>
      </div>
    );
  }

  // 3. RENDER NORMAL STEP (If Not Finished)
  return (
    <div className="lesson-container">
      <div className="top-controls">
        <button className="back-button" onClick={onBackToMenu}>← Menu</button>
        <button className="restart-button" onClick={onRestart}>🔁 Restart</button>
      </div>

      <h2>{lesson.title}</h2>
      <div className="step-content-box">
        {/* Progress Text */}
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
          Step {stepIndex + 1} of {lesson.steps.length}
        </p>

        <h3>{step.type === 'quiz' ? 'Quiz Question' : step.heading || 'Instruction'}</h3>
        
        {/* TEXT CONTENT */}
        {step.type === 'text' && (
          <div>
            <p>{step.content}</p>
            {step.example_code && <CodeBlock code={step.example_code} />}
          </div>
        )}

        {/* QUIZ CONTENT */}
        {step.type === 'quiz' && (
          <div className="quiz-section">
            <p className="question-text"><strong>{step.question}</strong></p>
            <div className="options-grid">
              {step.options.map((option, index) => {
                let btnClass = "option-button";
                if (selectedOption === option) {
                   btnClass += (isCorrect && option === step.answer) ? " correct" : " incorrect";
                }
                return (
                  <button 
                    key={index} 
                    className={btnClass} 
                    onClick={() => handleOptionClick(option)}
                    disabled={isCorrect} // Disable clicks after correct answer
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER NAVIGATION */}
      <div className="lesson-nav-controls">
        <button onClick={onPrev} disabled={stepIndex === 0} className="nav-button prev">
          Previous
        </button>
        
        {/* Show Next if it's text OR if quiz is answered correctly */}
        {(step.type === 'text' || isCorrect) && (
          <button onClick={onNext} className="nav-button next">
            {stepIndex === lesson.steps.length - 1 ? "Finish Lesson" : "Next Step →"}
          </button>
        )}
      </div>
    </div>
  );
}

export default StepView;