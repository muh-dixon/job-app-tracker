"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// TypeScript Interface for Application
interface Application {
  id: string;
  user_id: string;
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

const inputClasses =
  "w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none transition duration-200 placeholder:text-zinc-500 focus:border-cyan-400/70 focus:bg-zinc-950 focus:ring-4 focus:ring-cyan-400/10";

const labelClasses = "mb-1.5 block text-sm font-medium text-zinc-300";

const panelClasses =
  "rounded-2xl border border-white/10 bg-zinc-900/70 shadow-2xl shadow-black/20 backdrop-blur";

const primaryButtonClasses =
  "rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition duration-200 hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClasses =
  "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-cyan-400/10";

const dangerButtonClasses =
  "rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-200 transition duration-200 hover:-translate-y-0.5 hover:border-red-400/40 hover:bg-red-500/15 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-red-400/10";

const authShellClasses =
  "relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-4 py-10 text-zinc-100";

const authPanelClasses = `${panelClasses} relative min-h-[26rem] w-full max-w-md p-8`;

const applicationResultsClasses = "space-y-4 sm:min-h-[26rem]";

function ApplicationSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-xl shadow-black/15">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="h-5 w-2/3 rounded-full bg-white/10" />
          <div className="mt-3 h-4 w-1/3 rounded-full bg-white/10" />

          <div className="mt-5 flex flex-wrap gap-2">
            <div className="h-7 w-28 rounded-full bg-white/10" />
            <div className="h-7 w-24 rounded-full bg-white/10" />
            <div className="h-7 w-32 rounded-full bg-white/10" />
          </div>

          <div className="mt-5 h-16 rounded-xl bg-white/10" />
        </div>

