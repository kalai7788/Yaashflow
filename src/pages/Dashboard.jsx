import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  FiPlay, FiSquare, FiBarChart2, FiClock, 
  FiCalendar, FiTrendingUp, FiPlus, FiFilter,
  FiEdit, FiPocket, FiTarget, FiAward, FiBell, FiUser, FiX,
  FiEdit2, FiTrash2, FiUsers, FiActivity,
  FiStar, FiCoffee, FiZap
} from "react-icons/fi";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  limit,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { db, auth } from "../firebase";

export default function Dashboard({ projects = [], clients = [] }) {
  // State management
  const [timerRunning, setTimerRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeInput, setEditTimeInput] = useState("");
  const [activeTab, setActiveTab] = useState('today');
  const [localProjects, setLocalProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [goals, setGoals] = useState([]);
  const [insights, setInsights] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({
    name: "",
    target: "",
    period: "daily"
  });
  const [teamPerformance, setTeamPerformance] = useState({});
  const [productivityScore, setProductivityScore] = useState(0);
  const [focusTime, setFocusTime] = useState(0);
  const [userId, setUserId] = useState(null);

  // Use combined projects array
  const allProjects = projects.length > 0 ? projects : localProjects;

  // Get current user ID
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Save timer state to Firebase
  const saveTimerState = useCallback(async () => {
    if (!userId) return;
    try {
      await setDoc(doc(collection(db, "users", userId, "timer")), {
        time,
        description,
        selectedProject,
        timerRunning,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error("Error saving timer state:", error);
    }
  }, [time, description, selectedProject, timerRunning, userId]);

  // Fetch data from Firebase using onSnapshot
  useEffect(() => {
    if (!userId) return;

    // Fetch timer state
    const unsubscribeTimer = onSnapshot(
      query(
        collection(db, "users", userId, "timer"),
        orderBy("timestamp", "desc"),
        limit(1)
      ),
      (snapshot) => {
        if (!snapshot.empty) {
          const timerData = snapshot.docs[0].data();
          setTime(timerData.time || 0);
          setDescription(timerData.description || '');
          setSelectedProject(timerData.selectedProject || '');
          setTimerRunning(timerData.timerRunning || false);
        }
      },
      (error) => {
        console.error("Error fetching timer state:", error);
      }
    );

    // Fetch recent activities
    const unsubscribeActivities = onSnapshot(
      query(
        collection(db, "users", userId, "activities"),
        orderBy("date", "desc"),
        limit(50)
      ),
      (snapshot) => {
        const activities = [];
        snapshot.forEach((doc) => {
          activities.push({ id: doc.id, ...doc.data() });
        });
        setRecentActivity(activities);
      },
      (error) => {
        console.error("Error fetching activities:", error);
      }
    );

    // Fetch projects
    const unsubscribeProjects = onSnapshot(
      query(collection(db, "users", userId, "projects")),
      (snapshot) => {
        const projects = [];
        snapshot.forEach((doc) => {
          projects.push({ id: doc.id, ...doc.data() });
        });
        setLocalProjects(projects);
      },
      (error) => {
        console.error("Error fetching projects:", error);
      }
    );

    // Fetch teams
    const unsubscribeTeams = onSnapshot(
      query(collection(db, "users", userId, "teams")),
      (snapshot) => {
        const teams = [];
        snapshot.forEach((doc) => {
          teams.push({ id: doc.id, ...doc.data() });
        });
        setTeams(teams);
      },
      (error) => {
        console.error("Error fetching teams:", error);
      }
    );

    // Fetch goals
    const unsubscribeGoals = onSnapshot(
      query(collection(db, "users", userId, "goals")),
      (snapshot) => {
        const goals = [];
        snapshot.forEach((doc) => {
          goals.push({ id: doc.id, ...doc.data() });
        });
        
        if (goals.length === 0) {
          // Set default goals if none exist
          const defaultGoals = [
            { name: "Daily Target", target: 8 * 3600, current: 0, period: "daily" },
            { name: "Weekly Target", target: 40 * 3600, current: 0, period: "weekly" }
          ];
          defaultGoals.forEach(async (goal) => {
            try {
              await setDoc(doc(collection(db, "users", userId, "goals")), {
                ...goal,
                createdAt: Timestamp.now()
              });
            } catch (error) {
              console.error("Error creating default goal:", error);
            }
          });
        } else {
          setGoals(goals);
        }
      },
      (error) => {
        console.error("Error fetching goals:", error);
      }
    );

    return () => {
      unsubscribeTimer();
      unsubscribeActivities();
      unsubscribeProjects();
      unsubscribeTeams();
      unsubscribeGoals();
    };
  }, [userId]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTimeShort = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Parse HH:MM:SS or MM:SS to seconds
  const parseTimeToSeconds = (timeString) => {
    const parts = timeString.split(':').map(part => parseInt(part, 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  };

  // Get client name from project
  const getClientNameFromProject = (project) => {
    if (!project) return "Unknown Client";
    if (project.clientId) {
      const client = clients.find(c => c.id === project.clientId);
      return client ? client.name : project.client;
    }
    const client = clients.find(c => c.name === project.client);
    return client ? client.name : project.client;
  };

  // Calculate team performance metrics
  const calculateTeamPerformance = useCallback(() => {
    const performance = {};
    teams.forEach(team => {
      const teamProjects = allProjects.filter(p => p.teamId === team.id);
      const teamActivities = recentActivity.filter(activity => 
        teamProjects.some(p => p.name === activity.project)
      );
      const totalTime = teamActivities.reduce((sum, activity) => sum + activity.seconds, 0);
      const completedTasks = teamProjects.reduce((sum, project) => 
        sum + (project.tasks?.filter(t => t.status === 'completed').length || 0), 0
      );
      performance[team.id] = {
        totalTime,
        completedTasks,
        projectCount: teamProjects.length,
        productivity: totalTime > 0 ? (completedTasks / (totalTime / 3600)) : 0
      };
    });
    setTeamPerformance(performance);
  }, [teams, allProjects, recentActivity]);

  // Calculate productivity score
 const calculateProductivityScore = useCallback(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayActivities = recentActivity.filter(activity => {
    if (!activity.date) return false;
    const activityDate = activity.date.toDate 
      ? activity.date.toDate() 
      : new Date(activity.date);
    return activityDate >= today;
  });
    const totalTime = todayActivities.reduce((sum, activity) => sum + (activity.seconds || 0), 0);
    const uniqueProjects = new Set(todayActivities.map(activity => activity.project)).size;

    const timeScore = Math.min(40, (totalTime / 3600) * 10);
    const projectScore = Math.min(30, uniqueProjects * 5);
    const sessionScore = Math.min(30, todayActivities.length * 2);
    const score = Math.min(100, Math.round(timeScore + projectScore + sessionScore));

    setProductivityScore(score || 0);

    const focusTimeToday = todayActivities
      .filter(activity => (activity.seconds || 0) >= 1500) // 25 minutes
      .reduce((sum, activity) => sum + (activity.seconds || 0), 0);
    setFocusTime(focusTimeToday || 0);
  }, [recentActivity]);

  // Recalculate performance and score when dependencies change
  useEffect(() => {
    calculateTeamPerformance();
    calculateProductivityScore();
  }, [calculateTeamPerformance, calculateProductivityScore]);

  // Toggle timer
  const toggleTimer = async () => {
    if (timerRunning) {
      if (description && selectedProject) {
        const project = allProjects.find(p => p.id.toString() === selectedProject);
        const clientName = getClientNameFromProject(project);
        const newActivity = {
          task: description,
          project: project?.name || "Unknown Project",
          client: clientName,
          time: formatTime(time),
          seconds: time,
          date: Timestamp.now(),
          projectId: project?.id
        };
        try {
          await setDoc(doc(collection(db, "users", userId, "activities")), newActivity);
          updateGoals(time);
          generateInsights({ id: Date.now().toString(), ...newActivity });
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'success',
            message: `Tracked ${formatTime(time)} for ${project?.name}`,
            timestamp: new Date().toISOString()
          }]);
        } catch (error) {
          console.error("Error saving activity:", error);
        }
      }
      setTime(0);
      setDescription("");
      setSelectedProject("");
    }
    setTimerRunning((prev) => !prev);
  };

  // Goal management functions
  const handleAddGoal = () => {
    setEditingGoal(null);
    setNewGoal({ name: "", target: "", period: "daily" });
    setShowGoalForm(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!userId || !newGoal.name.trim() || !newGoal.target) return;
    const targetSeconds = parseInt(newGoal.target) * 3600;
    try {
      if (editingGoal) {
        await updateDoc(doc(db, "users", userId, "goals", editingGoal.id), {
          name: newGoal.name,
          target: targetSeconds,
          period: newGoal.period,
          lastUpdated: Timestamp.now()
        });
      } else {
        await setDoc(doc(collection(db, "users", userId, "goals")), {
          name: newGoal.name,
          target: targetSeconds,
          current: 0,
          period: newGoal.period,
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now()
        });
      }
      setShowGoalForm(false);
      setNewGoal({ name: "", target: "", period: "daily" });
      setEditingGoal(null);
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setNewGoal({
      name: goal.name,
      target: goal.target / 3600,
      period: goal.period
    });
    setShowGoalForm(true);
  };

  const handleDeleteGoal = async (goalId) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, "users", userId, "goals", goalId));
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const handleCancelGoal = () => {
    setShowGoalForm(false);
    setNewGoal({ name: "", target: "", period: "daily" });
    setEditingGoal(null);
  };

  const handleGoalInputChange = (e) => {
    const { name, value } = e.target;
    setNewGoal(prev => ({ ...prev, [name]: value }));
  };

  // Update time goals
  const updateGoals = async (timeSpent) => {
    if (!userId) return;
    try {
      // Use onSnapshot to get goals instead of getDocs
      const unsubscribe = onSnapshot(
        query(collection(db, "users", userId, "goals")),
        async (snapshot) => {
          for (const goalDoc of snapshot.docs) {
            const goal = goalDoc.data();
            let updatedCurrent = goal.current;
            let shouldUpdate = false;
            const now = new Date();
            const today = new Date().toDateString();

            if (goal.period === "daily") {
              const lastUpdated = goal.lastUpdated ? goal.lastUpdated.toDate().toDateString() : null;
              if (lastUpdated !== today) {
                updatedCurrent = timeSpent;
                shouldUpdate = true;
              } else {
                updatedCurrent = goal.current + timeSpent;
                shouldUpdate = true;
              }
            } else if (goal.period === "weekly") {
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay());
              startOfWeek.setHours(0, 0, 0, 0);
              const lastUpdated = goal.lastUpdated ? goal.lastUpdated.toDate() : null;
              if (!lastUpdated || lastUpdated < startOfWeek) {
                updatedCurrent = timeSpent;
                shouldUpdate = true;
              } else {
                updatedCurrent = goal.current + timeSpent;
                shouldUpdate = true;
              }
            }

            if (shouldUpdate) {
              await updateDoc(doc(db, "users", userId, "goals", goalDoc.id), {
                current: updatedCurrent,
                lastUpdated: Timestamp.now()
              });
            }
          }
        },
        (error) => {
          console.error("Error updating goals:", error);
        }
      );
      
      // Clean up the listener immediately since we only need it once
      unsubscribe();
    } catch (error) {
      console.error("Error updating goals:", error);
    }
  };

  // Generate insights based on activity
  const generateInsights = (activity) => {
    const newInsights = [];

    if (activity.seconds > 2 * 3600) {
      newInsights.push({
        id: Date.now(),
        type: "long_session",
        message: `Long session recorded for ${activity.project} (${formatTime(activity.seconds)})`,
        priority: "medium",
        icon: <FiCoffee />
      });
    }

    if (activity.seconds >= 1500 && activity.seconds <= 1800) {
      newInsights.push({
        id: Date.now(),
        type: "focus_session",
        message: `Great focus session on ${activity.project}`,
        priority: "high",
        icon: <FiTarget />
      });
    }

    const lastProjectActivity = recentActivity
      .filter(a => a.project === activity.project)
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      })[0];

    if (lastProjectActivity) {
      const lastActivityDate = lastProjectActivity.date?.toDate ? 
        lastProjectActivity.date.toDate() : new Date(lastProjectActivity.date);
      const daysSinceLastWorked = Math.floor((new Date() - lastActivityDate) / (1000 * 60 * 60 * 24));
      if (daysSinceLastWorked > 7) {
        newInsights.push({
          id: Date.now(),
          type: "returning_project",
          message: `Back to ${activity.project} after ${daysSinceLastWorked} days`,
          priority: "low",
          icon: <FiTrendingUp />
        });
      }
    }

    goals.forEach(goal => {
      const progress = (goal.current / goal.target) * 100;
      if (progress >= 75 && progress < 100) {
        newInsights.push({
          id: Date.now(),
          type: "goal_progress",
          message: `You're ${Math.round(progress)}% towards your ${goal.name}`,
          priority: "medium",
          icon: <FiAward />
        });
      } else if (progress >= 100) {
        newInsights.push({
          id: Date.now(),
          type: "goal_achieved",
          message: `Congratulations! You achieved your ${goal.name} 🎉`,
          priority: "high",
          icon: <FiStar />
        });
      }
    });

    if (newInsights.length > 0) {
      setInsights(prev => [...newInsights, ...prev.slice(0, 9)]);
    }
  };

  // Update the calculateTimeTotals function
