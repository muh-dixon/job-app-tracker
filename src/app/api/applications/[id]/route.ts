import { NextResponse } from "next/server";

import { getSupabase } from "@/lib/supabase";
import {
  formatApplication,
  isValidStatus,
  normalizeText,
  type Application,
} from "../store";

type ApplicationRequestBody = Partial<Omit<Application, "id" | "createdAt">>;
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const supabase = getSupabase();
  const { id } = await context.params;
  const body = (await request.json()) as ApplicationRequestBody;

  const { data: currentApplication, error: findError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (findError || !currentApplication) {
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 }
    );
  }

  if (body.company !== undefined && !body.company.trim()) {
    return NextResponse.json(
      { error: "Company cannot be empty." },
      { status: 400 }
    );
  }

  if (body.role !== undefined && !body.role.trim()) {
    return NextResponse.json(
      { error: "Role cannot be empty." },
      { status: 400 }
    );
  }

  if (body.status && !isValidStatus(body.status)) {
    return NextResponse.json(
      { error: "Status must be Saved, Applied, Interview, Offer, or Rejected." },
      { status: 400 }
    );
  }

  const updatedApplication: Application = {
    ...(currentApplication as Application),
    company: body.company?.trim() ?? currentApplication.company,
    role: body.role?.trim() ?? currentApplication.role,
    location: body.location?.trim() ?? currentApplication.location ?? "",
    salary: body.salary?.trim() ?? currentApplication.salary ?? "",
    jobLink: body.jobLink?.trim() ?? currentApplication.jobLink ?? "",
    status: body.status ?? currentApplication.status,
    notes: body.notes?.trim() ?? currentApplication.notes ?? "",
  };

  const { data: existingApplications, error: duplicateError } = await supabase
    .from("applications")
    .select("id, company, role");

  if (duplicateError) {
    return NextResponse.json(
      { error: "Could not check for duplicate applications." },
      { status: 500 }
    );
  }

  const isDuplicate = (existingApplications ?? []).some(
    (application) =>
      application.id !== id &&
      normalizeText(application.company) ===
        normalizeText(updatedApplication.company) &&
      normalizeText(application.role) === normalizeText(updatedApplication.role)
  );

  if (isDuplicate) {
    return NextResponse.json(
      { error: "This job application already exists." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("applications")
    .update({
      company: updatedApplication.company,
      role: updatedApplication.role,
      location: updatedApplication.location,
      salary: updatedApplication.salary,
      jobLink: updatedApplication.jobLink,
      status: updatedApplication.status,
      notes: updatedApplication.notes,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update application." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    application: formatApplication(data as Application),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = getSupabase();
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Application not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Application deleted successfully." });
}
