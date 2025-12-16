import React from 'react';

const LessonList = ({ lessons, onLoadLesson, userProgress }) => { 
  if (lessons.length === 0) {
    return <h2>Loading Available Lessons...</h2>;
  }

  return (
    <div>
      <h2>Available Lessons</h2>
      <ul className="lesson-list">
        {lessons.map(lesson => {
          const completedSteps = userProgress[lesson.id] || 0;
          
          // Assuming lesson data includes total steps (handled by App.jsx fetching logic)
          // For simplicity here, we'll just check if progress > 0
          
          let statusText = '';
          if (completedSteps > 0) {
            statusText = `⏳ In Progress`;
          }

          return (
            <li key={lesson.id} className="lesson-item">
              <a href="#" onClick={() => onLoadLesson(lesson.id)}>
                {lesson.title}
              </a>
              <span style={{ float: 'right', fontSize: '0.9em', color: statusText ? 'orange' : '#ccc' }}>
                {statusText}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LessonList;
