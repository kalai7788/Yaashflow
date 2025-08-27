import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  doc,
  where,
  updateDoc,
  arrayUnion,
  collection,
  query,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { FaUsers, FaCheck, FaTimes, FaEnvelope } from "react-icons/fa";

export default function JoinTeam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inviteCode = searchParams.get("code");
  const email = searchParams.get("email");

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!inviteCode) {
        setError("No invitation code provided");
        setLoading(false);
        return;
      }

      try {
        // Find invitation by code and email
        const invitationsQuery = collection(db, "teamInvitations");
        const q = query(
          invitationsQuery,
          where("inviteCode", "==", inviteCode),
          where("email", "==", email),
          where("status", "==", "pending")
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("Invalid or expired invitation");
          setLoading(false);
          return;
        }

        const invitationDoc = querySnapshot.docs[0];
        setInvitation({ id: invitationDoc.id, ...invitationDoc.data() });
      } catch (error) {
        console.error("Error fetching invitation:", error);
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [inviteCode, email]);

  const handleAcceptInvitation = async () => {
    if (!currentUser) {
      navigate("/login", {
        state: { from: `/join-team?code=${inviteCode}&email=${email}` },
      });
      return;
    }

    try {
      // Update invitation status
      const invitationRef = doc(db, "teamInvitations", invitation.id);
      await updateDoc(invitationRef, {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedBy: currentUser.uid,
      });

      // Add user to team
      const teamRef = doc(db, "teams", invitation.teamId);
      await updateDoc(teamRef, {
        members: arrayUnion(currentUser.uid),
      });

      setSuccess("You have successfully joined the team!");
      setTimeout(() => {
        navigate("/team");
      }, 2000);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      setError("Failed to accept invitation");
    }
  };

  const handleDeclineInvitation = async () => {
    try {
      const invitationRef = doc(db, "teamInvitations", invitation.id);
      await updateDoc(invitationRef, {
        status: "declined",
        declinedAt: new Date(),
      });

      setSuccess("Invitation declined");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Error declining invitation:", error);
      setError("Failed to decline invitation");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <div className="text-center text-red-500 mb-4">
            <FaTimes className="text-4xl mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">
            Invitation Error
          </h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser && invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <div className="text-center text-blue-500 mb-4">
            <FaEnvelope className="text-4xl mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">
            Team Invitation
          </h2>
          <p className="text-gray-600 text-center mb-4">
            You've been invited to join <strong>{invitation.teamName}</strong>
          </p>
          <p className="text-gray-500 text-center mb-6">
            Please log in to accept this invitation
          </p>
          <button
            onClick={() =>
              navigate("/login", {
                state: { from: `/join-team?code=${inviteCode}&email=${email}` },
              })
            }
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 mb-3"
          >
            Log In
          </button>
          <button
            onClick={() =>
              navigate("/signup", {
                state: { from: `/join-team?code=${inviteCode}&email=${email}` },
              })
            }
            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
        {success ? (
          <>
            <div className="text-center text-green-500 mb-4">
              <FaCheck className="text-4xl mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-4">Success!</h2>
            <p className="text-gray-600 text-center mb-6">{success}</p>
          </>
        ) : (
          <>
            <div className="text-center text-blue-500 mb-4">
              <FaUsers className="text-4xl mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-4">
              Team Invitation
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-center mb-2">
                You've been invited to join{" "}
                <strong>{invitation.teamName}</strong>
              </p>
              <p className="text-center text-gray-600">
                Role: <span className="capitalize">{invitation.role}</span>
              </p>
              <p className="text-center text-gray-500 text-sm mt-2">
                Invited by: {invitation.invitedByName}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAcceptInvitation}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center"
              >
                <FaCheck className="mr-2" /> Accept Invitation
              </button>
              <button
                onClick={handleDeclineInvitation}
                className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 flex items-center justify-center"
              >
                <FaTimes className="mr-2" /> Decline Invitation
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
