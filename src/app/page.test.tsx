import { beforeEach, expect, it, jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type LoginCredentials = {
  email: string;
  password: string;
};

type LoginResult = {
  data: {
    user: null;
    session: null;
  };
  error: null;
};

type SessionResult = {
  data: {
    session: {
      access_token: string;
      user: {
        id: string;
        email: string;
      };
    } | null;
  };
};

const successfulLoginResult: LoginResult = {
  data: {
    user: null,
    session: null,
  },
  error: null,
};

const authenticatedSession: SessionResult = {
  data: {
    session: {
      access_token: "test-session-token",
      user: {
        id: "user-123",
        email: "test@example.com",
      },
    },
  },
};

const sampleApplication = {
  id: "application-1",
  user_id: "user-123",
  company: "Acme Labs",
  role: "Frontend Developer",
  location: "Remote",
  salary: "$120k",
  jobLink: "https://example.com/job",
  status: "Applied",
  notes: "Follow up next week.",
  createdAt: "2026-05-20T12:00:00.000Z",
} as const;

const mockSignInWithPassword = jest.fn<
  (credentials: LoginCredentials) => Promise<LoginResult>
>();
const mockSignUp = jest.fn<(credentials: LoginCredentials) => Promise<LoginResult>>();
const mockGetSession = jest.fn<() => Promise<SessionResult>>();
const mockSignOut = jest.fn<() => Promise<void>>();
const mockFetch = jest.fn<typeof fetch>();

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  })),
}));

function getRequestHeaders(callIndex: number) {
  const init = mockFetch.mock.calls[callIndex][1] as RequestInit;
  return new Headers(init.headers);
}

function getStoredApplications(userId = "user-123") {
  return JSON.parse(
    window.localStorage.getItem(`careertrack:applications:${userId}`) ?? "[]"
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
  mockGetSession.mockResolvedValue({
    data: { session: null },
  });
  mockSignInWithPassword.mockResolvedValue(successfulLoginResult);
  mockSignUp.mockResolvedValue(successfulLoginResult);
  mockSignOut.mockResolvedValue();
  global.fetch = mockFetch;
});

it("renders the login page without crashing", async () => {
  const { default: Home } = await import("./page");

  render(<Home />);

  expect(
    await screen.findByRole("heading", { name: /careertrack dashboard/i })
  ).toBeInTheDocument();
  expect(
    screen.getByText(/sign in to manage your job applications/i)
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(
    await screen.findByRole("button", { name: /log in/i })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /continue as guest/i })
  ).toBeInTheDocument();
});

it("continues as guest with a stable local session", async () => {
  const user = userEvent.setup();
  mockFetch.mockRejectedValue(new Error("Supabase paused"));
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByRole("button", { name: /continue as guest/i });
  await user.click(screen.getByRole("button", { name: /continue as guest/i }));

  expect(
    await screen.findByText(/signed in as guest@careertrack.local/i)
  ).toBeInTheDocument();
  expect(window.localStorage.getItem("careertrack:local-session")).toContain(
    "local-guest-user"
  );
  expect(window.localStorage.getItem("careertrack:local-user")).toContain(
    "local-guest-user"
  );
});

it("does not call Supabase sign in or signup during guest login", async () => {
  const user = userEvent.setup();
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByRole("button", { name: /continue as guest/i });
  await user.click(screen.getByRole("button", { name: /continue as guest/i }));

  expect(
    await screen.findByText(/signed in as guest@careertrack.local/i)
  ).toBeInTheDocument();
  expect(mockSignInWithPassword).not.toHaveBeenCalled();
  expect(mockSignUp).not.toHaveBeenCalled();
});

it("shows local-mode warnings after guest login", async () => {
  const user = userEvent.setup();
  const { default: Home } = await import("./page");

  render(<Home />);

  await user.click(
    await screen.findByRole("button", { name: /continue as guest/i })
  );

  expect(
    await screen.findByText(/cloud auth is unavailable/i)
  ).toBeInTheDocument();
  expect(screen.getByText(/supabase is unavailable/i)).toBeInTheDocument();
});

it("persists guest application data after refresh", async () => {
  const user = userEvent.setup();
  const { default: Home } = await import("./page");

  const { unmount } = render(<Home />);

  await user.click(
    await screen.findByRole("button", { name: /continue as guest/i })
  );
  await screen.findByText(/signed in as guest@careertrack.local/i);

  const addApplicationSection = screen
    .getByRole("heading", { name: /add application/i })
    .closest("div");
  const addApplicationForm = within(addApplicationSection as HTMLElement);

  await user.type(addApplicationForm.getByLabelText(/company/i), "Guest Co");
  await user.type(addApplicationForm.getByLabelText(/role/i), "Local Analyst");
  await user.click(
    addApplicationForm.getByRole("button", { name: /add application/i })
  );

  expect(await screen.findByText(/local analyst/i)).toBeInTheDocument();

  unmount();
  render(<Home />);

  expect(await screen.findByText(/local analyst/i)).toBeInTheDocument();
  expect(screen.getByText(/guest co/i)).toBeInTheDocument();
});