const calculateTimeTotals = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // Start of month

  return {
    today: recentActivity
      .filter(activity => {
        if (!activity.date) return false;
        const activityDate = activity.date.toDate 
          ? activity.date.toDate() 
          : new Date(activity.date);
        return activityDate >= today;
      })
      .reduce((sum, activity) => sum + (activity.seconds || 0), 0),
      
    week: recentActivity
      .filter(activity => {
        if (!activity.date) return false;
        const activityDate = activity.date.toDate 
          ? activity.date.toDate() 
          : new Date(activity.date);
        return activityDate >= startOfWeek;
      })
      .reduce((sum, activity) => sum + (activity.seconds || 0), 0),
      
    month: recentActivity
      .filter(activity => {
        if (!activity.date) return false;
        const activityDate = activity.date.toDate 
          ? activity.date.toDate() 
          : new Date(activity.date);
        return activityDate >= startOfMonth;
      })
      .reduce((sum, activity) => sum + (activity.seconds || 0), 0),
      
    total: recentActivity.reduce((sum, activity) => sum + (activity.seconds || 0), 0)
  };
};


  const timeTotals = calculateTimeTotals();

  // Start editing time manually
  const startEditingTime = () => {
    setIsEditingTime(true);
    setEditTimeInput(formatTime(time));
  };

  // Save manually edited time
  const saveEditedTime = () => {
    const newTime = parseTimeToSeconds(editTimeInput);
    if (!isNaN(newTime)) {
      setTime(newTime);
    }
    setIsEditingTime(false);
  };

  // Timer effect
  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Save timer state when it changes
  useEffect(() => {
    if (userId) {
      saveTimerState();
    }
  }, [time, description, selectedProject, timerRunning, userId, saveTimerState]);

  // Get project suggestions
  const getProjectSuggestions = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const recentProjects = recentActivity
    .filter(activity => {
      if (!activity.date) return false;
      const activityDate = activity.date.toDate 
        ? activity.date.toDate() 
        : new Date(activity.date);
      return activityDate >= today;
    })
    .map(activity => activity.project);
    
  return allProjects
    .filter(project => !recentProjects.includes(project.name))
    .slice(0, 3);
};

  const projectSuggestions = getProjectSuggestions();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Time Tracker Dashboard</h1>
          <p className="text-sm text-gray-600">Welcome back! Ready to be productive?</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-full hover:bg-gray-100 relative">
            <FiBell className="text-gray-600" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
          <button className="flex items-center space-x-2 bg-gray-100 rounded-full py-1 px-3">
            <FiUser className="text-gray-600" />
            <span className="text-sm font-medium">User</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        {/* Productivity Score Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">Today's Productivity</h2>
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold">{productivityScore}/100</div>
                <div className="text-sm">
                  <p>Focus Time: {formatTimeShort(focusTime)}</p>
                  <p>Sessions: {recentActivity.filter(a => 
                    new Date(a.date).toDateString() === new Date().toDateString()
                  ).length}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <FiZap className="text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Timer Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTimer}
              className={`p-4 rounded-full transition-all transform hover:scale-105 ${
                timerRunning 
                  ? "bg-red-500 text-white shadow-lg" 
                  : "bg-green-500 text-white shadow-lg"
              }`}
            >
              {timerRunning ? <FiSquare size={24} /> : <FiPlay size={24} />}
            </button>
            <input
              type="text"
              placeholder="What are you working on right now?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-grow border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
            <div className="relative flex-1">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-lg"
              >
                <option value="">Select Project</option>
                {allProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.client ? `(${project.client})` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                <FiFilter size={20} />
              </div>
            </div>
            <div className="text-3xl font-bold relative min-w-[140px]">
              {isEditingTime ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    value={editTimeInput}
                    onChange={(e) => setEditTimeInput(e.target.value)}
                    className="border border-gray-200 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="HH:MM:SS"
                  />
                  <button 
                    onClick={saveEditedTime}
                    className="ml-2 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div 
                  className="cursor-pointer hover:bg-gray-100 px-4 py-3 rounded-lg transition-colors text-center"
                  onClick={startEditingTime}
                  title="Click to edit time manually"
                >
                  {formatTime(time)}
                </div>
              )}
            </div>
          </div>

          {/* Quick Project Suggestions */}
          {projectSuggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Quick picks:</p>
              <div className="flex space-x-2">
                {projectSuggestions.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project.id)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition"
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatTimeShort(timeTotals.today)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <FiClock size={24} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {recentActivity.filter(a => 
                new Date(a.date).toDateString() === new Date().toDateString()
              ).length} sessions today
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatTimeShort(timeTotals.week)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <FiCalendar size={24} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {Math.round(timeTotals.week / 3600)} hours total
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Projects</p>
                <p className="text-2xl font-bold text-purple-600">
                  {allProjects.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <FiPocket size={24} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <Link to="/projects" className="text-blue-500 hover:underline">
                View all projects
              </Link>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Teams</p>
                <p className="text-2xl font-bold text-orange-600">
                  {teams.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                <FiUsers size={24} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <Link to="/team" className="text-blue-500 hover:underline">
                Manage teams
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Goals Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Time Goals</h3>
              <div className="flex items-center space-x-2">
                <FiTarget className="text-gray-500" />
                <button 
                  onClick={handleAddGoal}
                  className="p-1 text-blue-500 hover:text-blue-600"
                  title="Add new goal"
                >
                  <FiPlus size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {goals.map(goal => {
                const percentage = Math.min(100, (goal.current / goal.target) * 100);
                const hoursSpent = (goal.current / 3600).toFixed(1);
                const hoursTarget = (goal.target / 3600).toFixed(1);
                return (
                  <div key={goal.id} className="group relative">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">{goal.name}</span>
                      <span className="text-xs text-gray-500">
                        {hoursSpent}h / {hoursTarget}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: percentage >= 100 ? '#10B981' : 
                                         percentage >= 75 ? '#3B82F6' : 
                                         percentage >= 50 ? '#F59E0B' : '#EF4444'
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 capitalize">{goal.period} goal</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                        <button 
                          onClick={() => handleEditGoal(goal)}
                          className="p-1 text-gray-500 hover:text-blue-500"
                          title="Edit goal"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1 text-gray-500 hover:text-red-500"
                          title="Delete goal"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <FiTarget size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No goals set yet</p>
                  <p className="text-xs">Set goals to track your productivity</p>
                </div>
              )}
            </div>
            <button 
              onClick={handleAddGoal}
              className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center transition-colors"
            >
              <FiPlus size={16} className="mr-1" />
              Add Goal
            </button>
          </div>

          {/* Team Performance */}
          {teams.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiUsers /> Team Performance
              </h3>
              <div className="space-y-4">
                {teams.map(team => {
                  const performance = teamPerformance[team.id] || { 
                    totalTime: 0, 
                    completedTasks: 0, 
                    projectCount: 0,
                    productivity: 0 
                  };
                  const productivityDisplay = performance.productivity && !isNaN(performance.productivity) 
                    ? performance.productivity.toFixed(1)
                    : '0.0';
                  return (
                    <div key={team.id} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2">{team.name}</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Time: </span>
                          <span className="font-medium">{formatTimeShort(performance.totalTime)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Tasks: </span>
                          <span className="font-medium">{performance.completedTasks}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Projects: </span>
                          <span className="font-medium">{performance.projectCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Productivity: </span>
                          <span className="font-medium">{productivityDisplay}/hr</span>
                        </div>
                      </div>
                      {performance.totalTime > 0 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${Math.min(100, (performance.completedTasks / Math.max(1, performance.projectCount * 5)) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Task completion: {performance.completedTasks} / {performance.projectCount * 5}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {teams.length > 1 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Team Comparison</h4>
                  <div className="space-y-2">
                    {teams
                      .filter(team => teamPerformance[team.id]?.totalTime > 0)
                      .sort((a, b) => (teamPerformance[b.id]?.productivity || 0) - (teamPerformance[a.id]?.productivity || 0))
                      .slice(0, 3)
                      .map((team) => {
                        const performance = teamPerformance[team.id] || { productivity: 0 };
                        return (
                          <div key={team.id} className="flex justify-between items-center">
                            <span className="text-sm">{team.name}</span>
                            <span className="text-sm font-medium">
                              {performance.productivity && !isNaN(performance.productivity) 
                                ? performance.productivity.toFixed(1) 
                                : '0.0'
                              }/hr
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recent Activity</h3>
              <div className="flex space-x-1">
                <button 
                  className={`px-3 py-1 rounded-lg text-sm ${activeTab === 'today' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('today')}
                >
                  Today
                </button>
                <button 
                  className={`px-3 py-1 rounded-lg text-sm ${activeTab === 'week' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('week')}
                >
                  Week
                </button>
                <button 
                  className={`px-3 py-1 rounded-lg text-sm ${activeTab === 'all' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </button>
              </div>
            </div>
      
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivity
                .filter(activity => {
                  if (!activity.date) return false;
                  
                  const activityDate = activity.date.toDate 
                    ? activity.date.toDate() 
                    : new Date(activity.date);
                    
                  if (activeTab === 'today') {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return activityDate >= today;
                  } else if (activeTab === 'week') {
                    const startOfWeek = new Date();
                    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    return activityDate >= startOfWeek;
                  }
                  return true;
                })
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">{item.task}</div>
                      <div className="text-sm text-gray-500 flex items-center truncate">
                        <span className="truncate">{item.project}</span>
                        <span className="mx-2">•</span>
                        <span className="truncate">{item.client}</span>
                        <span className="mx-2">•</span>
                           <span>
                            {(() => {
                              const date = item.date.toDate 
                                ? item.date.toDate() 
                                : new Date(item.date);
                              return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            })()}
                          </span>
                      </div>
                    </div>
                    <div className="text-gray-700 font-medium">{item.time}</div>
                  </div>
                ))}
              {recentActivity.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FiClock size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No activities recorded yet</p>
                  <p className="text-sm">Start the timer to track your time</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Insights Section */}
        {insights.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FiActivity /> Productivity Insights
              </h3>
              <FiBarChart2 className="text-gray-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.slice(0, 4).map(insight => (
                <div key={insight.id} className={`p-4 rounded-lg border ${
                  insight.priority === 'high' ? 'bg-green-50 border-green-200' :
                  insight.priority === 'medium' ? 'bg-blue-50 border-blue-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {insight.icon}
                    <div className="text-sm font-medium text-gray-800">{insight.message}</div>
                  </div>
                  <div className={`text-xs ${
                    insight.priority === 'high' ? 'text-green-600' :
                    insight.priority === 'medium' ? 'text-blue-600' :
                    'text-yellow-600'
                  }`}>
                    {insight.priority === 'high' ? 'High impact' :
                     insight.priority === 'medium' ? 'Medium impact' : 'Low impact'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/projects" className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition">
              <FiPlus className="mx-auto text-blue-600 mb-2" />
              <span className="text-sm font-medium">New Project</span>
            </Link>
            <Link to="/team" className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition">
              <FiUsers className="mx-auto text-green-600 mb-2" />
              <span className="text-sm font-medium">Manage Team</span>
            </Link>
            <button onClick={handleAddGoal} className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition">
              <FiTarget className="mx-auto text-purple-600 mb-2" />
              <span className="text-sm font-medium">Set Goal</span>
            </button>
            <Link to="/reports" className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition">
              <FiBarChart2 className="mx-auto text-orange-600 mb-2" />
              <span className="text-sm font-medium">View Reports</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Goal Form Modal */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-semibold text-gray-800">
                {editingGoal ? "Edit Goal" : "Add New Goal"}
              </h3>
              <button 
                onClick={handleCancelGoal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={newGoal.name}
                  onChange={handleGoalInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Daily Coding Target"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Time (hours) *
                </label>
                <input
                  type="number"
                  name="target"
                  value={newGoal.target}
                  onChange={handleGoalInputChange}
                  required
                  min="1"
                  step="0.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period *
                </label>
                <select
                  name="period"
                  value={newGoal.period}
                  onChange={handleGoalInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelGoal}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {editingGoal ? "Update Goal" : "Add Goal"}
                </button>
              </div>
            </form>
  </div>
        </div>
      )}
    </div>
  );
}