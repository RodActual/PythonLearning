import React, { useState } from 'react';

// Helper component for clean code rendering
const CodeBlock = ({ code }) => {
  return (
    <pre className="code-block">
      <code>{code}</code>
    </pre>
  );
};

// Component to handle the interactive quiz logic
const QuizStep = ({ step, onCorrect }) => {
    const [selected, setSelected] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const isCorrect = isSubmitted && (selected === step.correct_answer_index);

    const handleSubmit = () => {
        setIsSubmitted(true);
        if (selected === step.correct_answer_index) {
            // Immediately enable progression via parent component
            onCorrect(); 
        }
    };

    return (
        <div className="quiz-section">
            <p><strong>{step.question}</strong></p>
            {step.example_code && <CodeBlock code={step.example_code} />}

            <div className="quiz-options">
                {step.options.map((option, index) => (
                    <div key={index} className="quiz-option">
                        <input
                            type="radio"
                            id={`option-${index}`}
                            name="quiz"
                            checked={selected === index}
                            onChange={() => setSelected(index)}
                            disabled={isSubmitted}
                        />
                        <label htmlFor={`option-${index}`}>{option}</label>
                        {/* Feedback icons */}
                        {isSubmitted && selected === index && (
                            <span style={{ marginLeft: '10px' }}>
                                {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {!isSubmitted ? (
                <button onClick={handleSubmit} disabled={selected === null} className="primary-button">
                    Submit Answer
                </button>
            ) : (
                <div className="quiz-rationale" style={{ marginTop: '15px', padding: '10px', border: '1px solid #ddd' }}>
                    <strong>Rationale:</strong> {step.rationale}
                </div>
            )}
        </div>
    );
};

const StepView = ({ lesson, stepIndex, onNext, onPrev, onBackToMenu, onRestart }) => {
  if (!lesson || !lesson.steps) {
    return <div>Loading lesson content...</div>;
  }

  const totalSteps = lesson.steps.length;
  const step = lesson.steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  // State to track if the current quiz step has been successfully passed
  const [quizPassed, setQuizPassed] = useState(step.type !== 'quiz');
  
  // Reset quiz state when stepIndex changes
  React.useEffect(() => {
      setQuizPassed(step.type !== 'quiz');
  }, [stepIndex, step.type]);

  const handleQuizSuccess = () => {
    setQuizPassed(true);
  };

  if (step.type === 'quiz') {
      const quizComplete = quizPassed && isLastStep;
  }
  
  return (
    <div className="lesson-container">
      
      <div className="top-controls">
        <button className="back-button" onClick={onBackToMenu}>← Back to Lessons</button>
        <button className="restart-button" onClick={onRestart}>🔁 Restart Lesson</button>
      </div>

      <h2>{lesson.title}</h2>
      
      <div className="step-content-box">
        <h3>{step.heading}</h3>
        
        {step.type === 'quiz' ? (
             <QuizStep step={step} onCorrect={handleQuizSuccess} />
        ) : (
            <>
                <p>{step.content}</p>
                {step.example_code && (
                    <div className="code-section">
                        <h4>Example Code:</h4>
                        <CodeBlock code={step.example_code} />
                    </div>
                )}
                {step.image_hint && <p style={{ fontSize: '0.8em', color: '#666' }}>Hint: {step.image_hint}</p>}
                
                {(step.ide_instruction || lesson.id === 'environment_setup') && (
                    <div className="ide-instruction-box">
                        <h4>🛠 Local IDE Task:</h4>
                        <p>{step.ide_instruction || step.content}</p> 
                    </div>
                )}
            </>
        )}
      </div>

      <div className="lesson-nav-controls">
        <button 
          onClick={onPrev} 
          disabled={isFirstStep}
          className="nav-button prev"
        >
          Previous
        </button>
        
        <span className="step-counter">
          Step {stepIndex + 1} of {totalSteps}
        </span>
        
        <button 
          onClick={onNext} 
          // Disable next if it's a quiz step and the user hasn't passed it
          disabled={step.type === 'quiz' && !quizPassed}
          className={`nav-button ${isLastStep ? 'finish' : 'next'}`}
        >
          {isLastStep ? 'Finish Course' : 'Next Step →'}
        </button>
      </div>
    </div>
  );
};

export default StepView;
