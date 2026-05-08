import { NextResponse } from "next/server";

import { getSupabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "./auth";
import {
  formatApplication,
  isValidStatus,
  normalizeText,
  type Application,
} from "./store";

type ApplicationRequestBody = Partial<
  Omit<Application, "id" | "user_id" | "createdAt">
>;
const applicationColumns =
  "id, user_id, company, role, location, salary, jobLink, status, notes, createdAt";

function getRouteErrorMessage(error: unknown, fallback: string) {
  if (process.env.NODE_ENV !== "development") {
    return fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("applications")
      .select(applicationColumns)
      .eq("user_id", user.id)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Supabase GET applications error:", error);
      return NextResponse.json(
        {
          error: getRouteErrorMessage(error, "Could not load applications."),
        },
        { status: 500 }
      );
    }

    const applications = (data ?? []).map((application) =>
      formatApplication(application as Application)
    );

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Supabase GET applications unexpected error:", error);
    return NextResponse.json(
      {
        error: getRouteErrorMessage(error, "Could not load applications."),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = (await request.json()) as ApplicationRequestBody;

  if (!body.company?.trim() || !body.role?.trim()) {
    return NextResponse.json(
      { error: "Company and role are required." },
      { status: 400 }
    );
  }

  if (body.status && !isValidStatus(body.status)) {
    return NextResponse.json(
      { error: "Status must be Saved, Applied, Interview, Offer, or Rejected." },
      { status: 400 }
    );
  }

  const company = body.company.trim();
  const role = body.role.trim();

  const { data: existingApplications, error: duplicateError } = await supabase
    .from("applications")
    .select("company, role")
    .eq("user_id", user.id);

  if (duplicateError) {
    return NextResponse.json(
      { error: "Could not check for duplicate applications." },
      { status: 500 }
    );
  }

  const isDuplicate = (existingApplications ?? []).some(
    (application) =>
      normalizeText(application.company) === normalizeText(company) &&
      normalizeText(application.role) === normalizeText(role)
  );

  if (isDuplicate) {
    return NextResponse.json(
      { error: "This job application already exists." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      company,
      role,
      location: body.location?.trim() ?? "",
      salary: body.salary?.trim() ?? "",
      jobLink: body.jobLink?.trim() ?? "",
      status: body.status ?? "Saved",
      notes: body.notes?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create application." },
      { status: 500 }
    );
  }

  const application = formatApplication(data as Application);

  return NextResponse.json({ application }, { status: 201 });
}
