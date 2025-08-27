// src/pages/Reports.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, startOfWeek, startOfMonth, isSameDay } from "date-fns";
import {
  FaUsers,
  FaComment,
  FaCheck,
  FaTimes,
  FaUser,
  FaEye,
  FaShare,
  FaLock,
  FaUnlock,
  FaPaperPlane,
  FaReply,
} from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// Comment Component (unchanged)
const Comment = ({ comment, currentUser, onReply, onDelete }) => {
  // ... (unchanged code)
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleSubmitReply = (e) => {
    e.preventDefault();
    if (replyText.trim()) {
      onReply(comment.id, replyText);
      setReplyText("");
      setShowReply(false);
    }
  };

  return (
    <div className="border-l-2 border-blue-200 pl-3 mb-3">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
          {comment.userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.userName}</span>
            <span className="text-xs text-gray-500">
              {format(new Date(comment.timestamp), "MMM dd, yyyy HH:mm")}
            </span>
            {comment.userId === currentUser.uid && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-red-500 text-xs hover:text-red-700"
              >
                Delete
              </button>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-1">{comment.text}</p>
          <button
            onClick={() => setShowReply(!showReply)}
            className="text-xs text-blue-500 hover:text-blue-700 mt-1 flex items-center gap-1"
          >
            <FaReply size={10} /> Reply
          </button>

          {showReply && (
            <form onSubmit={handleSubmitReply} className="mt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full border p-2 rounded text-sm"
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex items-center gap-1"
                >
                  <FaPaperPlane size={10} /> Post
                </button>
                <button
                  type="button"
                  onClick={() => setShowReply(false)}
                  className="px-3 py-1 text-gray-500 text-xs rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies &&
        comment.replies.map((reply) => (
          <Comment
            key={reply.id}
            comment={reply}
            currentUser={currentUser}
            onReply={onReply}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
};

// TimeEntryModal Component (unchanged)
const TimeEntryModal = ({
  isOpen,
  onClose,
  entry,
  projects,
  clients,
  teamMembers,
  onSave,
  onDelete,
}) => {
  // ... (unchanged code)
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    project: "",
    client: "",
    hours: 0,
    minutes: 0,
    billable: true,
    assignedTo: currentUser.uid,
    status: "pending",
  });

  useEffect(() => {
    if (entry) {
      // Editing existing entry
      const totalMinutes = Math.floor(entry.duration / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      setFormData({
        date: format(entry.date, "yyyy-MM-dd"),
        description: entry.description,
        project: entry.project,
        client: entry.client,
        hours,
        minutes,
        billable: entry.billable,
        assignedTo: entry.assignedTo || currentUser.uid,
        status: entry.status || "pending",
      });
    } else {
      // New entry
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        project: projects.length > 0 ? projects[0].name : "",
        client: clients.length > 0 ? clients[0].name : "",
        hours: 0,
        minutes: 0,
        billable: true,
        assignedTo: currentUser.uid,
        status: "pending",
      });
    }
  }, [entry, projects, clients, currentUser]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const duration =
      parseInt(formData.hours) * 3600 + parseInt(formData.minutes) * 60;

    onSave({
      id: entry ? entry.id : Date.now().toString(),
      date: new Date(formData.date),
      description: formData.description,
      project: formData.project,
      client: formData.client,
      duration,
      billable: formData.billable,
      assignedTo: formData.assignedTo,
      status: formData.status,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email,
    });

    onClose();
  };

  const handleClientChange = (e) => {
    const clientName = e.target.value;
    setFormData((prev) => ({ ...prev, client: clientName }));

    // If a project is already selected and it doesn't match the client, reset project
    if (formData.project) {
      const project = projects.find((p) => p.name === formData.project);
      const client = clients.find((c) => c.name === clientName);
      if (project && project.clientId !== client?.id) {
        setFormData((prev) => ({ ...prev, project: "" }));
      }
    }
  };

  const clientProjects = formData.client
    ? projects.filter((p) => {
        const client = clients.find((c) => c.name === formData.client);
        return client ? p.clientId === client.id : true;
      })
    : projects;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {entry ? "Edit Time Entry" : "Add Manual Time Entry"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border p-2 rounded"
              placeholder="What did you work on?"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Client</label>
            <select
              value={formData.client}
              onChange={handleClientChange}
              className="w-full border p-2 rounded"
              required
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.name}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Project</label>
            <select
              value={formData.project}
              onChange={(e) =>
                setFormData({ ...formData, project: e.target.value })
              }
              className="w-full border p-2 rounded"
              required
            >
              <option value="">Select a project</option>
              {clientProjects.map((project) => (
                <option key={project.id} value={project.name}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hours</label>
              <input
                type="number"
                min="0"
                value={formData.hours}
                onChange={(e) =>
                  setFormData({ ...formData, hours: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.minutes}
                onChange={(e) =>
                  setFormData({ ...formData, minutes: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />
            </div>
          </div>

          {teamMembers && teamMembers.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Assign To
              </label>
              <select
                value={formData.assignedTo}
                onChange={(e) =>
                  setFormData({ ...formData, assignedTo: e.target.value })
                }
                className="w-full border p-2 rounded"
              >
                {teamMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}{" "}
                    {member.userId === currentUser.uid ? "(Me)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="billable"
              checked={formData.billable}
              onChange={(e) =>
                setFormData({ ...formData, billable: e.target.checked })
              }
              className="mr-2"
            />
            <label htmlFor="billable" className="text-sm">
              Billable
            </label>
          </div>

          {entry && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full border p-2 rounded"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}

          <div className="flex justify-between">
            {entry && (
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            )}
            <div className="flex space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {entry ? "Update" : "Add"} Entry
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// CommentModal Component (unchanged)
const CommentModal = ({
  isOpen,
  onClose,
  entry,
  comments,
  currentUser,
  onAddComment,
  onDeleteComment,
}) => {
  // ... (unchanged code)
  const [commentText, setCommentText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(entry.id, commentText);
      setCommentText("");
    }
  };

  const handleReply = (parentId, text) => {
    onAddComment(entry.id, text, parentId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Comments</h2>
        <p className="text-sm text-gray-600 mb-4">{entry.description}</p>

        {/* Comments List */}
        <div className="mb-4 max-h-96 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No comments yet</p>
          ) : (
            comments
              .filter((comment) => !comment.parentId)
              .map((comment) => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  currentUser={currentUser}
                  onReply={handleReply}
                  onDelete={onDeleteComment}
                />
              ))
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="border-t pt-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="w-full border p-2 rounded text-sm resize-none"
            rows="3"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-gray-500 rounded hover:bg-gray-100"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
            >
              <FaPaperPlane size={12} /> Post Comment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ShareReportModal Component (unchanged)
const ShareReportModal = ({ isOpen, onClose, teams, onShareReport }) => {
  // ... (unchanged code)
  const [selectedTeam, setSelectedTeam] = useState("");
  const [sharePermissions, setSharePermissions] = useState("view");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedTeam) {
      onShareReport(selectedTeam, sharePermissions);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Share Report with Team</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Select Team
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full border p-2 rounded"
              required
            >
              <option value="">Choose a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.members.length} members)
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Permissions
            </label>
            <select
              value={sharePermissions}
              onChange={(e) => setSharePermissions(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="view">View Only</option>
              <option value="comment">View & Comment</option>
              <option value="edit">Full Access</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {sharePermissions === "view" &&
                "Team members can only view the report"}
              {sharePermissions === "comment" &&
                "Team members can view and add comments"}
              {sharePermissions === "edit" &&
                "Team members can edit time entries and add comments"}
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Share Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// Main Reports Component with Firebase integration
export default function Reports() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [activeChart, setActiveChart] = useState("bar");
  const [filters, setFilters] = useState({
    dateRange: "thisWeek",
    project: "all",
    client: "all",
    user: "all",
    status: "all",
  });
  const [comments, setComments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [setSharedReports] = useState([]);
  const [activeViewers, setActiveViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { currentUser } = useAuth();

  // Load data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch time entries
        const timeEntriesQuery = query(
          collection(db, "timeEntries"),
          orderBy("date", "desc")
        );
        const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
        const entriesData = timeEntriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
        }));
        setTimeEntries(entriesData);
        setFilteredEntries(entriesData);

        // Fetch projects
        const projectsQuery = query(collection(db, "projects"));
        const projectsSnapshot = await getDocs(projectsQuery);
        const projectsData = projectsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProjects(projectsData);

        // Fetch clients
        const clientsQuery = query(collection(db, "clients"));
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientsData = clientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);

        // Fetch teams
        const teamsQuery = query(collection(db, "teams"));
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTeams(teamsData);

        // Fetch active team if user has one
        if (currentUser) {
          const userTeams = teamsData.filter((team) =>
            team.members.some((member) => member.userId === currentUser.uid)
          );

          if (userTeams.length > 0) {
            const activeTeamData = userTeams[0]; // Or use some logic to determine active team
            setActiveTeam(activeTeamData);
            setTeamMembers(activeTeamData.members || []);
          }
        }

        // Fetch comments
        const commentsQuery = query(
          collection(db, "comments"),
          orderBy("timestamp", "desc")
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        const commentsData = commentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate(),
        }));
        setComments(commentsData);

        // Fetch shared reports
        const sharedReportsQuery = query(collection(db, "sharedReports"));
        const sharedReportsSnapshot = await getDocs(sharedReportsQuery);
        const sharedReportsData = sharedReportsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSharedReports(sharedReportsData);

        // Set up real-time listeners
        const unsubscribeTimeEntries = onSnapshot(
          timeEntriesQuery,
          (snapshot) => {
            const updatedEntries = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              date: doc.data().date.toDate(),
            }));
            setTimeEntries(updatedEntries);
          }
        );

        const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
          const updatedComments = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate(),
          }));
          setComments(updatedComments);
        });

        // Cleanup listeners on unmount
        return () => {
          unsubscribeTimeEntries();
          unsubscribeComments();
        };
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Simulate active viewers (in a real app, this would come from a WebSocket or real-time DB)
    const viewers = [
      { id: "1", name: "You", isCurrentUser: true },
      ...(activeTeam
        ? activeTeam.members
            .filter((member) => member.userId !== currentUser.uid)
            .slice(0, 2)
            .map((member) => ({
              id: member.userId,
              name: member.name,
              isCurrentUser: false,
            }))
        : []),
    ];
    setActiveViewers(viewers);
  }, [location.key, currentUser, activeTeam, setSharedReports]);

  // Apply filters (unchanged)
  useEffect(() => {
    let results = [...timeEntries];
    const userTeams = teams.filter((team) =>
      team.members.some((member) => member.userId === currentUser.uid)
    );

    const userTeamIds = userTeams.map((team) => team.id);
    const userCanViewAll = userTeams.some(
      (team) =>
        team.members.find((member) => member.userId === currentUser.uid)
          ?.role === "owner" ||
        team.members.find((member) => member.userId === currentUser.uid)
          ?.role === "admin"
    );

    if (!userCanViewAll) {
      results = results.filter(
        (entry) =>
          entry.userId === currentUser.uid ||
          entry.sharedWith.some((teamId) => userTeamIds.includes(teamId))
      );
    }

    // Date range filter
    const now = new Date();
    if (filters.dateRange === "today") {
      results = results.filter((entry) => isSameDay(entry.date, now));
    } else if (filters.dateRange === "thisWeek") {
      const startOfWeekDate = startOfWeek(now);
      results = results.filter((entry) => entry.date >= startOfWeekDate);
    } else if (filters.dateRange === "thisMonth") {
      const startOfMonthDate = startOfMonth(now);
      results = results.filter((entry) => entry.date >= startOfMonthDate);
    }

    // Project filter
    if (filters.project !== "all") {
      results = results.filter((entry) => entry.project === filters.project);
    }

    // Client filter
    if (filters.client !== "all") {
      results = results.filter((entry) => entry.client === filters.client);
    }

    // User filter
    if (filters.user !== "all") {
      results = results.filter((entry) => entry.assignedTo === filters.user);
    }

    // Status filter
    if (filters.status !== "all") {
      results = results.filter((entry) => entry.status === filters.status);
    }

    setFilteredEntries(results);
  }, [filters, timeEntries, teams, currentUser]);

  // Calculate data for charts (unchanged)
  const chartData = useMemo(() => {
    // ... (unchanged chart logic)
    if (activeChart === "bar") {
      // Group by date for bar chart
      const groupedByDate = filteredEntries.reduce((acc, entry) => {
        const dateStr = format(entry.date, "yyyy-MM-dd");
        if (!acc[dateStr]) {
          acc[dateStr] = {
            date: format(entry.date, "MMM dd"),
            total: 0,
            billable: 0,
            nonBillable: 0,
          };
        }
        acc[dateStr].total += entry.duration / 3600;
        if (entry.billable) {
          acc[dateStr].billable += entry.duration / 3600;
        } else {
          acc[dateStr].nonBillable += entry.duration / 3600;
        }
        return acc;
      }, {});

      return Object.values(groupedByDate);
    } else if (activeChart === "pie") {
      // Group by project for pie chart
      const groupedByProject = filteredEntries.reduce((acc, entry) => {
        if (!acc[entry.project]) {
          acc[entry.project] = { name: entry.project, value: 0 };
        }
        acc[entry.project].value += entry.duration / 3600;
        return acc;
      }, {});

      return Object.values(groupedByProject);
    } else {
      // Group by user for team chart
      const groupedByUser = filteredEntries.reduce((acc, entry) => {
        const userName = entry.userName || "Unknown";
        if (!acc[userName]) {
          acc[userName] = { name: userName, value: 0 };
        }
        acc[userName].value += entry.duration / 3600;
        return acc;
      }, {});

      return Object.values(groupedByUser);
    }
  }, [filteredEntries, activeChart]);

  // Calculate totals (unchanged)
  const totalHours =
    filteredEntries.reduce((sum, entry) => sum + entry.duration, 0) / 3600;
  const billableHours =
    filteredEntries
      .filter((entry) => entry.billable)
      .reduce((sum, entry) => sum + entry.duration, 0) / 3600;

  const approvedHours =
    filteredEntries
      .filter((entry) => entry.status === "approved")
      .reduce((sum, entry) => sum + entry.duration, 0) / 3600;

  const pendingHours =
    filteredEntries
      .filter((entry) => entry.status === "pending")
      .reduce((sum, entry) => sum + entry.duration, 0) / 3600;

  const uniqueProjects = [
    ...new Set(timeEntries.map((entry) => entry.project)),
  ];
  const uniqueClients = [...new Set(timeEntries.map((entry) => entry.client))];
  const uniqueUsers = [
    ...new Set(timeEntries.map((entry) => entry.assignedTo)),
  ];

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleSaveEntry = async (entryData) => {
    try {
      if (timeEntries.some((entry) => entry.id === entryData.id)) {
        // Update existing entry
        const entryRef = doc(db, "timeEntries", entryData.id);
        await updateDoc(entryRef, {
          date: entryData.date,
          description: entryData.description,
          project: entryData.project,
          client: entryData.client,
          duration: entryData.duration,
          billable: entryData.billable,
          assignedTo: entryData.assignedTo,
          status: entryData.status,
          userId: entryData.userId,
          userName: entryData.userName,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add new entry
        await addDoc(collection(db, "timeEntries"), {
          date: entryData.date,
          description: entryData.description,
          project: entryData.project,
          client: entryData.client,
          duration: entryData.duration,
          billable: entryData.billable,
          assignedTo: entryData.assignedTo,
          status: entryData.status,
          userId: entryData.userId,
          userName: entryData.userName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error saving time entry:", error);
    }
  };

  const handleDeleteEntry = async (id) => {
    try {
      await deleteDoc(doc(db, "timeEntries", id));
      setCurrentEntry(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error deleting time entry:", error);
    }
  };

  const handleEditEntry = (entry) => {
    setCurrentEntry(entry);
    setIsModalOpen(true);
  };

  const handleOpenComments = (entry) => {
    setCurrentEntry(entry);
    setIsCommentModalOpen(true);
  };

  const handleAddComment = async (entryId, text, parentId = null) => {
    try {
      await addDoc(collection(db, "comments"), {
        entryId,
        parentId,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        text,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteDoc(doc(db, "comments", commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleShareReport = async (teamId, permissions) => {
    try {
      await addDoc(collection(db, "sharedReports"), {
        teamId,
        permissions,
        sharedBy: currentUser.uid,
        sharedAt: serverTimestamp(),
      });

      // Update entries to include sharedWith
      const batchUpdates = timeEntries.map(async (entry) => {
        const entryRef = doc(db, "timeEntries", entry.id);
        await updateDoc(entryRef, {
          sharedWith: [...new Set([...(entry.sharedWith || []), teamId])],
        });
      });

      await Promise.all(batchUpdates);
    } catch (error) {
      console.error("Error sharing report:", error);
    }
  };

  const handleApproveEntry = async (entryId) => {
    try {
      const entryRef = doc(db, "timeEntries", entryId);
      await updateDoc(entryRef, {
        status: "approved",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error approving entry:", error);
    }
  };

  const handleRejectEntry = async (entryId) => {
    try {
      const entryRef = doc(db, "timeEntries", entryId);
      await updateDoc(entryRef, {
        status: "rejected",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error rejecting entry:", error);
    }
  };

  const getStatusBadge = (status) => {
    // ... (unchanged code)
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    const statusIcons = {
      pending: <FaEye className="inline mr-1" />,
      approved: <FaCheck className="inline mr-1" />,
      rejected: <FaTimes className="inline mr-1" />,
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}
      >
        {statusIcons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  // Get comments for current entry
  const entryComments = currentEntry
    ? comments.filter(
        (comment) => comment.entryId === currentEntry.id && !comment.parentId
      )
    : [];

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Time Reports</h1>
          {activeTeam && (
            <p className="text-sm text-gray-600">
              Team: {activeTeam.name} • {activeViewers.length} active viewers
              {activeViewers.length > 0 && (
                <span className="ml-2">
                  {activeViewers.map((viewer) => (
                    <span
                      key={viewer.id}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        viewer.isCurrentUser
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      } mr-1`}
                    >
                      <FaEye size={10} className="mr-1" /> {viewer.name}
                    </span>
                  ))}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {teams.length > 0 && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center"
            >
              <FaShare className="mr-2" /> Share with Team
            </button>
          )}
          <button
            onClick={() => {
              setCurrentEntry(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add Manual Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                setFilters({ ...filters, dateRange: e.target.value })
              }
              className="w-full border p-2 rounded"
            >
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Project</label>
            <select
              value={filters.project}
              onChange={(e) =>
                setFilters({ ...filters, project: e.target.value })
              }
              className="w-full border p-2 rounded"
            >
              <option value="all">All Projects</option>
              {uniqueProjects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Client</label>
            <select
              value={filters.client}
              onChange={(e) =>
                setFilters({ ...filters, client: e.target.value })
              }
              className="w-full border p-2 rounded"
            >
              <option value="all">All Clients</option>
              {uniqueClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">User</label>
            <select
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              className="w-full border p-2 rounded"
            >
              <option value="all">All Users</option>
              {uniqueUsers
                .map((userId) => {
                  const user = timeEntries.find(
                    (entry) => entry.assignedTo === userId
                  );
                  return user ? (
                    <option key={userId} value={userId}>
                      {user.userName} {userId === currentUser.uid ? "(Me)" : ""}
                    </option>
                  ) : null;
                })
                .filter(Boolean)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full border p-2 rounded"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm">Total Time</div>
          <div className="text-2xl font-bold">
            {totalHours.toFixed(2)} hours
          </div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm">Billable Time</div>
          <div className="text-2xl font-bold">
            {billableHours.toFixed(2)} hours
          </div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm">Approved Time</div>
          <div className="text-2xl font-bold">
            {approvedHours.toFixed(2)} hours
          </div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm">Pending Review</div>
          <div className="text-2xl font-bold">
            {pendingHours.toFixed(2)} hours
          </div>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Time Visualization</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveChart("bar")}
              className={`px-3 py-1 rounded ${
                activeChart === "bar" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              By Date
            </button>
            <button
              onClick={() => setActiveChart("pie")}
              className={`px-3 py-1 rounded ${
                activeChart === "pie" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              By Project
            </button>
            {teamMembers.length > 0 && (
              <button
                onClick={() => setActiveChart("team")}
                className={`px-3 py-1 rounded ${
                  activeChart === "team"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200"
                }`}
              >
                By Team Member
              </button>
            )}
          </div>
        </div>

        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {activeChart === "bar" ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    label={{
                      value: "Hours",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${value.toFixed(2)} hours`,
                      "Total Time",
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="billable"
                    name="Billable Hours"
                    fill="#10B981"
                    stackId="a"
                  />
                  <Bar
                    dataKey="nonBillable"
                    name="Non-Billable Hours"
                    fill="#EF4444"
                    stackId="a"
                  />
                </BarChart>
              ) : activeChart === "pie" ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value.toFixed(2)} hours`, "Time"]}
                  />
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis
                    label={{
                      value: "Hours",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${value.toFixed(2)} hours`,
                      "Total Time",
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="value" name="Hours" fill="#3B82F6" />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No data available for the selected filters
            </div>
          )}
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-white rounded shadow overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Billable
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEntries.map((entry) => {
              const userCanEdit =
                entry.userId === currentUser.uid ||
                teams.some(
                  (team) =>
                    team.members.find(
                      (member) => member.userId === currentUser.uid
                    )?.role === "owner" ||
                    team.members.find(
                      (member) => member.userId === currentUser.uid
                    )?.role === "admin"
                );

              const userCanApprove = teams.some(
                (team) =>
                  (team.members.find(
                    (member) => member.userId === currentUser.uid
                  )?.role === "owner" ||
                    team.members.find(
                      (member) => member.userId === currentUser.uid
                    )?.role === "admin") &&
                  team.members.some((member) => member.userId === entry.userId)
              );

              return (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(entry.date, "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {entry.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.project}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
                        {entry.userName.charAt(0).toUpperCase()}
                      </div>
                      {entry.userName}{" "}
                      {entry.userId === currentUser.uid ? "(Me)" : ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(entry.duration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.billable
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {entry.billable ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getStatusBadge(entry.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenComments(entry)}
                        className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
                        title="Comments"
                      >
                        <FaComment size={14} />
                        {comments.filter((c) => c.entryId === entry.id).length >
                          0 && (
                          <span className="text-xs">
                            (
                            {
                              comments.filter((c) => c.entryId === entry.id)
                                .length
                            }
                            )
                          </span>
                        )}
                      </button>

                      {userCanEdit && (
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="text-green-500 hover:text-green-700"
                          title="Edit"
                        >
                          Edit
                        </button>
                      )}

                      {userCanApprove && entry.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApproveEntry(entry.id)}
                            className="text-green-500 hover:text-green-700 flex items-center gap-1"
                            title="Approve"
                          >
                            <FaCheck size={14} />
                          </button>
                          <button
                            onClick={() => handleRejectEntry(entry.id)}
                            className="text-red-500 hover:text-red-700 flex items-center gap-1"
                            title="Reject"
                          >
                            <FaTimes size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredEntries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No time entries found for the selected filters
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="flex space-x-4">
        <button
          onClick={() => {
            const csvContent = [
              [
                "Date",
                "Description",
                "Project",
                "Client",
                "User",
                "Duration",
                "Billable",
                "Status",
              ],
              ...filteredEntries.map((entry) => [
                format(entry.date, "yyyy-MM-dd"),
                entry.description,
                entry.project,
                entry.client,
                entry.userName,
                formatDuration(entry.duration),
                entry.billable ? "Yes" : "No",
                entry.status,
              ]),
            ]
              .map((e) => e.join(","))
              .join("\n");

            const blob = new Blob([csvContent], {
              type: "text/csv;charset=utf-8;",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "time-report.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Export as CSV
        </button>

        <button
          onClick={() => {
            // Print-friendly version
            window.print();
          }}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"
              clipRule="evenodd"
            />
          </svg>
          Print Report
        </button>
      </div>

      {/* Modals */}
      <TimeEntryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentEntry(null);
        }}
        entry={currentEntry}
        projects={projects}
        clients={clients}
        teamMembers={teamMembers}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
      />

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => {
          setIsCommentModalOpen(false);
          setCurrentEntry(null);
        }}
        entry={currentEntry}
        comments={entryComments}
        currentUser={currentUser}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
      />

      <ShareReportModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        teams={teams}
        onShareReport={handleShareReport}
        currentUser={currentUser}
      />
    </div>
  );
}