        <div className="flex gap-2 sm:flex-col sm:items-end">
          <div className="h-7 w-20 rounded-full bg-white/10" />
          <div className="h-9 w-16 rounded-xl bg-white/10" />
          <div className="h-9 w-20 rounded-xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  // State Management
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [editingApplication, setEditingApplication] =
    useState<Application | null>(null);
  const [formError, setFormError] = useState("");
  const [apiError, setApiError] = useState("");
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company: "",
    role: "",
    location: "",
    salary: "",
    jobLink: "",
    status: "Saved" as const,
    notes: "",
  });

  const getSessionToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("You must be logged in to manage applications.");
    }

    return session.access_token;
  }, [supabase]);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setAuthLoading(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (!session?.user) {
        setApplications([]);
        setEditingApplication(null);
        setApplicationsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Load applications from the backend API after a user is signed in
  useEffect(() => {
    if (authLoading || !user) return;

    const abortController = new AbortController();

    const fetchApplications = async () => {
      try {
        setApplicationsLoading(true);
        setApiError("");

        const token = await getSessionToken();
        const response = await fetch("/api/applications", {
          signal: abortController.signal,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const data = (await response.json()) as {
          applications: Application[];
        };

        setApplications(data.applications);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setApiError(
          error instanceof Error
            ? error.message
            : "Could not load applications."
        );
      } finally {
        if (!abortController.signal.aborted) {
          setApplicationsLoading(false);
        }
      }
    };

    fetchApplications();

    return () => abortController.abort();
  }, [authLoading, getSessionToken, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authActionLoading) return;

    setAuthError("");
    setAuthActionLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
      }
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Could not log in."
      );
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authActionLoading) return;

    setAuthError("");
    setAuthActionLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
      }
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Could not create account."
      );
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (logoutLoading) return;

    setLogoutLoading(true);

    try {
      await supabase.auth.signOut();
      setUser(null);
      setApplications([]);
      setEditingApplication(null);
      setApplicationsLoading(false);
    } finally {
      setLogoutLoading(false);
    }
  };

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
    if (addLoading) return;

    // Validation
    if (!formData.company.trim() || !formData.role.trim()) {
      alert("Company and Role are required!");
      return;
    }

    try {
      setAddLoading(true);
      setFormError("");

      const token = await getSessionToken();
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
      setAddLoading(false);
    }
  };

  // Handle delete application
  const handleDeleteApplication = async (id: string) => {
    if (deletingId) return;

    try {
      setApiError("");
      setDeletingId(id);

      const token = await getSessionToken();
      const response = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    } finally {
      setDeletingId(null);
    }
  };

  // Handle update application
  const handleUpdateApplication = async () => {
    if (!editingApplication || editLoading) return;

    try {
      setEditLoading(true);
      setApiError("");

      const token = await getSessionToken();
      const response = await fetch(
        `/api/applications/${editingApplication.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
      setEditLoading(false);
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
        return "border border-zinc-600/50 bg-zinc-800/80 text-zinc-200";
      case "Applied":
        return "border border-blue-400/30 bg-blue-500/15 text-blue-200";
      case "Interview":
        return "border border-cyan-400/30 bg-cyan-400/15 text-cyan-100";
      case "Offer":
        return "border border-emerald-400/30 bg-emerald-400/15 text-emerald-100";
      case "Rejected":
        return "border border-red-400/30 bg-red-500/15 text-red-100";
      default:
        return "border border-zinc-600/50 bg-zinc-800/80 text-zinc-200";
    }
  };

  if (authLoading) {
    return (
      <main
        className={authShellClasses}
        aria-busy="true"
      >
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className={`${authPanelClasses} flex flex-col items-center justify-center text-center`}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-50">
            Checking your session...
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Preparing your CareerTrack workspace.
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    const isLogin = authMode === "login";

    return (
      <main className={authShellClasses}>
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className={authPanelClasses}>
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-bold text-white shadow-lg shadow-blue-950/40">
              CT
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
              Career workspace
            </p>
            <h1 className="text-3xl font-bold text-zinc-50">
              CareerTrack Dashboard
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Sign in to manage your job applications
            </p>
          </div>

          <form
            onSubmit={isLogin ? handleLogin : handleSignup}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className={labelClasses}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setAuthError("");
                }}
                placeholder="you@example.com"
                required
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClasses}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAuthError("");
                }}
                placeholder="Enter your password"
                required
                className={inputClasses}
              />
            </div>

            {authError && (
              <p
                className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200"
                role="alert"
              >
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authActionLoading}
              className={`${primaryButtonClasses} w-full`}
            >
              {authActionLoading
                ? isLogin
                  ? "Logging in..."
                  : "Creating account..."
                : isLogin
                  ? "Log In"
                  : "Create Account"}
            </button>
          </form>

          <button
            type="button"
            disabled={authActionLoading}
            onClick={() => {
              setAuthMode(isLogin ? "signup" : "login");
              setAuthError("");
            }}
            className="mt-5 w-full text-sm font-semibold text-cyan-300 transition duration-200 hover:text-cyan-200 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLogin
              ? "Need an account? Sign up"
              : "Already have an account? Log in"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-screen bg-neutral-950 px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_30%),linear-gradient(180deg,#020617,#09090b_45%,#18181b)]" />
      {/* Header */}
      <header className="mx-auto mb-8 flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Application command center
          </p>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
            CareerTrack Dashboard
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Track and manage your job applications in one place
          </p>
          <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
            Signed in as {user.email}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={logoutLoading}
          className={`${secondaryButtonClasses} min-w-28 w-fit`}
        >
          {logoutLoading ? "Logging out..." : "Log Out"}
        </button>
      </header>

      {/* Stats Cards */}
      <section
        className="mx-auto mb-8 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Application summary"
      >
        {/* Total Applications */}
        <div className={`${panelClasses} p-5 transition duration-200 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-cyan-950/20`}>
          <p className="text-sm font-medium text-zinc-400">
            Total Applications
          </p>
          <p className="mt-3 text-3xl font-bold text-zinc-50">
            {stats.total}
          </p>
        </div>

        {/* Applied Count */}
        <div className={`${panelClasses} p-5 transition duration-200 hover:-translate-y-1 hover:border-blue-400/30 hover:shadow-blue-950/20`}>
          <p className="text-sm font-medium text-zinc-400">Applied</p>
          <p className="mt-3 text-3xl font-bold text-blue-300">
            {stats.applied}
          </p>
        </div>

        {/* Interview Count */}
        <div className={`${panelClasses} p-5 transition duration-200 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-cyan-950/20`}>
          <p className="text-sm font-medium text-zinc-400">Interviews</p>
          <p className="mt-3 text-3xl font-bold text-cyan-300">
            {stats.interview}
          </p>
        </div>

        {/* Offer Count */}
        <div className={`${panelClasses} p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-emerald-950/20`}>
          <p className="text-sm font-medium text-zinc-400">Offers</p>
          <p className="mt-3 text-3xl font-bold text-emerald-300">
            {stats.offer}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Add Application Form */}
        <div className="lg:col-span-1">
          <div className={`${panelClasses} sticky top-8 p-6`}>
            <h2 className="mb-1 text-2xl font-bold text-zinc-50">
              Add Application
            </h2>
            <p className="mb-6 text-sm leading-6 text-zinc-400">
              Capture a role, keep context, and move it through your pipeline.
            </p>

            <form onSubmit={handleAddApplication} className="space-y-4">
              {/* Company */}
              <div>
                <label htmlFor="company" className={labelClasses}>
                  Company *
                </label>
                <input
                  id="company"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="e.g. Google"
                  className={inputClasses}
                />
              </div>

              {/* Role */}
              <div>
                <label htmlFor="role" className={labelClasses}>
                  Role *
                </label>
                <input
                  id="role"
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  placeholder="e.g. Frontend Developer"
                  className={inputClasses}
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className={labelClasses}>
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g. San Francisco, CA"
                  className={inputClasses}
                />
              </div>

              {/* Salary */}
              <div>
                <label htmlFor="salary" className={labelClasses}>
                  Salary
                </label>
                <input
                  id="salary"
                  type="text"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  placeholder="e.g. $120k - $150k"
                  className={inputClasses}
                />
              </div>

              {/* Job Link */}
              <div>
                <label htmlFor="jobLink" className={labelClasses}>
                  Job Link
                </label>
                <input
                  id="jobLink"
                  type="url"
                  name="jobLink"
                  value={formData.jobLink}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  className={inputClasses}
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className={labelClasses}>
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={inputClasses}
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
                <label htmlFor="notes" className={labelClasses}>
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className={inputClasses}
                />
              </div>

              {formError && (
                <p
                  className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200"
                  role="alert"
                >
                  {formError}
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={addLoading}
                className={`${primaryButtonClasses} w-full`}
              >
                {addLoading ? "Adding..." : "Add Application"}
              </button>
            </form>
          </div>
        </div>

        {/* Applications List */}
        <div className="lg:col-span-2">
          {/* Search and Filter */}
          <div className={`${panelClasses} mb-6 p-6`}>
            <h2 className="mb-2 text-2xl font-bold text-zinc-50">
              Your Applications
            </h2>
            <p className="mb-5 text-sm leading-6 text-zinc-400">
              Search, filter, and update your active opportunities.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Search Box */}
              <div>
                <label htmlFor="application-search" className={labelClasses}>
                  Search
                </label>
                <input
                  id="application-search"
                  type="text"
                  placeholder="Search by company or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={inputClasses}
                />
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className={labelClasses}>
                  Filter by Status
                </label>
                <select
                  id="status-filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={inputClasses}
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
            <p
              className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200"
              role="alert"
            >
              {apiError}
            </p>
          )}

          {/* Applications Display */}
          <section
            className={applicationResultsClasses}
            aria-busy={applicationsLoading}
            aria-live="polite"
          >
            {applicationsLoading ? (
              <>
                <ApplicationSkeleton />
                <ApplicationSkeleton />
                <ApplicationSkeleton />
              </>
            ) : filteredApplications.length === 0 ? (
              // Empty State
              <div className={`${panelClasses} border-dashed border-white/15 p-10 text-center`}>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-lg font-bold text-zinc-300">
                  CT
                </div>
                <h3 className="mb-2 text-xl font-semibold text-zinc-50">
                  No applications yet
                </h3>
                <p className="mx-auto max-w-sm text-sm leading-6 text-zinc-400">
                  {applications.length === 0
                    ? "Start by adding your first job application!"
                    : "No applications match your search or filter."}
                </p>
              </div>
            ) : (
              // Applications List
              filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-xl shadow-black/15 backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-cyan-400/25 hover:bg-zinc-900 hover:shadow-cyan-950/20"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      {/* Application Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold text-zinc-50">
                          {app.role}
                        </h3>
                        <p className="mt-1 font-medium text-zinc-300">
                          {app.company}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-zinc-400">
                          {app.location && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                              Location: {app.location}
                            </span>
                          )}
                          {app.salary && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                              Salary: {app.salary}
                            </span>
                          )}
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            Added: {formatDate(app.createdAt)}
                          </span>
                        </div>

                        {app.notes && (
                          <p className="mt-4 rounded-xl border border-white/10 bg-zinc-950/50 p-3 text-sm leading-6 text-zinc-300">
                            <strong className="text-zinc-100">Notes:</strong>{" "}
                            {app.notes}
                          </p>
                        )}

                        {app.jobLink && (
                          <a
                            href={app.jobLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-block text-sm font-semibold text-cyan-300 transition duration-200 hover:text-cyan-200 hover:underline"
                          >
                            View Job Posting
                          </a>
                        )}
                      </div>

                      {/* Status and Actions */}
                      <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end">
                        {/* Status Badge */}
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold leading-5 shadow-sm ${getStatusStyles(
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
                          className={secondaryButtonClasses}
                        >
                          Edit
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteApplication(app.id)}
                          disabled={deletingId === app.id}
                          className={`${dangerButtonClasses} min-w-20`}
                        >
                          {deletingId === app.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
              )))}
          </section>
        </div>
      </div>

      {editingApplication && (
        <div className="fixed inset-0 z-50 flex animate-[fadeIn_160ms_ease-out] items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
          <div className="max-h-full w-full max-w-2xl animate-[modalIn_180ms_ease-out] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl shadow-black/50">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-50">
                  Edit Application
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Update the details for this job application.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingApplication(null)}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-zinc-400 transition duration-200 hover:bg-white/10 hover:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-cyan-400/10"
                aria-label="Close edit modal"
              >
                X
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                aria-label="Company"
                value={editingApplication.company}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    company: e.target.value,
                  })
                }
                className={inputClasses}
                placeholder="Company"
              />

              <input
                aria-label="Role"
                value={editingApplication.role}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    role: e.target.value,
                  })
                }
                className={inputClasses}
                placeholder="Role"
              />

              <input
                aria-label="Location"
                value={editingApplication.location}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    location: e.target.value,
                  })
                }
                className={inputClasses}
                placeholder="Location"
              />

              <input
                aria-label="Salary"
                value={editingApplication.salary}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    salary: e.target.value,
                  })
                }
                className={inputClasses}
                placeholder="Salary"
              />

              <input
                aria-label="Job link"
                type="url"
                value={editingApplication.jobLink}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    jobLink: e.target.value,
                  })
                }
                className={`${inputClasses} sm:col-span-2`}
                placeholder="Job Link"
              />

              <select
                aria-label="Status"
                value={editingApplication.status}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    status: e.target.value as Application["status"],
                  })
                }
                className={inputClasses}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <textarea
                aria-label="Notes"
                value={editingApplication.notes}
                onChange={(e) =>
                  setEditingApplication({
                    ...editingApplication,
                    notes: e.target.value,
                  })
                }
                className={`${inputClasses} min-h-28 sm:col-span-2`}
                placeholder="Notes"
              />
            </div>

            {formError && (
              <p
                className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200"
                role="alert"
              >
                {formError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingApplication(null)}
                className={secondaryButtonClasses}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateApplication}
                disabled={editLoading}
                className={`${primaryButtonClasses} min-w-32`}
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

