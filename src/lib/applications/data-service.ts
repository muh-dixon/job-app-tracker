"use client";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import {
  formatApplication,
  isValidStatus,
  normalizeText,
  type Application,
  type ApplicationDraft,
} from "./store";

export type AppUser = Pick<User, "id" | "email">;

type AuthState = {
  user: AppUser | null;
  warning?: string;
};

type LoadResult = {
  applications: Application[];
  warning?: string;
};

type SaveResult = {
  application?: Application;
  warning?: string;
};

type DeleteResult = {
  warning?: string;
};

type AuthSubscription = {
  unsubscribe: () => void;
};

type LocalSession = {
  access_token: string;
  user: AppUser;
  provider: "local";
};

const localUserKey = "careertrack:local-user";
const localSessionKey = "careertrack:local-session";
const localGuestUserId = "local-guest-user";
const localGuestEmail = "guest@careertrack.local";
const cloudAuthUnavailableWarning =
  "Cloud auth is unavailable. Using local mode on this browser.";
const cloudDataUnavailableWarning =
  "Supabase is unavailable. Your changes are saved locally and will stay on this device.";
const startupTimeoutMs = 300;

let isCloudAuthKnownUnavailable = false;

const getErrorMessage = async (response: Response) => {
  const data = await response.json().catch(() => null);

  if (data && typeof data.error === "string") {
    return data.error;
  }

  return "Something went wrong. Please try again.";
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function getApplicationsKey(userId: string) {
  return `careertrack:applications:${userId}`;
}

function loadLocalSession(): LocalSession | null {
  if (!canUseLocalStorage()) return null;

  const storedSession = window.localStorage.getItem(localSessionKey);
  if (!storedSession) return null;

  try {
    return JSON.parse(storedSession) as LocalSession;
  } catch {
    window.localStorage.removeItem(localSessionKey);
    return null;
  }
}

function loadLocalUser(): AppUser | null {
  const session = loadLocalSession();
  if (session?.user) return session.user;

  if (!canUseLocalStorage()) return null;

  const storedUser = window.localStorage.getItem(localUserKey);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AppUser;
  } catch {
    window.localStorage.removeItem(localUserKey);
    return null;
  }
}

function isLocalModeEnabled() {
  return loadLocalSession()?.provider === "local";
}

function saveLocalSession(session: LocalSession) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(localSessionKey, JSON.stringify(session));
  window.localStorage.setItem(localUserKey, JSON.stringify(session.user));
}

function saveLocalUser(user: AppUser) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(localUserKey, JSON.stringify(user));
}

function clearLocalUser() {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(localSessionKey);
  window.localStorage.removeItem(localUserKey);
}

function loadLocalApplications(userId: string): Application[] {
  if (!canUseLocalStorage()) return [];

  const storedApplications = window.localStorage.getItem(
    getApplicationsKey(userId)
  );
  if (!storedApplications) return [];

  try {
    const applications = JSON.parse(storedApplications) as Application[];
    return applications.map(formatApplication);
  } catch {
    window.localStorage.removeItem(getApplicationsKey(userId));
    return [];
  }
}

function saveLocalApplications(userId: string, applications: Application[]) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(
    getApplicationsKey(userId),
    JSON.stringify(applications.map(formatApplication))
  );
}

function createLocalSession(email: string): LocalSession {
  const normalizedEmail = email.trim().toLowerCase();
  const safeEmail = normalizedEmail || email || "local-user";
  const user = {
    id: `local-${safeEmail}`,
    email: safeEmail,
  };

  return {
    access_token: `local-${safeEmail}`,
    user,
    provider: "local",
  };
}

function createGuestSession(): LocalSession {
  return {
    access_token: localGuestUserId,
    user: {
      id: localGuestUserId,
      email: localGuestEmail,
    },
    provider: "local",
  };
}

function createLocalAuthState(email: string): AuthState {
  const session = createLocalSession(email);
  saveLocalSession(session);

  return { user: session.user, warning: cloudAuthUnavailableWarning };
}

function createGuestAuthState(): AuthState {
  const session = createGuestSession();
  saveLocalSession(session);

  return { user: session.user, warning: cloudAuthUnavailableWarning };
}

function fallbackToLocalAuth(email: string, message: string): AuthState {
  isCloudAuthKnownUnavailable = true;
  console.warn(message);
  return createLocalAuthState(email);
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function getSupabaseSafely() {
  if (!isSupabaseConfigured()) return null;

  try {
    return createClient();
  } catch {
    return null;
  }
}

async function getSessionToken() {
  const supabase = getSupabaseSafely();
  if (!supabase) return null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Supabase startup timed out."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function getUserFromSupabase(user: User | null | undefined): AppUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? "",
  };
}

function validateDraft(body: ApplicationDraft) {
  if (!body.company?.trim() || !body.role?.trim()) {
    throw new Error("Company and role are required.");
  }

  if (body.status && !isValidStatus(body.status)) {
    throw new Error("Status must be Saved, Applied, Interview, Offer, or Rejected.");
  }
}

function buildLocalApplication(
  userId: string,
  body: ApplicationDraft
): Application {
  validateDraft(body);

  return {
    id: createLocalId(),
    user_id: userId,
    company: body.company!.trim(),
    role: body.role!.trim(),
    location: body.location?.trim() ?? "",
    salary: body.salary?.trim() ?? "",
    jobLink: body.jobLink?.trim() ?? "",
    status: body.status ?? "Saved",
    notes: body.notes?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };
}

function hasDuplicateApplication(
  applications: Application[],
  candidate: Pick<Application, "company" | "role">,
  ignoredId?: string
) {
  return applications.some(
    (application) =>
      application.id !== ignoredId &&
      normalizeText(application.company) === normalizeText(candidate.company) &&
      normalizeText(application.role) === normalizeText(candidate.role)
  );
}

