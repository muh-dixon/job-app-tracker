"use client";

import { useEffect, useState } from "react";

// TypeScript Interface for Application
interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  salary: string;
  jobLink: string;
  status: "Saved" | "Applied" | "Interview" | "Offer" | "Rejected";
  notes: string;
  createdAt: string;
}

const getErrorMessage = async (response: Response) => {
  const data = await response.json().catch(() => null);

  if (data && typeof data.error === "string") {
    return data.error;
  }

  return "Something went wrong. Please try again.";
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

export default function Home() {
  // State Management
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [editingApplication, setEditingApplication] =
    useState<Application | null>(null);
  const [formError, setFormError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company: "",
    role: "",
    location: "",
    salary: "",
    jobLink: "",
    status: "Saved" as const,
    notes: "",
  });

  // Load applications from the backend API after the page opens
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        setApiError("");

        const response = await fetch("/api/applications");

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const data = (await response.json()) as {
          applications: Application[];
        };

        setApplications(data.applications);
      } catch (error) {
        setApiError(
          error instanceof Error
            ? error.message
            : "Could not load applications."
        );
      } finally {
        setIsLoading(false);
        }
    };

    fetchApplications();
  }, []);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormError("");
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle add application
  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.company.trim() || !formData.role.trim()) {
      alert("Company and Role are required!");
      return;
    }

    try {
      setIsSaving(true);
      setFormError("");

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

      const data = (await response.json()) as {
        application: Application;
      };

      // Add the application returned by the API to the list
      setApplications((currentApplications) => [
        data.application,
        ...currentApplications,
      ]);

    // Clear form
    setFormData({
      company: "",
      role: "",
      location: "",
      salary: "",
      jobLink: "",
      status: "Saved",
      notes: "",
    });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not add application."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete application
  const handleDeleteApplication = async (id: string) => {
    try {
      setApiError("");

      const response = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setApplications((currentApplications) =>
        currentApplications.filter((app) => app.id !== id)
      );
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Could not delete application."
      );
    }
  };

  // Handle update application
  const handleUpdateApplication = async () => {
    if (!editingApplication) return;

    try {
      setIsSaving(true);
      setApiError("");

      const response = await fetch(
        `/api/applications/${editingApplication.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editingApplication),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = (await response.json()) as {
        application: Application;
      };

    setApplications((currentApplications) =>
      currentApplications.map((application) =>
          application.id === data.application.id ? data.application : application
      )
    );

    setEditingApplication(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not update application."
      );
      setApiError(
        error instanceof Error
          ? error.message
          : "Could not update application."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Filter and search applications
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "All" || app.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: applications.length,
    applied: applications.filter((app) => app.status === "Applied").length,
    interview: applications.filter((app) => app.status === "Interview").length,
    offer: applications.filter((app) => app.status === "Offer").length,
  };

  const statusOptions = [
    "Saved",
    "Applied",
    "Interview",
    "Offer",
    "Rejected",
  ] as const;

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Saved":
        return "bg-neutral-200 text-neutral-700";
      case "Applied":
        return "bg-blue-100 text-blue-700";
      case "Interview":
        return "bg-purple-100 text-purple-700";
      case "Offer":
        return "bg-green-100 text-green-700";
      case "Rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-neutral-200 text-neutral-700";
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mx-auto mb-10 max-w-6xl">
        <h1 className="mb-2 text-4xl font-bold text-neutral-950">
          CareerTrack Dashboard
        </h1>
        <p className="text-lg text-neutral-600">
          Track and manage your job applications in one place
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mx-auto mb-10 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Applications */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">
            Total Applications
          </p>
          <p className="mt-3 text-3xl font-bold text-neutral-950">
            {stats.total}
          </p>
        </div>

        {/* Applied Count */}
        <div className="rounded-lg border border-blue-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Applied</p>
          <p className="mt-3 text-3xl font-bold text-blue-700">
            {stats.applied}
          </p>
        </div>

        {/* Interview Count */}
        <div className="rounded-lg border border-purple-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Interviews</p>
          <p className="mt-3 text-3xl font-bold text-purple-700">
            {stats.interview}
          </p>
        </div>

        {/* Offer Count */}
        <div className="rounded-lg border border-green-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Offers</p>
          <p className="mt-3 text-3xl font-bold text-green-700">
            {stats.offer}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Add Application Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-2xl font-bold text-neutral-950">
              Add Application
            </h2>

            <form onSubmit={handleAddApplication} className="space-y-4">
              {/* Company */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Company *
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="e.g. Google"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Role */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Role *
                </label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  placeholder="e.g. Frontend Developer"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Location */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Salary */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Salary
                </label>
                <input
                  type="text"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  placeholder="e.g. $120k - $150k"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Job Link */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Job Link
                </label>
                <input
                  type="url"
                  name="jobLink"
                  value={formData.jobLink}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {formError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {formError}
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-md bg-blue-600 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {isSaving ? "Adding..." : "Add Application"}
              </button>
            </form>
          </div>
        </div>

        {/* Applications List */}
        <div className="lg:col-span-2">
          {/* Search and Filter */}
          <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-neutral-950">
              Your Applications
            </h2>

            <div className="space-y-4">
              {/* Search Box */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by company or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Filter by Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="All">All Statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {apiError && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {apiError}
            </p>
          )}

          {/* Applications Display */}
          {isLoading ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-500">
                CT
              </div>
              <h3 className="mb-2 text-xl font-semibold text-neutral-950">
                Loading applications...
              </h3>
              <p className="mx-auto max-w-sm text-sm leading-6 text-neutral-600">
                Getting your job applications from the API.
              </p>
            </div>
          ) : filteredApplications.length === 0 ? (
            // Empty State
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-500">
                CT
              </div>
              <h3 className="mb-2 text-xl font-semibold text-neutral-950">
                No applications yet
              </h3>
              <p className="mx-auto max-w-sm text-sm leading-6 text-neutral-600">
                {applications.length === 0
                  ? "Start by adding your first job application!"
                  : "No applications match your search or filter."}
              </p>
            </div>
          ) : (
            // Applications List
            <div className="space-y-4">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    {/* Application Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-neutral-950">
                        {app.role}
                      </h3>
                      <p className="mt-1 font-medium text-neutral-600">
                        {app.company}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-600">
                        {app.location && <span>📍 {app.location}</span>}
                        {app.salary && <span>💰 {app.salary}</span>}
                        <span>📅 {formatDate(app.createdAt)}</span>
                      </div>

                      {app.notes && (
                        <p className="mt-4 rounded-md bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
                          <strong>Notes:</strong> {app.notes}
                        </p>
                      )}

                      {app.jobLink && (
                        <a
                          href={app.jobLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          View Job Posting →
                        </a>
                      )}
                    </div>

                    {/* Status and Actions */}
                    <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end">
                      {/* Status Badge */}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold leading-5 ${getStatusStyles(
                          app.status
                        )}`}
                      >
                        {app.status}
                      </span>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormError("");
                          setEditingApplication(app);
                        }}
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                      >
                        Edit
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteApplication(app.id)}
                        disabled={isSaving}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-neutral-950">
                  Edit Application
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Update the details for this job application.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingApplication(null)}
                className="rounded-md px-2 py-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                aria-label="Close edit modal"
              >
                X
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={editingApplication.company}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    company: e.target.value,
                  })
                }
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Company"
              />

              <input
                value={editingApplication.role}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    role: e.target.value,
                  })
                }
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Role"
              />

              <input
                value={editingApplication.location}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    location: e.target.value,
                  })
                }
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Location"
              />

              <input
                value={editingApplication.salary}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    salary: e.target.value,
                  })
                }
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Salary"
              />

              <input
                type="url"
                value={editingApplication.jobLink}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    jobLink: e.target.value,
                  })
                }
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:col-span-2"
                placeholder="Job Link"
              />

              <select
                value={editingApplication.status}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    status: e.target.value as Application["status"],
                  })
                }
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <textarea
                value={editingApplication.notes}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    notes: e.target.value,
                  })
                }
                className="min-h-28 rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:col-span-2"
                placeholder="Notes"
              />
            </div>

            {formError && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {formError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingApplication(null)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateApplication}
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
