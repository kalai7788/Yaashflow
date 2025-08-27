// src/pages/Team.jsx
import React, { useState, useEffect } from "react";
import {
  FaUsers,
  FaPlus,
  FaTrash,
  FaUserPlus,
  FaTimes,
  FaCrown,
  FaUserShield,
  FaUser,
  FaProjectDiagram,
  FaEnvelope,
  FaCopy,
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
  where,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Team() {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareProjectsModal, setShowShareProjectsModal] = useState(false);
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [notifications, setNotifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [teamInvitations, setTeamInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate unique IDs for notifications
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Load data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!currentUser || !currentUser.uid) {
          setLoading(false);
          return;
        }

        // Fetch teams where current user is a member
        const teamsQuery = query(
          collection(db, "teams"),
          where("members", "array-contains", currentUser.uid)
        );

        const unsubscribeTeams = onSnapshot(
          teamsQuery,
          (snapshot) => {
            const teamsData = snapshot.docs
              .filter((doc) => doc.exists())
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                members: doc.data().members || [],
              }));

            setTeams(teamsData);

            if (
              teamsData.length > 0 &&
              (!activeTeam || !teamsData.find((t) => t.id === activeTeam.id))
            ) {
              setActiveTeam(teamsData[0]);
            } else if (teamsData.length === 0) {
              setActiveTeam(null);
            }
          },
          (error) => {
            console.error("Error fetching teams:", error);
            setNotifications((prev) => [
              ...prev,
              {
                id: generateUniqueId(),
                type: "error",
                message: "Failed to load teams",
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        );

        // Fetch projects
        const projectsQuery = query(
          collection(db, "projects"),
          where("userId", "==", currentUser.uid)
        );
        const projectsSnapshot = await getDocs(projectsQuery);
        const projectsData = projectsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProjects(projectsData);

        // Fetch team invitations for current user
        if (currentUser.email) {
          const invitationsQuery = query(
            collection(db, "teamInvitations"),
            where("email", "==", currentUser.email),
            where("status", "==", "pending")
          );
          const invitationsSnapshot = await getDocs(invitationsQuery);
          const invitationsData = invitationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTeamInvitations(invitationsData);
        }

        return () => {
          unsubscribeTeams();
        };
      } catch (error) {
        console.error("Error fetching data:", error);
        setNotifications((prev) => [
          ...prev,
          {
            id: generateUniqueId(),
            type: "error",
            message: "Failed to load team data",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTeam, currentUser]);

  // Create a new team
  const createTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || !currentUser) return;

    try {
      const teamData = {
        name: newTeamName.trim(),
        members: [currentUser.uid],
        ownerId: currentUser.uid,
        createdAt: serverTimestamp(),
        inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        projects: [],
      };

      // eslint-disable-next-line no-unused-vars
      const teamRef = await addDoc(collection(db, "teams"), teamData);

      setShowCreateModal(false);
      setNewTeamName("");

      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "success",
          message: "Team created successfully!",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error creating team:", error);
      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "error",
          message: "Failed to create team",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Invite member to team via email - FIXED VERSION
  const inviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeTeam) return;

    try {
      // Get user's display name or use email as fallback
      const invitedByName =
        currentUser.displayName || currentUser.email || "Team Owner";

      const invitationData = {
        teamId: activeTeam.id,
        teamName: activeTeam.name,
        email: inviteEmail.trim().toLowerCase(),
        name: inviteName.trim() || inviteEmail.split("@")[0],
        role: inviteRole,
        invitedBy: currentUser.uid,
        invitedByName: invitedByName,
        status: "pending",
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        inviteLink: `${window.location.origin}/join-team?code=${
          activeTeam.inviteCode
        }&email=${encodeURIComponent(inviteEmail.trim().toLowerCase())}`,
      };

      // Remove any undefined values from the invitation data
      const cleanInvitationData = {};
      Object.entries(invitationData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          cleanInvitationData[key] = value;
        }
      });

      await addDoc(collection(db, "teamInvitations"), cleanInvitationData);

      setShowInviteModal(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("member");

      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "success",
          message: `Invitation sent to ${inviteEmail}`,
          timestamp: new Date().toISOString(),
        },
      ]);

      console.log("Invitation created for:", inviteEmail);
      console.log("Invitation link:", invitationData.inviteLink);
    } catch (error) {
      console.error("Error sending invitation:", error);
      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "error",
          message: "Failed to send invitation: " + error.message,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Handle invitation response
  const handleInvitationResponse = async (invitationId, accept) => {
    try {
      const invitationRef = doc(db, "teamInvitations", invitationId);
      await updateDoc(invitationRef, {
        status: accept ? "accepted" : "declined",
        respondedAt: serverTimestamp(),
      });

      if (accept) {
        // Add user to team
        const invitation = teamInvitations.find(
          (inv) => inv.id === invitationId
        );
        if (invitation) {
          const teamRef = doc(db, "teams", invitation.teamId);
          await updateDoc(teamRef, {
            members: arrayUnion(currentUser.uid),
          });
        }
      }

      setTeamInvitations((prev) =>
        prev.filter((inv) => inv.id !== invitationId)
      );

      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "success",
          message: accept ? "You've joined the team!" : "Invitation declined",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error handling invitation:", error);
      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "error",
          message: "Failed to process invitation",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Remove team member
  const removeMember = async (memberId) => {
    if (!activeTeam || activeTeam.ownerId !== currentUser.uid) return;
    if (memberId === currentUser.uid) {
      alert("You cannot remove yourself as the owner");
      return;
    }

    try {
      const teamRef = doc(db, "teams", activeTeam.id);
      await updateDoc(teamRef, {
        members: arrayRemove(memberId),
      });

      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "success",
          message: "Member removed from team",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error removing member:", error);
      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "error",
          message: "Failed to remove member",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Delete team
  const deleteTeam = async (teamId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this team? This action cannot be undone."
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "teams", teamId));
      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "success",
          message: "Team deleted successfully",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error deleting team:", error);
      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "error",
          message: "Failed to delete team",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Share projects with team
  const shareProjectsWithTeam = async () => {
    if (!selectedProjects.length || !activeTeam) return;

    try {
      const teamRef = doc(db, "teams", activeTeam.id);
      await updateDoc(teamRef, {
        projects: arrayUnion(...selectedProjects),
      });

      setShowShareProjectsModal(false);
      setSelectedProjects([]);

      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "success",
          message: `${selectedProjects.length} project(s) shared with team`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error sharing projects:", error);
      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "error",
          message: "Failed to share projects",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Remove project from team
  const removeProjectFromTeam = async (projectId) => {
    if (!activeTeam) return;

    try {
      const teamRef = doc(db, "teams", activeTeam.id);
      await updateDoc(teamRef, {
        projects: arrayRemove(projectId),
      });

      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "success",
          message: "Project removed from team",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error removing project:", error);
      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "error",
          message: "Failed to remove project",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Copy invite link to clipboard
  const copyInviteLink = async () => {
    if (!activeTeam || !activeTeam.inviteCode) return;

    const inviteLink = `${window.location.origin}/join-team?code=${activeTeam.inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setNotifications((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          type: "success",
          message: "Invite link copied to clipboard!",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to copy invite link:", error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setNotifications((prev) => [
          ...prev,
          {
            id: generateUniqueId(),
            type: "success",
            message: "Invite link copied to clipboard!",
            timestamp: new Date().toISOString(),
          },
        ]);
        // eslint-disable-next-line no-unused-vars
      } catch (err) {
        setNotifications((prev) => [
          ...prev,
          {
            id: generateUniqueId(),
            type: "error",
            message: "Failed to copy invite link",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
      document.body.removeChild(textArea);
    }
  };

  // Get role badge
  const getRoleBadge = (userId) => {
    if (userId === activeTeam?.ownerId) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <FaCrown className="inline mr-1" /> Owner
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <FaUser className="inline mr-1" /> Member
      </span>
    );
  };

  // Get available projects for sharing
  const getAvailableProjects = () => {
    if (!activeTeam) return projects;
    return projects.filter(
      (project) => !activeTeam.projects?.includes(project.id)
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Team Workspace</h1>
          <p className="text-gray-600">Collaborate with your team members</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
        >
          <FaPlus /> Create Team
        </button>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg ${
                notification.type === "success"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}
            >
              {notification.message}
              <button
                onClick={() =>
                  setNotifications((prev) =>
                    prev.filter((n) => n.id !== notification.id)
                  )
                }
                className="float-right text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Team Invitations */}
      {teamInvitations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Team Invitations
          </h3>
          {teamInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-3 bg-yellow-100 rounded mb-2"
            >
              <div>
                <p className="font-medium">
                  Invitation to join {invitation.teamName}
                </p>
                <p className="text-sm text-yellow-700">
                  Invited by {invitation.invitedByName}
                </p>
                <p className="text-xs text-yellow-600">
                  Role: {invitation.role}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleInvitationResponse(invitation.id, true)}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleInvitationResponse(invitation.id, false)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Selection */}
      {teams.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Select Team</h2>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setActiveTeam(team)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  activeTeam?.id === team.id
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Team Management */}
      {activeTeam ? (
        <div className="space-y-6">
          {/* Team Header */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {activeTeam.name}
                </h2>
                <p className="text-gray-600">
                  Created on{" "}
                  {activeTeam.createdAt?.toDate?.().toLocaleDateString() ||
                    "Unknown date"}
                </p>
                <p className="text-sm text-gray-500">
                  {activeTeam.members.length} members •{" "}
                  {activeTeam.projects?.length || 0} shared projects
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Invite Code: {activeTeam.inviteCode}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
                >
                  <FaUserPlus /> Invite via Email
                </button>
                <button
                  onClick={() => setShowInviteLinkModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                >
                  <FaEnvelope /> Get Invite Link
                </button>
                <button
                  onClick={() => setShowShareProjectsModal(true)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-2"
                >
                  <FaProjectDiagram /> Share Projects
                </button>
                {activeTeam.ownerId === currentUser.uid && (
                  <button
                    onClick={() => deleteTeam(activeTeam.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
                  >
                    <FaTrash /> Delete Team
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FaUsers /> Team Members ({activeTeam.members.length})
            </h3>
            <div className="space-y-3">
              {activeTeam.members.map((memberId) => (
                <div
                  key={memberId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {memberId === currentUser.uid
                        ? (currentUser.displayName || currentUser.email || "U")
                            .charAt(0)
                            .toUpperCase()
                        : "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {memberId === currentUser.uid
                          ? currentUser.displayName ||
                            currentUser.email ||
                            "You"
                          : "Team Member"}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {memberId === currentUser.uid
                          ? currentUser.email
                          : "member@example.com"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {getRoleBadge(memberId)}

                    {activeTeam.ownerId === currentUser.uid &&
                      memberId !== currentUser.uid && (
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to remove this member from the team?"
                              )
                            ) {
                              removeMember(memberId);
                            }
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                          title="Remove member"
                        >
                          <FaTrash />
                        </button>
                      )}

                    {memberId === currentUser.uid && (
                      <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Projects */}
          {activeTeam.projects && activeTeam.projects.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaProjectDiagram /> Shared Projects (
                {activeTeam.projects.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTeam.projects.map((projectId) => {
                  const project = projects.find((p) => p.id === projectId);
                  if (!project) return null;

                  return (
                    <div
                      key={projectId}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`w-3 h-3 rounded-full ${project.color}`}
                        ></span>
                        {activeTeam.ownerId === currentUser.uid && (
                          <button
                            onClick={() => removeProjectFromTeam(projectId)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-2">
                        {project.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {project.client}
                      </p>
                      {project.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Team Statistics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Team Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {activeTeam.members.length}
                </div>
                <div className="text-sm text-blue-800">Members</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {activeTeam.projects?.length || 0}
                </div>
                <div className="text-sm text-green-800">Projects</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {
                    activeTeam.members.filter(
                      (memberId) => memberId === activeTeam.ownerId
                    ).length
                  }
                </div>
                <div className="text-sm text-purple-800">Owners</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {activeTeam.createdAt?.toDate?.().toLocaleDateString() ||
                    "Unknown"}
                </div>
                <div className="text-sm text-orange-800">Created</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FaUsers className="text-6xl text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No Active Team
          </h2>
          <p className="text-gray-600 mb-6">
            Create a team to start collaborating with others
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Create Your First Team
          </button>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Team</h2>
            <form onSubmit={createTeam}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Invite Team Member</h2>
            <form onSubmit={inviteMember}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter name"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Link Modal */}
      {showInviteLinkModal && activeTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Team Invite Link</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Share this link with team members:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/join-team?code=${activeTeam.inviteCode}`}
                  className="flex-1 border px-3 py-2 rounded-lg text-sm"
                />
                <button
                  onClick={copyInviteLink}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  title="Copy to clipboard"
                >
                  <FaCopy />
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowInviteLinkModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Projects Modal */}
      {showShareProjectsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Share Projects with Team</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Select projects to share with your team:
              </p>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {getAvailableProjects().map((project) => (
                  <label
                    key={project.id}
                    className="flex items-center p-3 border-b hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjects([
                            ...selectedProjects,
                            project.id,
                          ]);
                        } else {
                          setSelectedProjects(
                            selectedProjects.filter((id) => id !== project.id)
                          );
                        }
                      }}
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-gray-600">{project.client}</p>
                    </div>
                  </label>
                ))}
                {getAvailableProjects().length === 0 && (
                  <p className="p-4 text-gray-500 text-center">
                    No projects available to share
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowShareProjectsModal(false);
                  setSelectedProjects([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={shareProjectsWithTeam}
                disabled={selectedProjects.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                type="button"
              >
                Share Selected Projects
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
