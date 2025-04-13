
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface StreakData {
  currentStreak: number;
  highestStreak: number;
  streakBonusActive: boolean;
  bonusMultiplier: number;
}

const PlayerStreak: React.FC = () => {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [animateStreak, setAnimateStreak] = useState(false);

  // Fetch streak data on component mount
  useEffect(() => {
    const fetchStreakData = async () => {
      try {
        const response = await axios.get('/api/player-streak');
        setStreakData(response.data);
      } catch (error) {
        console.error('Failed to fetch streak data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreakData();
  }, []);

  // Subscribe to answer events
  useEffect(() => {
    const handleCorrectAnswer = async () => {
      try {
        // Trigger animation
        setAnimateStreak(true);
        setTimeout(() => setAnimateStreak(false), 1000);
        
        // Fetch updated streak data
        const response = await axios.get('/api/player-streak');
        setStreakData(response.data);
      } catch (error) {
        console.error('Failed to update streak after correct answer', error);
      }
    };

    // Listen for correct answer events from the game
    window.addEventListener('correct-answer', handleCorrectAnswer);
    
    return () => {
      window.removeEventListener('correct-answer', handleCorrectAnswer);
    };
  }, []);

  if (loading) {
    return <div className="streak-loading">Loading streak...</div>;
  }

  if (!streakData) {
    return null;
  }

  return (
    <div className={`streak-container ${animateStreak ? 'streak-animate' : ''}`}>
      <div className="current-streak">
        <span className="streak-label">Streak:</span>
        <span className="streak-value">{streakData.currentStreak}</span>
      </div>
      
      {streakData.streakBonusActive && (
        <div className="streak-bonus">
          <span className="bonus-icon">🔥</span>
          <span className="bonus-text">{streakData.bonusMultiplier}x</span>
        </div>
      )}
      
      <div className="highest-streak">
        <span className="highest-label">Best:</span>
        <span className="highest-value">{streakData.highestStreak}</span>
      </div>
    </div>
  );
};

export default PlayerStreak;