async function fetchWithToken(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const token = await getSessionToken();

  if (!token) {
    throw new Error("No Supabase session is available.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

async function disabledSupabaseSignup(email: string, password: string) {
  // Disabled for future restoration. Do not call while the project is paused.
  const supabase = getSupabaseSafely();
  if (!supabase) {
    return createLocalAuthState(email);
  }

  try {
    const signUp = supabase.auth["signUp"];
    const result = await signUp.call(supabase.auth, {
      email,
      password,
    });
    const { error } = result;

    if (error) {
      return { user: null, warning: error.message };
    }

    return applicationDataService.getCurrentUser();
  } catch {
    return fallbackToLocalAuth(
      email,
      "Supabase signup failed. Falling back to local mode."
    );
  }
}

void disabledSupabaseSignup;

export const applicationDataService = {
  async getCurrentUser(): Promise<AuthState> {
    const localUser = loadLocalUser();
    if (isLocalModeEnabled() && localUser) {
      return { user: localUser, warning: cloudAuthUnavailableWarning };
    }

    const supabase = getSupabaseSafely();

    if (!supabase) {
      return { user: localUser, warning: cloudAuthUnavailableWarning };
    }

    try {
      const {
        data: { session },
      } = await withTimeout(supabase.auth.getSession(), startupTimeoutMs);

      const user = getUserFromSupabase(session?.user);
      if (user) {
        saveLocalUser(user);
        return { user };
      }

      return { user: localUser };
    } catch {
      return { user: localUser, warning: cloudAuthUnavailableWarning };
    }
  },

  subscribeToAuthChanges(onChange: (state: AuthState) => void): AuthSubscription {
    const supabase = getSupabaseSafely();

    if (!supabase) {
      return { unsubscribe: () => undefined };
    }

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = getUserFromSupabase(session?.user);

        if (user) {
          saveLocalUser(user);
        } else {
          clearLocalUser();
        }

        onChange({ user });
      });

      return subscription;
    } catch {
      onChange({ user: loadLocalUser(), warning: cloudAuthUnavailableWarning });
      return { unsubscribe: () => undefined };
    }
  },

  async login(email: string, password: string): Promise<AuthState> {
    if (
      !isSupabaseConfigured() ||
      isLocalModeEnabled() ||
      (isCloudAuthKnownUnavailable && loadLocalUser())
    ) {
      return fallbackToLocalAuth(
        email,
        "Supabase login failed. Falling back to local mode."
      );
    }

    try {
      const supabase = getSupabaseSafely();
      if (!supabase) {
        return fallbackToLocalAuth(
          email,
          "Supabase login failed. Falling back to local mode."
        );
      }

      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      const { error } = result;

      if (error) {
        return { user: null, warning: error.message };
      }

      return applicationDataService.getCurrentUser();
    } catch {
      return fallbackToLocalAuth(
        email,
        "Supabase login failed. Falling back to local mode."
      );
    }
  },

  async signup(email: string, password: string): Promise<AuthState> {
    void password;
    // Emergency local-mode fallback while Supabase project is paused.
    return fallbackToLocalAuth(
      email,
      "Supabase signup failed. Falling back to local mode."
    );
  },

  async continueAsGuest(): Promise<AuthState> {
    // Emergency local-mode fallback while Supabase project is paused.
    isCloudAuthKnownUnavailable = true;
    return createGuestAuthState();
  },

  async logout() {
    const supabase = getSupabaseSafely();
    clearLocalUser();

    try {
      await supabase?.auth.signOut();
    } catch {
      // Local logout should still complete when Supabase is unavailable.
    }
  },

  async loadApplications(userId: string): Promise<LoadResult> {
    if (isLocalModeEnabled()) {
      return {
        applications: loadLocalApplications(userId),
        warning: cloudDataUnavailableWarning,
      };
    }

    try {
      const response = await fetchWithToken("/api/applications");

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = (await response.json()) as {
        applications: Application[];
      };
      const applications = data.applications.map(formatApplication);
      saveLocalApplications(userId, applications);

      return { applications };
    } catch {
      return {
        applications: loadLocalApplications(userId),
        warning: cloudDataUnavailableWarning,
      };
    }
  },

  async createApplication(
    userId: string,
    body: ApplicationDraft
  ): Promise<SaveResult> {
    const localApplications = loadLocalApplications(userId);
    const localApplication = buildLocalApplication(userId, body);

    if (hasDuplicateApplication(localApplications, localApplication)) {
      throw new Error("This job application already exists.");
    }

    saveLocalApplications(userId, [localApplication, ...localApplications]);

    try {
      const response = await fetchWithToken("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = (await response.json()) as {
        application: Application;
      };
      const syncedApplication = formatApplication(data.application);
      const currentApplications = loadLocalApplications(userId);

      saveLocalApplications(
        userId,
        currentApplications.map((application) =>
          application.id === localApplication.id
            ? syncedApplication
            : application
        )
      );

      return { application: syncedApplication };
    } catch {
      return { application: localApplication, warning: cloudDataUnavailableWarning };
    }
  },

  async updateApplication(
    userId: string,
    application: Application
  ): Promise<SaveResult> {
    validateDraft(application);

    const localApplications = loadLocalApplications(userId);
    const updatedApplication = formatApplication({
      ...application,
      company: application.company.trim(),
      role: application.role.trim(),
      location: application.location.trim(),
      salary: application.salary.trim(),
      jobLink: application.jobLink.trim(),
      notes: application.notes.trim(),
    });

    if (
      hasDuplicateApplication(
        localApplications,
        updatedApplication,
        updatedApplication.id
      )
    ) {
      throw new Error("This job application already exists.");
    }

    saveLocalApplications(
      userId,
      localApplications.map((currentApplication) =>
        currentApplication.id === updatedApplication.id
          ? updatedApplication
          : currentApplication
      )
    );

    try {
      const response = await fetchWithToken(
        `/api/applications/${updatedApplication.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedApplication),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = (await response.json()) as {
        application: Application;
      };
      const syncedApplication = formatApplication(data.application);
      const currentApplications = loadLocalApplications(userId);

      saveLocalApplications(
        userId,
        currentApplications.map((currentApplication) =>
          currentApplication.id === syncedApplication.id
            ? syncedApplication
            : currentApplication
        )
      );

      return { application: syncedApplication };
    } catch {
      return { application: updatedApplication, warning: cloudDataUnavailableWarning };
    }
  },

  async deleteApplication(
    userId: string,
    applicationId: string
  ): Promise<DeleteResult> {
    const localApplications = loadLocalApplications(userId);
    saveLocalApplications(
      userId,
      localApplications.filter((application) => application.id !== applicationId)
    );

    try {
      const response = await fetchWithToken(`/api/applications/${applicationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      return {};
    } catch {
      return { warning: cloudDataUnavailableWarning };
    }
  },
};
