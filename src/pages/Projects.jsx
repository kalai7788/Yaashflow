import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaEdit, FaTrash, FaStar, FaTimes, FaSearch, 
  FaFilter, FaPlus, FaUsers, FaChartBar,
  FaEye, FaEyeSlash, FaCopy, FaUserFriends,
  FaTasks, FaCalendarAlt,
} from "react-icons/fa";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { db, auth } from "../firebase";
import ClientForm from "../components/ClientForm";

export default function Projects() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);

  // State management
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]); // Local clients state
  const [teams, setTeams] = useState([]);
  // Clients from Firebase

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showTeamAssignment, setShowTeamAssignment] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("list");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("all");

  // Form States
  const [newName, setNewName] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newColor, setNewColor] = useState("bg-blue-500");
  const [hourlyRate, setHourlyRate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [projectStatus, setProjectStatus] = useState("planning");
  const [projectPriority, setProjectPriority] = useState("medium");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Task Management States
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium",
    status: "todo"
  });

  const colors = [
    "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500", 
    "bg-purple-500", "bg-pink-500", "bg-gray-500", "bg-indigo-500",
    "bg-teal-500", "bg-orange-500", "bg-cyan-500", "bg-lime-500"
  ];

  const statusOptions = [
    { value: "planning", label: "Planning", color: "bg-gray-500" },
    { value: "active", label: "Active", color: "bg-blue-500" },
    { value: "on-hold", label: "On Hold", color: "bg-yellow-500" },
    { value: "completed", label: "Completed", color: "bg-green-500" },
    { value: "cancelled", label: "Cancelled", color: "bg-red-500" }
  ];

  const priorityOptions = [
    { value: "low", label: "Low", color: "bg-green-500" },
    { value: "medium", label: "Medium", color: "bg-yellow-500" },
    { value: "high", label: "High", color: "bg-red-500" },
    { value: "urgent", label: "Urgent", color: "bg-purple-500" }
  ];

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

  // Fetch data from Firebase
  useEffect(() => {
    if (!userId) return;

    // Fetch projects
    const fetchProjects = () => {
      const q = query(
        collection(db, "users", userId, "projects"),
        orderBy("createdAt", "desc")
      );
      
      return onSnapshot(q, (snapshot) => {
        const projectsData = [];
        snapshot.forEach((doc) => {
          projectsData.push({ id: doc.id, ...doc.data() });
        });
        setProjects(projectsData);
      });
    };

    // Fetch clients
    const fetchClients = () => {
      const q = query(collection(db, "users", userId, "clients"));
      
      return onSnapshot(q, (snapshot) => {
        const clientsData = [];
        snapshot.forEach((doc) => {
          clientsData.push({ id: doc.id, ...doc.data() });
        });
        setClients(clientsData); // Set local state
      });
    };

    // Fetch teams
    const fetchTeams = () => {
      const q = query(collection(db, "users", userId, "teams"));
      
      return onSnapshot(q, (snapshot) => {
        const teamsData = [];
        snapshot.forEach((doc) => {
          teamsData.push({ id: doc.id, ...doc.data() });
        });
        setTeams(teamsData);
      });
    };

    const unsubscribeProjects = fetchProjects();
    const unsubscribeClients = fetchClients();
    const unsubscribeTeams = fetchTeams();

    return () => {
      unsubscribeProjects();
      unsubscribeClients();
      unsubscribeTeams();
    };
  }, [userId]); 
  
  // Filter and sort projects
  const filteredAndSortedProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" ? true : 
                           filterStatus === "active" ? !project.isArchived : 
                           project.isArchived;
      
      const matchesClient = selectedClientFilter === "all" ? true : 
                           project.clientId === selectedClientFilter;
      
      const matchesTeam = selectedTeamFilter === "all" ? true : 
                         project.teamId === selectedTeamFilter;
      
      return matchesSearch && matchesStatus && matchesClient && matchesTeam;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "client":
          return a.client.localeCompare(b.client);
        case "favorite":
          return b.isFavorite - a.isFavorite;
        case "recent":
          return b.createdAt - a.createdAt;
        case "priority":
          { const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority]; }
        default:
          return 0;
      }
    });

  // Project actions
  const deleteProject = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteDoc(doc(db, "users", userId, "projects", id));
      } catch (error) {
        console.error("Error deleting project:", error);
        alert("Failed to delete project");
      }
    }
  };

  const toggleFavorite = async (project, e) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "users", userId, "projects", project.id), {
        isFavorite: !project.isFavorite
      });
    } catch (error) {
      console.error("Error updating favorite status:", error);
    }
  };

  const toggleArchive = async (project, e) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "users", userId, "projects", project.id), {
        isArchived: !project.isArchived
      });
    } catch (error) {
      console.error("Error updating archive status:", error);
    }
  };

  const duplicateProject = async (project, e) => {
    e.stopPropagation();
    try {
      const duplicatedProject = {
        ...project,
        id: doc(collection(db, "users", userId, "projects")).id,
        name: `${project.name} (Copy)`,
        isFavorite: false,
        tasks: [],
        attachments: [],
        comments: [],
        createdAt: Timestamp.now()
      };
      
      await setDoc(doc(db, "users", userId, "projects", duplicatedProject.id), duplicatedProject);
    } catch (error) {
      console.error("Error duplicating project:", error);
      alert("Failed to duplicate project");
    }
  };

  const startEditProject = (project, e) => {
    e.stopPropagation();
    setEditingProject(project);
    setNewName(project.name);
    setNewClient(project.clientId || "");
    setNewColor(project.color);
    setHourlyRate(project.hourlyRate || "");
    setEstimatedHours(project.estimatedHours || "");
    setProjectDescription(project.description || "");
    setSelectedTeam(project.teamId || "");
    setProjectStatus(project.status || "planning");
    setProjectPriority(project.priority || "medium");
    setStartDate(project.startDate ? formatDateForInput(project.startDate) : "");
    setEndDate(project.endDate ? formatDateForInput(project.endDate) : "");
    setIsModalOpen(true);
  };
  
  const formatDateForInput = (timestamp) => {
  if (!timestamp) return "";
  
  let date;
  if (timestamp instanceof Timestamp) {
    // It's a Firestore Timestamp
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    // It's an object with seconds property
    date = new Date(timestamp.seconds * 1000);
  } else {
    // It's already a Date object or string
    date = new Date(timestamp);
  }
  
  return date.toISOString().split('T')[0];
};


  const openTeamAssignment = (project, e) => {
    e.stopPropagation();
    setCurrentProject(project);
    setSelectedTeam(project.teamId || "");
    setShowTeamAssignment(true);
  };

  const openTaskManager = (project, e) => {
    e.stopPropagation();
    setCurrentProject(project);
    setShowTaskManager(true);
  };

  const assignTeamToProject = async () => {
    if (!currentProject) return;

    try {
      await updateDoc(doc(db, "users", userId, "projects", currentProject.id), {
        teamId: selectedTeam || null
      });
      setShowTeamAssignment(false);
      setCurrentProject(null);
      setSelectedTeam("");
    } catch (error) {
      console.error("Error assigning team:", error);
      alert("Failed to assign team");
    }
  };

  const addTaskToProject = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim() || !currentProject) return;

    try {
      const task = {
        id: Date.now().toString(),
        ...newTask,
        createdAt: Timestamp.now(),
        createdBy: userId,
        assignedTo: newTask.assignedTo || null
      };

      const updatedTasks = [...(currentProject.tasks || []), task];
      
      await updateDoc(doc(db, "users", userId, "projects", currentProject.id), {
        tasks: updatedTasks
      });

      setNewTask({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: "",
        priority: "medium",
        status: "todo"
      });
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Failed to add task");
    }
  };

  const updateTaskStatus = async (projectId, taskId, newStatus) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedTasks = project.tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      );

      await updateDoc(doc(db, "users", userId, "projects", projectId), {
        tasks: updatedTasks
      });
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const deleteTask = async (projectId, taskId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedTasks = project.tasks.filter(task => task.id !== taskId);

      await updateDoc(doc(db, "users", userId, "projects", projectId), {
        tasks: updatedTasks
      });
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

const addOrUpdateProject = async (e) => {
  e.preventDefault();
  if (!newName.trim() || !userId) return;

  try {
    const selectedClientObj = clients.find((c) => c.id === newClient);
    const projectId = editingProject ? editingProject.id : doc(collection(db, "users", userId, "projects")).id;

    // Convert date strings back to Timestamp objects for Firestore
    const startDateTimestamp = startDate ? Timestamp.fromDate(new Date(startDate)) : null;
    const endDateTimestamp = endDate ? Timestamp.fromDate(new Date(endDate)) : null;

    const projectData = {
      name: newName,
      client: selectedClientObj ? selectedClientObj.name : "No Client",
      clientId: selectedClientObj ? selectedClientObj.id : null,
      color: newColor,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
      description: projectDescription,
      isFavorite: editingProject ? editingProject.isFavorite : false,
      isArchived: editingProject ? editingProject.isArchived : false,
      teamId: selectedTeam || null,
      status: projectStatus,
      priority: projectPriority,
      startDate: startDateTimestamp,
      endDate: endDateTimestamp,
      tasks: editingProject ? editingProject.tasks : [],
      assignedMembers: editingProject ? editingProject.assignedMembers : [],
      attachments: editingProject ? editingProject.attachments : [],
      comments: editingProject ? editingProject.comments : [],
      updatedAt: Timestamp.now(),
      createdAt: editingProject ? editingProject.createdAt : Timestamp.now()
    };

    await setDoc(doc(db, "users", userId, "projects", projectId), projectData);

    setIsModalOpen(false);
    setEditingProject(null);
    resetForm();
  } catch (error) {
    console.error("Error saving project:", error);
    alert("Failed to save project");
  }
};
  const resetForm = () => {
    setNewName("");
    setNewClient("");
    setNewColor("bg-blue-500");
    setHourlyRate("");
    setEstimatedHours("");
    setProjectDescription("");
    setSelectedTeam("");
    setProjectStatus("planning");
    setProjectPriority("medium");
    setStartDate("");
    setEndDate("");
  };

  const addClient = async (clientData) => {
    if (!userId) return;

    try {
      if (editingClient) {
        await updateDoc(doc(db, "users", userId, "clients", editingClient.id), {
          name: clientData.clientName,
          updatedAt: Timestamp.now()
        });
      } else {
        const clientId = doc(collection(db, "users", userId, "clients")).id;
        await setDoc(doc(db, "users", userId, "clients", clientId), {
          name: clientData.clientName,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      
      setShowClientForm(false);
      setEditingClient(null);
    } catch (error) {
      console.error("Error saving client:", error);
      alert("Failed to save client");
    }
  };

  const deleteClient = async (id) => {
    if (!userId) return;

    // Check if client has projects
    const clientProjects = projects.filter(p => p.clientId === id);
    if (clientProjects.length > 0) {
      alert("Cannot delete client with existing projects");
      return;
    }
    
    try {
      await deleteDoc(doc(db, "users", userId, "clients", id));
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Failed to delete client");
    }
  };

  const goToProjectDetail = (project) => {
    navigate(`/projects/${project.id}`, { state: { project } });
  };

  // Get team members for a project
  const getTeamMembers = (project) => {
    if (!project.teamId) return [];
    const team = teams.find(t => t.id === project.teamId);
    return team ? team.members : [];
  };

  // Calculate project statistics
  const projectStats = {
    total: projects.length,
    active: projects.filter(p => !p.isArchived).length,
    archived: projects.filter(p => p.isArchived).length,
    favorites: projects.filter(p => p.isFavorite).length,
    teamProjects: projects.filter(p => p.teamId).length,
    totalValue: projects.reduce((sum, p) => sum + (p.hourlyRate * p.estimatedHours || 0), 0)
  };

  // The rest of the component (JSX) remains mostly the same...
  // Only the data handling functions have been modified

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Projects</h1>
          <p className="text-gray-600">Manage your projects and collaborate with teams</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setEditingClient(null);
              setShowClientForm(true);
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
          >
            <FaUsers />
            Add Client
          </button>
          <button
            onClick={() => {
              setEditingProject(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
          >
            <FaPlus />
            New Project
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-blue-600">{projectStats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">{projectStats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-yellow-600">{projectStats.favorites}</div>
          <div className="text-sm text-gray-600">Favorites</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-purple-600">{projectStats.teamProjects}</div>
          <div className="text-sm text-gray-600">Team Projects</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
          <div className="text-2xl font-bold text-orange-600">{projectStats.archived}</div>
          <div className="text-sm text-gray-600">Archived</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-indigo-500">
          <div className="text-2xl font-bold text-indigo-600">${projectStats.totalValue.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Value</div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects, clients, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="team">Team Projects</option>
              <option value="individual">Individual Projects</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="client">Sort by Client</option>
              <option value="favorite">Sort by Favorite</option>
              <option value="recent">Sort by Recent</option>
              <option value="priority">Sort by Priority</option>
            </select>

            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>

            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Teams</option>
              <option value="none">No Team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            <button
              onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
            >
              {viewMode === "list" ? "Grid" : "List"}
            </button>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
            >
              <FaFilter />
              More Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">Advanced Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="w-full p-2 border rounded">
                  <option value="">All Statuses</option>
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select className="w-full p-2 border rounded">
                  <option value="">All Priorities</option>
                  {priorityOptions.map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hourly Rate Range</label>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" className="w-full p-2 border rounded" />
                  <input type="number" placeholder="Max" className="w-full p-2 border rounded" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time Range</label>
                <div className="flex gap-2">
                  <input type="date" placeholder="Start" className="w-full p-2 border rounded" />
                  <input type="date" placeholder="End" className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Projects Grid/List */}
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
        {filteredAndSortedProjects.map((project) => {
          const teamMembers = getTeamMembers(project);
          const tasks = project.tasks || [];
          const completedTasks = tasks.filter(t => t.status === 'completed').length;
          
          return (
            <div
              key={project.id}
              className={`bg-white rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all ${
                viewMode === "grid" ? "p-4" : "p-4"
              } ${project.isArchived ? "opacity-70" : ""}`}
              onClick={() => goToProjectDetail(project)}
            >
              <div className="flex-1">
                {/* Project Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${project.color}`}></span>
                    <h3 className="font-semibold text-gray-800">{project.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {project.isFavorite && (
                      <FaStar className="text-yellow-400" />
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${priorityOptions.find(p => p.value === project.priority)?.color} text-white`}>
                      {project.priority}
                    </span>
                  </div>
                </div>

                {/* Project Info */}
                <div className="mb-3">
                  <span className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded mb-2">
                    {project.client}
                  </span>
                  {project.teamId && (
                    <span className="inline-block bg-green-100 text-green-800 text-sm px-2 py-1 rounded ml-2">
                      Team Project
                    </span>
                  )}
                  {project.isArchived && (
                    <span className="inline-block bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded ml-2">
                      Archived
                    </span>
                  )}
                </div>

                {/* Project Description */}
                {project.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Team Members */}
                {teamMembers.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <FaUserFriends size={12} />
                      <span>Team Members ({teamMembers.length})</span>
                    </div>
                    <div className="flex -space-x-2">
                      {teamMembers.slice(0, 5).map(member => (
                        <div
                          key={member.userId}
                          className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                          title={member.name}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {teamMembers.length > 5 && (
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-semibold border-2 border-white">
                          +{teamMembers.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tasks Progress */}
                {tasks.length > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Tasks: {completedTasks}/{tasks.length}</span>
                      <span>{Math.round((completedTasks / tasks.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(completedTasks / tasks.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Project Details */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  {project.hourlyRate > 0 && (
                    <span>${project.hourlyRate}/h</span>
                  )}
                  {project.estimatedHours > 0 && (
                    <span>{project.estimatedHours}h</span>
                  )}
                  {project.hourlyRate > 0 && project.estimatedHours > 0 && (
                    <span className="font-semibold">
                      ${(project.hourlyRate * project.estimatedHours).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Dates */}
                {(project.startDate || project.endDate) && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <FaCalendarAlt size={10} />
                    {project.startDate && formatDateForInput(project.startDate)}
                    {project.endDate && ` - ${formatDateForInput(project.endDate)}`}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className={`flex gap-2 mt-3 ${viewMode === "grid" ? "justify-end" : ""}`}>
                {project.teamId && (
                  <button
                    onClick={(e) => openTaskManager(project, e)}
                    className="p-2 rounded hover:bg-gray-100 text-purple-400"
                    title="Manage Tasks"
                  >
                    <FaTasks />
                  </button>
                )}
                <button
                    onClick={(e) => openTeamAssignment(project, e)}
                    className="p-2 rounded hover:bg-gray-100 text-blue-400"
                    title="Assign Team"
                  >
                    <FaUserFriends />
                  </button>
                  <button
                    onClick={(e) => toggleFavorite(project, e)}
                    className={`p-2 rounded hover:bg-gray-100 ${
                      project.isFavorite ? "text-yellow-500" : "text-gray-400"
                    }`}
                    title="Favorite"
                  >
                    <FaStar />
                  </button>
                  <button
                    onClick={(e) => toggleArchive(project, e)}
                    className="p-2 rounded hover:bg-gray-100 text-gray-400"
                    title={project.isArchived ? "Unarchive" : "Archive"}
                  >
                    {project.isArchived ? <FaEye /> : <FaEyeSlash />}
                  </button>
                  <button
                    onClick={(e) => duplicateProject(project, e)}
                    className="p-2 rounded hover:bg-gray-100 text-gray-400"
                    title="Duplicate"
                  >
                    <FaCopy />
                  </button>
                  <button
                    onClick={(e) => startEditProject(project, e)}
                    className="p-2 rounded hover:bg-gray-100 text-blue-400"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={(e) => deleteProject(project.id, e)}
                    className="p-2 rounded hover:bg-gray-100 text-red-400"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAndSortedProjects.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <FaChartBar className="text-4xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No projects found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Project Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingProject ? "Edit Project" : "Create New Project"}
                </h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProject(null);
                    resetForm();
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={addOrUpdateProject} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Project Name *</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter project name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Client</label>
                    <div className="flex gap-2">
                      <select
                        value={newClient}
                        onChange={(e) => setNewClient(e.target.value)}
                        className="flex-1 border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select Client --</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClient(clients.find(c => c.id === newClient) || null);
                          setShowClientForm(true);
                        }}
                        disabled={!newClient}
                        className="px-4 py-3 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Team Assignment</label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- No Team --</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.members.length} members)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value)}
                      className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Priority</label>
                    <select
                      value={projectPriority}
                      onChange={(e) => setProjectPriority(e.target.value)}
                      className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {priorityOptions.map(priority => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Hourly Rate ($)</label>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                    <input
                      type="number"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows="3"
                    className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Project description and notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Color Theme</label>
                  <div className="flex gap-3 flex-wrap">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          newColor === c ? "ring-2 ring-offset-2 ring-blue-500 scale-110" : "hover:scale-110"
                        } ${c}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProject(null);
                      resetForm();
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    {editingProject ? "Update Project" : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Team Assignment Modal */}
        {showTeamAssignment && currentProject && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Assign Team to Project</h2>
                <button 
                  onClick={() => {
                    setShowTeamAssignment(false);
                    setCurrentProject(null);
                    setSelectedTeam("");
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 mb-2">Assign a team to: <strong>{currentProject.name}</strong></p>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Team --</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.members.length} members)
                    </option>
                  ))}
                </select>
              </div>

              {selectedTeam && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Team Members</h3>
                  <div className="space-y-2">
                    {teams.find(t => t.id === selectedTeam)?.members.map(member => (
                      <div key={member.userId} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-gray-600">{member.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTeamAssignment(false);
                    setCurrentProject(null);
                    setSelectedTeam("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={assignTeamToProject}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Assign Team
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Manager Modal */}
        {showTaskManager && currentProject && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Task Manager - {currentProject.name}</h2>
                <button 
                  onClick={() => {
                    setShowTaskManager(false);
                    setCurrentProject(null);
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Add New Task Form */}
              <form onSubmit={addTaskToProject} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-3">Add New Task</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Task Title *</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      required
                      className="w-full border px-3 py-2 rounded"
                      placeholder="Enter task title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Assign To</label>
                    <select
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                      className="w-full border px-3 py-2 rounded"
                    >
                      <option value="">Unassigned</option>
                      {getTeamMembers(currentProject).map(member => (
                        <option key={member.userId} value={member.userId}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                      className="w-full border px-3 py-2 rounded"
                    >
                      {priorityOptions.map(priority => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                      className="w-full border px-3 py-2 rounded"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    rows="2"
                    className="w-full border px-3 py-2 rounded"
                    placeholder="Task description"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Task
                </button>
              </form>

              {/* Tasks List */}
              <div>
                <h3 className="font-semibold mb-3">Project Tasks ({currentProject.tasks?.length || 0})</h3>
                <div className="space-y-2">
                  {currentProject.tasks?.map(task => {
                    const assignedMember = getTeamMembers(currentProject).find(m => m.userId === task.assignedTo);
                    return (
                      <div key={task.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(currentProject.id, task.id, e.target.value)}
                              className="text-sm border rounded px-2 py-1"
                            >
                              <option value="todo">To Do</option>
                              <option value="in-progress">In Progress</option>
                              <option value="review">Review</option>
                              <option value="completed">Completed</option>
                            </select>
                            <span className={`px-2 py-1 rounded text-xs ${priorityOptions.find(p => p.value === task.priority)?.color} text-white`}>
                              {task.priority}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteTask(currentProject.id, task.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                        <h4 className="font-medium mb-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <div>
                            {assignedMember && (
                              <span>Assigned to: {assignedMember.name}</span>
                            )}
                            {task.dueDate && (
                              <span className="ml-3">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            )}
                          </div>
                          <span>Created: {task.createdAt?.toDate ? task.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                  {(!currentProject.tasks || currentProject.tasks.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No tasks yet. Add a task to get started!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Form Modal */}
        {showClientForm && (
          <ClientForm
            client={editingClient}
            onSave={addClient}
            onCancel={() => {
              setShowClientForm(false);
              setEditingClient(null);
            }}
            onDelete={() => {
              if (editingClient) {
                deleteClient(editingClient.id);
                setShowClientForm(false);
                setEditingClient(null);
              }
            }}
          />
        )}
      </div>
    );
  }