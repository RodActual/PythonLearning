import React from 'react';

const LessonList = ({ lessons, onLoadLesson, userProgress }) => { 
  if (!lessons || lessons.length === 0) {
    return <div className="loading-state">Loading Available Lessons...</div>;
  }

  return (
    <div className="lesson-list-container">
      <h2>Available Lessons</h2>
      <ul className="lesson-list">
        {lessons.map(lesson => {
          // Default to 0 if no progress saved
          const progress = userProgress[lesson.id] || 0;
          
          // Get total steps from the API data, or default to a safe number (e.g. 5) if missing
          const totalSteps = lesson.step_count || 5; 

          // Determine Status
          let statusLabel = "🆕 Start";
          let statusClass = "status-start";

          if (progress >= totalSteps) {
            statusLabel = "✅ Completed";
            statusClass = "status-completed";
          } else if (progress > 0) {
            statusLabel = `⏳ Step ${progress} / ${totalSteps}`;
            statusClass = "status-progress";
          }

          return (
            <li key={lesson.id} className="lesson-item">
              <button 
                className="lesson-button" 
                onClick={() => onLoadLesson(lesson.id)}
              >
                <span className="lesson-title">{lesson.title}</span>
                <span className={`lesson-status ${statusClass}`}>
                  {statusLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LessonList;