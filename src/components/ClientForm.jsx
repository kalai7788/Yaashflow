import { useState, useEffect } from "react";
import { FaTrash } from "react-icons/fa";

function ClientForm({ 
  client, 
  onSave, 
  onCancel, 
  onDelete,
  clients = [],
  projects = []
}) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (client) {
      setClientName(client.name || "");
      setClientEmail(client.email || "");
    } else {
      setClientName("");
      setClientEmail("");
    }
  }, [client]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!clientName.trim()) {
      setError("Client name is required");
      return;
    }

    // Check for duplicate client names (excluding current client being edited)
    const isDuplicate = (clients || []).some(
      c => c.name.toLowerCase() === clientName.toLowerCase() && 
           (!client || c.id !== client.id)
    );

    if (isDuplicate) {
      setError("A client with this name already exists");
      return;
    }

    onSave({ 
      clientName, 
      clientEmail: clientEmail.trim() || null 
    });
  };

  const handleDelete = () => {
    if (!client) return;

    // Check if client has associated projects
    const hasProjects = (projects || []).some(p => p.client === client.name);

    if (hasProjects) {
      setError("Cannot delete client with existing projects");
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${client.name}?`)) {
      onDelete();
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">
            {client ? "Edit Client" : "New Client"}
          </h2>
          <button 
            onClick={onCancel} 
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Client Name *
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter client name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Client Email
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter client email"
            />
          </div>

          <div className="flex justify-between items-center pt-2  space-x-2">
            <div>
              {client && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-1 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                  <FaTrash /> Delete Client
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1 rounded border hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                {client ? "Update" : "Save"} Client
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientForm;