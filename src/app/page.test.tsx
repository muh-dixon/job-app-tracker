import { beforeEach, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
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

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: null },
      })),
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
  mockSignInWithPassword.mockResolvedValue(successfulLoginResult);
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
