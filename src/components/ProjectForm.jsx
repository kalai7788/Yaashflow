import { useState } from "react";

export default function ProjectForm({ onClose }) {
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [color, setColor] = useState("#3498db");

  const colors = [
    "#3498db", "#1abc9c", "#2ecc71", "#f39c12", 
    "#e67e22", "#9b59b6", "#e84393", "#7f8c8d"
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ projectName, client, color });
    // Save project to your backend or state
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">New Project</h2>
          <button onClick={onClose} className="text-gray-500">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Project Name *</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded"
              placeholder="Enter project name"
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium mb-1">Client</label>
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            >
              <option>No Client</option>
              <option>Acme Corp</option>
              <option>Other Client</option>
            </select>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border ${color === c ? "ring-2 ring-offset-2 ring-blue-500" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border">
              Cancel
            </button>
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




