it("lets a user type an email and password", async () => {
  const user = userEvent.setup();
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByRole("button", { name: /log in/i });

  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);

  await user.type(emailInput, "test@example.com");
  await user.type(passwordInput, "super-secret-password");

  expect(emailInput).toHaveValue("test@example.com");
  expect(passwordInput).toHaveValue("super-secret-password");
});

it("submits the typed email and password when logging in", async () => {
  const user = userEvent.setup();
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByRole("button", { name: /log in/i });

  await user.type(screen.getByLabelText(/email/i), "test@example.com");
  await user.type(screen.getByLabelText(/password/i), "super-secret-password");
  await user.click(screen.getByRole("button", { name: /log in/i }));

  expect(mockSignInWithPassword).toHaveBeenCalledWith({
    email: "test@example.com",
    password: "super-secret-password",
  });
});

it("uses a local session when Supabase login fails to fetch", async () => {
  const user = userEvent.setup();
  mockSignInWithPassword.mockRejectedValue(new TypeError("Failed to fetch"));
  mockFetch.mockRejectedValue(new Error("Supabase paused"));
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByRole("button", { name: /log in/i });

  await user.type(screen.getByLabelText(/email/i), "test@example.com");
  await user.type(screen.getByLabelText(/password/i), "super-secret-password");
  await user.click(screen.getByRole("button", { name: /log in/i }));

  expect(
    await screen.findByText(/signed in as test@example.com/i)
  ).toBeInTheDocument();
  expect(screen.getByText(/cloud auth is unavailable/i)).toBeInTheDocument();
  expect(window.localStorage.getItem("careertrack:local-user")).toContain(
    "test@example.com"
  );
  expect(window.localStorage.getItem("careertrack:local-session")).toContain(
    "test@example.com"
  );
});

it("uses local fallback login when Supabase env vars are missing", async () => {
  const user = userEvent.setup();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByRole("button", { name: /log in/i });

  await user.type(screen.getByLabelText(/email/i), "local@example.com");
  await user.type(screen.getByLabelText(/password/i), "local-password");
  await user.click(screen.getByRole("button", { name: /log in/i }));

  expect(
    await screen.findByText(/signed in as local@example.com/i)
  ).toBeInTheDocument();
  expect(screen.getByText(/cloud auth is unavailable/i)).toBeInTheDocument();
  expect(mockSignInWithPassword).not.toHaveBeenCalled();
  expect(window.localStorage.getItem("careertrack:local-user")).toContain(
    "local@example.com"
  );
  expect(window.localStorage.getItem("careertrack:local-session")).toContain(
    "local@example.com"
  );
});

it("uses a local session when Supabase signup fails to fetch", async () => {
  const user = userEvent.setup();
  mockSignUp.mockRejectedValue(new TypeError("Failed to fetch"));
  mockFetch.mockRejectedValue(new Error("Supabase paused"));
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByRole("button", { name: /log in/i });
  await user.click(screen.getByRole("button", { name: /need an account/i }));

  await user.type(screen.getByLabelText(/email/i), "signup@example.com");
  await user.type(screen.getByLabelText(/password/i), "signup-password");
  await user.click(screen.getByRole("button", { name: /create account/i }));

  expect(
    await screen.findByText(/signed in as signup@example.com/i)
  ).toBeInTheDocument();
  expect(screen.getByText(/cloud auth is unavailable/i)).toBeInTheDocument();
  expect(window.localStorage.getItem("careertrack:local-session")).toContain(
    "signup@example.com"
  );
  expect(mockSignUp).not.toHaveBeenCalled();
});

it("resolves signup with a local session when Supabase signUp throws", async () => {
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  mockSignUp.mockRejectedValue(new TypeError("Failed to fetch"));
  const { applicationDataService } = await import(
    "../lib/applications/data-service"
  );

  await expect(
    applicationDataService.signup("direct-signup@example.com", "password")
  ).resolves.toEqual(
    expect.objectContaining({
      user: expect.objectContaining({
        id: "local-direct-signup@example.com",
        email: "direct-signup@example.com",
      }),
      warning: "Cloud auth is unavailable. Using local mode on this browser.",
    })
  );

  expect(warnSpy).toHaveBeenCalledWith(
    "Supabase signup failed. Falling back to local mode."
  );
  expect(window.localStorage.getItem("careertrack:local-session")).toContain(
    "direct-signup@example.com"
  );
  expect(mockSignUp).not.toHaveBeenCalled();
  warnSpy.mockRestore();
});

