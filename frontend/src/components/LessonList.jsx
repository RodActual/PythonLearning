import React from 'react';

const LessonList = ({ lessons, onLoadLesson, userProgress, onResetLesson }) => { 
  if (!lessons || lessons.length === 0) {
    return <div className="loading-state">Loading Available Lessons...</div>;
  }

  return (
    <div className="lesson-list-container">
      <h2>Available Lessons</h2>
      <ul className="lesson-list">
        {lessons.map(lesson => {
          const progress = userProgress[lesson.id] || 0;
          const totalSteps = lesson.step_count || 5; 

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
              <div className="lesson-row">
                {/* Main Lesson Button */}
                <button 
                  className="lesson-button" 
                  onClick={() => onLoadLesson(lesson.id)}
                >
                  <span className="lesson-title">{lesson.title}</span>
                  <span className={`lesson-status ${statusClass}`}>
                    {statusLabel}
                  </span>
                </button>

                {/* Individual Reset Button - Only shows if there is progress */}
                {progress > 0 && (
                  <button 
                    className="reset-lesson-btn"
                    title="Reset this lesson"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening the lesson
                      onResetLesson(lesson.id);
                    }}
                  >
                    ↺
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LessonList;