import { apiFetch } from "@/lib/api/client";
import type { Project } from "@/types/api";

export async function listProjects() {
  return apiFetch<Project[]>("/projects");
}