it("uses local fallback signup when Supabase env vars are missing", async () => {
  const user = userEvent.setup();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByRole("button", { name: /log in/i });
  await user.click(screen.getByRole("button", { name: /need an account/i }));

  await user.type(screen.getByLabelText(/email/i), "offline@example.com");
  await user.type(screen.getByLabelText(/password/i), "offline-password");
  await user.click(screen.getByRole("button", { name: /create account/i }));

  expect(
    await screen.findByText(/signed in as offline@example.com/i)
  ).toBeInTheDocument();
  expect(screen.getByText(/cloud auth is unavailable/i)).toBeInTheDocument();
  expect(mockSignUp).not.toHaveBeenCalled();
  expect(window.localStorage.getItem("careertrack:local-session")).toContain(
    "offline@example.com"
  );
});

it("renders the authenticated dashboard with application data", async () => {
  mockGetSession.mockResolvedValue(authenticatedSession);
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      applications: [sampleApplication],
    }),
  } as Response);
  const { default: Home } = await import("./page");

  render(<Home />);

  expect(
    await screen.findByText(/signed in as test@example.com/i)
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /careertrack dashboard/i })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /add application/i })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /your applications/i })
  ).toBeInTheDocument();
  expect(await screen.findByText(/frontend developer/i)).toBeInTheDocument();
  expect(screen.getByText(/acme labs/i)).toBeInTheDocument();

  const summary = screen.getByRole("region", {
    name: /application summary/i,
  });
  expect(within(summary).getByText(/total applications/i)).toBeInTheDocument();
  expect(within(summary).getByText(/applied/i)).toBeInTheDocument();
  expect(within(summary).getByText(/interviews/i)).toBeInTheDocument();
  expect(within(summary).getByText(/offers/i)).toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledWith("/api/applications", expect.anything());
  expect(getRequestHeaders(0).get("Authorization")).toBe(
    "Bearer test-session-token"
  );
});

it("submits a new application from the authenticated dashboard", async () => {
  const user = userEvent.setup();
  mockGetSession.mockResolvedValue(authenticatedSession);
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        applications: [],
      }),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        application: {
          id: "application-2",
          user_id: "user-123",
          company: "Nova Studio",
          role: "Product Engineer",
          location: "New York, NY",
          salary: "$130k",
          jobLink: "https://example.com/product-engineer",
          status: "Interview",
          notes: "Met the hiring manager at a meetup.",
          createdAt: "2026-05-21T12:00:00.000Z",
        },
      }),
    } as Response);
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByText(/start by adding your first job application/i);

  const addApplicationSection = screen
    .getByRole("heading", { name: /add application/i })
    .closest("div");

  expect(addApplicationSection).not.toBeNull();

  const addApplicationForm = within(addApplicationSection as HTMLElement);

  await user.type(addApplicationForm.getByLabelText(/company/i), "Nova Studio");
  await user.type(
    addApplicationForm.getByLabelText(/role/i),
    "Product Engineer"
  );
  await user.type(
    addApplicationForm.getByLabelText(/location/i),
    "New York, NY"
  );
  await user.type(addApplicationForm.getByLabelText(/salary/i), "$130k");
  await user.type(
    addApplicationForm.getByLabelText(/job link/i),
    "https://example.com/product-engineer"
  );
  await user.selectOptions(
    addApplicationForm.getByLabelText(/status/i),
    "Interview"
  );
  await user.type(
    addApplicationForm.getByLabelText(/notes/i),
    "Met the hiring manager at a meetup."
  );
  await user.click(
    addApplicationForm.getByRole("button", { name: /add application/i })
  );

  expect(await screen.findByText(/product engineer/i)).toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledWith(
    "/api/applications",
    expect.objectContaining({
      method: "POST",
      headers: expect.any(Headers),
    })
  );

  const postRequest = mockFetch.mock.calls[1][1] as RequestInit;
  const headers = getRequestHeaders(1);
  expect(headers.get("Authorization")).toBe("Bearer test-session-token");
  expect(headers.get("Content-Type")).toBe("application/json");
  expect(JSON.parse(postRequest.body as string)).toEqual({
    company: "Nova Studio",
    role: "Product Engineer",
    location: "New York, NY",
    salary: "$130k",
    jobLink: "https://example.com/product-engineer",
    status: "Interview",
    notes: "Met the hiring manager at a meetup.",
  });
});

it("falls back to local storage when Supabase is unavailable", async () => {
  mockGetSession.mockResolvedValue(authenticatedSession);
  window.localStorage.setItem(
    "careertrack:applications:user-123",
    JSON.stringify([sampleApplication])
  );
  mockFetch.mockRejectedValue(new Error("Supabase paused"));
  const { default: Home } = await import("./page");

  render(<Home />);

  expect(await screen.findByText(/frontend developer/i)).toBeInTheDocument();
  expect(screen.getByText(/supabase is unavailable/i)).toBeInTheDocument();
});

