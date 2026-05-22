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

const mockSignInWithPassword = jest.fn<
  (credentials: LoginCredentials) => Promise<LoginResult>
>();
const mockGetSession = jest.fn<() => Promise<SessionResult>>();
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
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({
    data: { session: null },
  });
  mockSignInWithPassword.mockResolvedValue(successfulLoginResult);
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

it("renders the authenticated dashboard with application data", async () => {
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        access_token: "test-session-token",
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      },
    },
  });
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      applications: [
        {
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
        },
      ],
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
  expect(mockFetch).toHaveBeenCalledWith(
    "/api/applications",
    expect.objectContaining({
      headers: {
        Authorization: "Bearer test-session-token",
      },
    })
  );
});

it("submits a new application from the authenticated dashboard", async () => {
  const user = userEvent.setup();
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        access_token: "test-session-token",
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      },
    },
  });
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

  expect(mockFetch).toHaveBeenCalledWith(
    "/api/applications",
    expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-session-token",
      },
    })
  );

  const postRequest = mockFetch.mock.calls[1][1] as RequestInit;
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

it("shows an error message when applications fail to load", async () => {
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        access_token: "test-session-token",
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      },
    },
  });
  mockFetch.mockResolvedValue({
    ok: false,
    json: async () => ({
      error: "Could not load applications right now.",
    }),
  } as Response);
  const { default: Home } = await import("./page");

  render(<Home />);

  expect(
    await screen.findByText(/could not load applications right now/i)
  ).toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledWith(
    "/api/applications",
    expect.objectContaining({
      headers: {
        Authorization: "Bearer test-session-token",
      },
    })
  );
});
