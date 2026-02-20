import { prisma } from "@/lib/db";

export const PROJECT_IDS = [
  "creative_center",
  "traffic_center",
  "retention_center",
] as const;

export type ProjectId = (typeof PROJECT_IDS)[number];

export interface ProjectMeta {
  id: ProjectId;
  name: string;
  description: string;
  url: string;
  icon: string;
}

export const PROJECTS: Record<ProjectId, ProjectMeta> = {
  creative_center: {
    id: "creative_center",
    name: "Creative Center",
    description: "AI-powered ad creative generation",
    url: "https://ag1.q37fh758g.click",
    icon: "palette",
  },
  traffic_center: {
    id: "traffic_center",
    name: "Traffic Center",
    description: "Automated Meta/Facebook ad buying",
    url: "https://ag3.q37fh758g.click",
    icon: "bar-chart",
  },
  retention_center: {
    id: "retention_center",
    name: "Retention Center",
    description: "SMS, email, call conversion center",
    url: "http://ag2.q37fh758g.click",
    icon: "mail",
  },
};

export function isValidProject(project: string): project is ProjectId {
  return PROJECT_IDS.includes(project as ProjectId);
}

export function getProject(project: string): ProjectMeta | null {
  if (!isValidProject(project)) return null;
  return PROJECTS[project];
}

export async function canAccessProject(
  userId: string,
  project: string
): Promise<boolean> {
  if (!isValidProject(project)) return false;
  const record = await prisma.userProjectRole.findUnique({
    where: { userId_project: { userId, project } },
  });
  return record !== null;
}

export async function getAccessibleProjects(
  userId: string
): Promise<{ project: ProjectMeta; roleName: string }[]> {
  const records = await prisma.userProjectRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return records
    .filter((r: { project: string }) => isValidProject(r.project))
    .map((r: { project: string; role: { name: string } }) => ({
      project: PROJECTS[r.project as ProjectId],
      roleName: r.role.name,
    }));
}

export async function getUserProjectRole(
  userId: string,
  project: string
): Promise<{ roleId: string; roleName: string } | null> {
  if (!isValidProject(project)) return null;
  const record = await prisma.userProjectRole.findUnique({
    where: { userId_project: { userId, project } },
    include: { role: true },
  });
  if (!record) return null;
  return { roleId: record.roleId, roleName: record.role.name };
}
