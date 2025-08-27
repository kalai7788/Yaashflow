// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AssignOrganization from "./pages/AssignOrganization";
import Team from "./pages/Team";
import JoinTeam from "./Services/JoinTeam";
import { useAuth } from "./hooks/useAuth";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";

export default function App() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  // 🔥 Load clients + projects from Firestore when user logs in
  useEffect(() => {
    if (!currentUser) return;

    // Clients real-time listener
    const unsubscribeClients = onSnapshot(
      collection(db, "users", currentUser.uid, "clients"),
      (snapshot) => {
        const clientData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientData);
      }
    );

    // Projects real-time listener
    const unsubscribeProjects = onSnapshot(
      collection(db, "users", currentUser.uid, "projects"),
      (snapshot) => {
        const projectData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProjects(projectData);
      }
    );

    return () => {
      unsubscribeClients();
      unsubscribeProjects();
    };
  }, [currentUser]);

  // 🔥 Add or update client
  const saveClient = async (client) => {
    if (!currentUser) return;
    const clientRef = doc(
      db,
      "users",
      currentUser.uid,
      "clients",
      client.id || crypto.randomUUID()
    );
    await setDoc(clientRef, client, { merge: true });
  };

  // 🔥 Add or update project
  const saveProject = async (project) => {
    if (!currentUser) return;
    const projectRef = doc(
      db,
      "users",
      currentUser.uid,
      "projects",
      project.id || crypto.randomUUID()
    );
    await setDoc(projectRef, project, { merge: true });
  };

  // 🔥 Delete client
  const deleteClient = async (id) => {
    if (!currentUser) return;
    await deleteDoc(doc(db, "users", currentUser.uid, "clients", id));
  };

  // 🔥 Delete project
  const deleteProject = async (id) => {
    if (!currentUser) return;
    await deleteDoc(doc(db, "users", currentUser.uid, "projects", id));
  };

  // Hide sidebar for auth pages
  const hideSidebar =
    location.pathname === "/login" || location.pathname === "/signup";

  return (
    <div className="flex h-screen bg-gray-50">
      {!hideSidebar && <Sidebar user={currentUser} logout={logout} />}

      <main className="flex-1 overflow-auto">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              !currentUser ? <Login /> : <Navigate to="/dashboard" replace />
            }
          />
          <Route
            path="/signup"
            element={
              !currentUser ? <Signup /> : <Navigate to="/dashboard" replace />
            }
          />
          <Route path="/assign-organization" element={<AssignOrganization />} />
          {/* Private Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard clients={clients} projects={projects} />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <PrivateRoute>
                <Projects
                  clients={clients}
                  saveClient={saveClient}
                  deleteClient={deleteClient}
                  projects={projects}
                  saveProject={saveProject}
                  deleteProject={deleteProject}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/team"
            element={
              <PrivateRoute>
                <Team />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Reports clients={clients} projects={projects} />
              </PrivateRoute>
            }
          />
          <Route path="/join-team" element={<JoinTeam />} />

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// PrivateRoute
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" replace />;
}

// Sidebar
function Sidebar({ user, logout }) {
  const location = useLocation();

  const NavLink = ({ to, icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center space-x-2 p-2 rounded transition-colors ${
          isActive
            ? "bg-blue-100 text-blue-600"
            : "hover:bg-gray-100 text-gray-700"
        }`}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <h1 className="text-xl font-bold p-6 border-b">YaashFlow</h1>
      <nav className="flex flex-col p-4 space-y-2 text-gray-700">
        <NavLink to="/dashboard" icon="🏠" label="Dashboard" />
        <NavLink to="/projects" icon="📁" label="Projects" />
        <NavLink to="/team" icon="👥" label="Team" />
        <NavLink to="/reports" icon="📊" label="Reports" />
        <button
          onClick={logout}
          className="text-red-500 hover:underline mt-auto py-2 border-t text-sm"
        >
          Logout
        </button>
      </nav>

      {user && (
        <div className="mt-auto p-6 border-t text-gray-600 text-sm space-y-1">
          <div>{user.displayName || "User"}</div>
          <div>{user.email}</div>
        </div>
      )}
    </aside>
  );
}