it("loads from local storage when Supabase is not configured", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  window.localStorage.setItem(
    "careertrack:local-session",
    JSON.stringify({
      access_token: "local-test@example.com",
      provider: "local",
      user: { id: "local-test@example.com", email: "test@example.com" },
    })
  );
  window.localStorage.setItem(
    "careertrack:applications:local-test@example.com",
    JSON.stringify([
      {
        ...sampleApplication,
        id: "local-application-1",
        user_id: "local-test@example.com",
      },
    ])
  );
  const { default: Home } = await import("./page");

  render(<Home />);

  expect(
    await screen.findByText(/signed in as test@example.com/i)
  ).toBeInTheDocument();
  expect(await screen.findByText(/frontend developer/i)).toBeInTheDocument();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("keeps a newly created record locally when Supabase sync fails", async () => {
  const user = userEvent.setup();
  mockGetSession.mockResolvedValue(authenticatedSession);
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        applications: [],
      }),
    } as Response)
    .mockRejectedValueOnce(new Error("Supabase paused"));
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByText(/start by adding your first job application/i);

  const addApplicationSection = screen
    .getByRole("heading", { name: /add application/i })
    .closest("div");
  const addApplicationForm = within(addApplicationSection as HTMLElement);

  await user.type(addApplicationForm.getByLabelText(/company/i), "Nova Studio");
  await user.type(
    addApplicationForm.getByLabelText(/role/i),
    "Product Engineer"
  );
  await user.click(
    addApplicationForm.getByRole("button", { name: /add application/i })
  );

  expect(await screen.findByText(/product engineer/i)).toBeInTheDocument();
  expect(screen.getByText(/supabase is unavailable/i)).toBeInTheDocument();
  expect(getStoredApplications()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        company: "Nova Studio",
        role: "Product Engineer",
      }),
    ])
  );
});

it("edits a record and preserves the edit in local storage", async () => {
  const user = userEvent.setup();
  mockGetSession.mockResolvedValue(authenticatedSession);
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        applications: [sampleApplication],
      }),
    } as Response)
    .mockRejectedValueOnce(new Error("Supabase paused"));
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByText(/frontend developer/i);
  await user.click(screen.getByRole("button", { name: /edit/i }));
  const roleInput = screen.getByLabelText("Role");
  await user.clear(roleInput);
  await user.type(roleInput, "Senior Frontend Developer");
  await user.click(screen.getByRole("button", { name: /save changes/i }));

  expect(
    await screen.findByText(/senior frontend developer/i)
  ).toBeInTheDocument();
  expect(getStoredApplications()[0]).toEqual(
    expect.objectContaining({ role: "Senior Frontend Developer" })
  );
});

it("deletes a record and preserves the deletion in local storage", async () => {
  const user = userEvent.setup();
  mockGetSession.mockResolvedValue(authenticatedSession);
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        applications: [sampleApplication],
      }),
    } as Response)
    .mockRejectedValueOnce(new Error("Supabase paused"));
  const { default: Home } = await import("./page");

  render(<Home />);

  await screen.findByText(/frontend developer/i);
  await user.click(screen.getByRole("button", { name: /delete/i }));

  expect(
    await screen.findByText(/start by adding your first job application/i)
  ).toBeInTheDocument();
  expect(getStoredApplications()).toEqual([]);
});

it("preserves local data after refreshing", async () => {
  mockGetSession.mockResolvedValue(authenticatedSession);
  window.localStorage.setItem(
    "careertrack:applications:user-123",
    JSON.stringify([sampleApplication])
  );
  mockFetch.mockRejectedValue(new Error("Supabase paused"));
  const { default: Home } = await import("./page");

  const { unmount } = render(<Home />);
  expect(await screen.findByText(/frontend developer/i)).toBeInTheDocument();

  unmount();
  render(<Home />);

  expect(await screen.findByText(/frontend developer/i)).toBeInTheDocument();
});

it("shows a non-blocking warning when applications fail to load", async () => {
  mockGetSession.mockResolvedValue(authenticatedSession);
  mockFetch.mockResolvedValue({
    ok: false,
    json: async () => ({
      error: "Could not load applications right now.",
    }),
  } as Response);
  const { default: Home } = await import("./page");

  render(<Home />);

  expect(
    await screen.findByText(/supabase is unavailable/i)
  ).toBeInTheDocument();
  expect(
    screen.getByText(/start by adding your first job application/i)
  ).toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledWith("/api/applications", expect.anything());
  expect(getRequestHeaders(0).get("Authorization")).toBe(
    "Bearer test-session-token"
  );
});
