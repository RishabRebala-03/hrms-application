// src/components/ProgressTracker.js
import React, { useState, useEffect } from 'react';

const ProgressTracker = ({ user }) => {
  const [weeklyData, setWeeklyData] = useState({
    tasksCompleted: 12,
    totalTasks: 15,
    hoursWorked: 38,
    expectedHours: 40,
    meetingsAttended: 8,
    totalMeetings: 10,
    projectsActive: 3,
    deadlinesMet: 5,
    totalDeadlines: 6
  });

  const [todayWork, setTodayWork] = useState({
    tasksCompleted: 0,
    hoursWorked: 0,
    meetingsAttended: 0,
    deadlinesMet: 0,
    description: ''
  });

  const [showConfetti, setShowConfetti] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [weekProgress, setWeekProgress] = useState(0);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  useEffect(() => {
    calculateProgress();
    generateAchievements();
    generateMotivationalMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyData]);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const calculateProgress = () => {
    const taskProgress = (weeklyData.tasksCompleted / weeklyData.totalTasks) * 100;
    const hoursProgress = (weeklyData.hoursWorked / weeklyData.expectedHours) * 100;
    const meetingProgress = (weeklyData.meetingsAttended / weeklyData.totalMeetings) * 100;
    const deadlineProgress = (weeklyData.deadlinesMet / weeklyData.totalDeadlines) * 100;
    
    const overall = (taskProgress + hoursProgress + meetingProgress + deadlineProgress) / 4;
    setWeekProgress(Math.round(overall));
  };

  const generateAchievements = () => {
    const newAchievements = [];
    
    if (weeklyData.tasksCompleted >= weeklyData.totalTasks) {
      newAchievements.push({ 
        icon: '🎯', 
        title: 'Task Master', 
        description: 'Completed all tasks this week!',
        color: '#10b981'
      });
    }
    
    if (weeklyData.hoursWorked >= weeklyData.expectedHours) {
      newAchievements.push({ 
        icon: '⏰', 
        title: 'Time Champion', 
        description: 'Met your weekly hours goal!',
        color: '#3b82f6'
      });
    }
    
    if (weeklyData.deadlinesMet === weeklyData.totalDeadlines) {
      newAchievements.push({ 
        icon: '🚀', 
        title: 'Deadline Crusher', 
        description: 'Never missed a deadline!',
        color: '#f59e0b'
      });
    }

    if (weeklyData.tasksCompleted > 10) {
      newAchievements.push({ 
        icon: '💪', 
        title: 'Productivity Pro', 
        description: 'Completed 10+ tasks this week!',
        color: '#8b5cf6'
      });
    }
    
    setAchievements(newAchievements);
  };

  const generateMotivationalMessage = () => {
    const progress = weekProgress;
    let message = '';
    let emoji = '';
    
    if (progress >= 90) {
      emoji = '🌟';
      message = "Outstanding work this week! You're absolutely crushing it! Keep up this amazing momentum!";
    } else if (progress >= 75) {
      emoji = '🎉';
      message = "Fantastic progress! You're doing great work. Just a little more push to reach perfection!";
    } else if (progress >= 60) {
      emoji = '👏';
      message = "Good job! You're making solid progress. Keep the momentum going strong!";
    } else if (progress >= 40) {
      emoji = '💪';
      message = "You're on the right track! A bit more effort and you'll be in the excellent zone!";
    } else {
      emoji = '🌱';
      message = "Every journey starts with a step. You've got this! Let's pick up the pace together!";
    }
    
    setMotivationalMessage(`${emoji} ${message}`);
  };

  const handleUpdateProgress = () => {
    // Update weekly data with today's work
    const newWeeklyData = {
      tasksCompleted: weeklyData.tasksCompleted + parseInt(todayWork.tasksCompleted || 0),
      totalTasks: weeklyData.totalTasks,
      hoursWorked: weeklyData.hoursWorked + parseFloat(todayWork.hoursWorked || 0),
      expectedHours: weeklyData.expectedHours,
      meetingsAttended: weeklyData.meetingsAttended + parseInt(todayWork.meetingsAttended || 0),
      totalMeetings: weeklyData.totalMeetings,
      projectsActive: weeklyData.projectsActive,
      deadlinesMet: weeklyData.deadlinesMet + parseInt(todayWork.deadlinesMet || 0),
      totalDeadlines: weeklyData.totalDeadlines
    };

    setWeeklyData(newWeeklyData);
    setShowConfetti(true);
    setShowWorkModal(false);
    
    // Show success message
    setUpdateMessage('🎉 Amazing work! Your progress has been updated!');
    setTimeout(() => setUpdateMessage(''), 5000);

    // Reset form
    setTodayWork({
      tasksCompleted: 0,
      hoursWorked: 0,
      meetingsAttended: 0,
      deadlinesMet: 0,
      description: ''
    });
  };

  const Confetti = () => {
    if (!showConfetti) return null;

    const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDelay: Math.random() * 3,
      backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#00b894'][Math.floor(Math.random() * 6)]
    }));

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden'
      }}>
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            style={{
              position: 'absolute',
              width: '10px',
              height: '10px',
              backgroundColor: piece.backgroundColor,
              left: `${piece.left}%`,
              top: '-10px',
              opacity: 0.8,
              animation: `fall 3s linear forwards`,
              animationDelay: `${piece.animationDelay}s`,
              borderRadius: Math.random() > 0.5 ? '50%' : '0'
            }}
          />
        ))}
        <style>{`
          @keyframes fall {
            to {
              transform: translateY(100vh) rotate(360deg);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    );
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return '#10b981';
    if (percentage >= 75) return '#3b82f6';
    if (percentage >= 60) return '#f59e0b';
    if (percentage >= 40) return '#ef4444';
    return '#6b7280';
  };

  const getDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const metrics = [
    {
      label: 'Tasks Completed',
      current: weeklyData.tasksCompleted,
      total: weeklyData.totalTasks,
      icon: '✅',
      color: '#10b981'
    },
    {
      label: 'Hours Worked',
      current: weeklyData.hoursWorked,
      total: weeklyData.expectedHours,
      icon: '⏰',
      color: '#3b82f6'
    },
    {
      label: 'Meetings Attended',
      current: weeklyData.meetingsAttended,
      total: weeklyData.totalMeetings,
      icon: '👥',
      color: '#8b5cf6'
    },
    {
      label: 'Deadlines Met',
      current: weeklyData.deadlinesMet,
      total: weeklyData.totalDeadlines,
      icon: '🎯',
      color: '#f59e0b'
    }
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <Confetti />
      
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: 16,
            padding: '28px 32px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h1 style={{
                  margin: 0,
                  marginBottom: 8,
                  fontSize: 32,
                  fontWeight: 700,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  Weekly Progress Tracker 📊
                </h1>
                <p style={{
                  margin: 0,
                  fontSize: 16,
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginBottom: 4
                }}>
                  {user?.name} • {getDayOfWeek()}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.75)'
                }}>
                  Track your progress and celebrate your wins! 🎉
                </p>
              </div>
              
              {/* Add Work Button */}
              <button
                onClick={() => setShowWorkModal(true)}
                style={{
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
              >
                <span style={{ fontSize: 20 }}>✏️</span>
                Update Today's Work
              </button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {updateMessage && (
          <div style={{
            background: '#d1f4dd',
            color: '#0a5d2c',
            padding: '16px 24px',
            borderRadius: 12,
            marginBottom: 24,
            fontSize: 16,
            fontWeight: 600,
            textAlign: 'center',
            border: '2px solid #7de3a6',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
            animation: 'slideIn 0.3s ease'
          }}>
            {updateMessage}
          </div>
        )}

        {/* Overall Progress */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 32,
          marginBottom: 24,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: 0, marginBottom: 16, fontSize: 20, fontWeight: 700 }}>
            Overall Weekly Progress
          </h3>
          
          {/* Progress Bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8
            }}>
              <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>
                Week Completion
              </span>
              <span style={{
                fontSize: 24,
                fontWeight: 700,
                color: getProgressColor(weekProgress)
              }}>
                {weekProgress}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: 24,
              background: '#f3f4f6',
              borderRadius: 12,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: `${weekProgress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${getProgressColor(weekProgress)}, ${getProgressColor(weekProgress)}dd)`,
                transition: 'width 1s ease',
                borderRadius: 12,
                boxShadow: `0 0 10px ${getProgressColor(weekProgress)}50`
              }} />
            </div>
          </div>

          {/* Motivational Message */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: 20,
            borderRadius: 12,
            fontSize: 16,
            lineHeight: 1.6,
            fontWeight: 500,
            textAlign: 'center'
          }}>
            {motivationalMessage}
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 20,
          marginBottom: 24
        }}>
          {metrics.map((metric, index) => {
            const percentage = Math.min(Math.round((metric.current / metric.total) * 100), 100);
            return (
              <div key={index} style={{
                background: 'white',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: metric.color,
                  opacity: 0.1
                }} />
                
                <div style={{ fontSize: 40, marginBottom: 12 }}>{metric.icon}</div>
                <div style={{
                  fontSize: 14,
                  color: '#6b7280',
                  marginBottom: 8,
                  fontWeight: 500
                }}>
                  {metric.label}
                </div>
                <div style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: metric.color,
                  marginBottom: 8
                }}>
                  {metric.current} / {metric.total}
                </div>
                
                {/* Mini Progress Bar */}
                <div style={{
                  width: '100%',
                  height: 8,
                  background: '#f3f4f6',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: metric.color,
                    transition: 'width 0.5s ease',
                    borderRadius: 4
                  }} />
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  marginTop: 4,
                  textAlign: 'right'
                }}>
                  {percentage}% Complete
                </div>
              </div>
            );
          })}
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 32,
            marginBottom: 24,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: 0, marginBottom: 20, fontSize: 20, fontWeight: 700 }}>
              🏆 Achievements Unlocked This Week
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 16
            }}>
              {achievements.map((achievement, index) => (
                <div key={index} style={{
                  background: `${achievement.color}10`,
                  border: `2px solid ${achievement.color}30`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <div style={{ fontSize: 36 }}>{achievement.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: achievement.color,
                      marginBottom: 4
                    }}>
                      {achievement.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {achievement.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: 0, marginBottom: 20, fontSize: 20, fontWeight: 700 }}>
            💡 Tips to Boost Your Productivity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '🎯', tip: 'Break large tasks into smaller, manageable chunks' },
              { icon: '⏰', tip: 'Use time-blocking to dedicate focused hours to important work' },
              { icon: '🧘', tip: 'Take regular breaks to maintain high energy levels' },
              { icon: '📝', tip: 'Review and plan your tasks at the start of each day' },
              { icon: '🤝', tip: 'Communicate proactively with your team' }
            ].map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                background: '#f9fafb',
                borderRadius: 8,
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: 24 }}>{item.icon}</div>
                <div style={{ fontSize: 14, color: '#374151' }}>{item.tip}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Work Input Modal */}
      {showWorkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          padding: 20
        }}
        onClick={() => setShowWorkModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 32,
            maxWidth: 600,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)'
          }}
          onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              margin: 0,
              marginBottom: 8,
              fontSize: 24,
              fontWeight: 700,
              color: '#111827'
            }}>
              ✏️ Update Today's Work
            </h2>
            <p style={{
              margin: 0,
              marginBottom: 24,
              fontSize: 14,
              color: '#6b7280'
            }}>
              Enter what you've accomplished today to track your weekly progress
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6
                }}>
                  Tasks Completed Today
                </label>
                <input
                  type="number"
                  min="0"
                  value={todayWork.tasksCompleted}
                  onChange={(e) => setTodayWork({ ...todayWork, tasksCompleted: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  placeholder="e.g., 3"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6
                }}>
                  Hours Worked Today
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={todayWork.hoursWorked}
                  onChange={(e) => setTodayWork({ ...todayWork, hoursWorked: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  placeholder="e.g., 8"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6
                }}>
                  Meetings Attended Today
                </label>
                <input
                  type="number"
                  min="0"
                  value={todayWork.meetingsAttended}
                  onChange={(e) => setTodayWork({ ...todayWork, meetingsAttended: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  placeholder="e.g., 2"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6
                }}>
                  Deadlines Met Today
                </label>
                <input
                  type="number"
                  min="0"
                  value={todayWork.deadlinesMet}
                  onChange={(e) => setTodayWork({ ...todayWork, deadlinesMet: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  placeholder="e.g., 1"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6
                }}>
                  Brief Description (Optional)
                </label>
                <textarea
                  value={todayWork.description}
                  onChange={(e) => setTodayWork({ ...todayWork, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  placeholder="Describe your key accomplishments today..."
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: 12,
              marginTop: 24,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowWorkModal(false)}
                style={{
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#6b7280',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProgress}
                style={{
                  padding: '12px 32px',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'white',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }}
              >
                💾 Save Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;