import { prisma } from "./prisma";

export async function getUniqueActiveProfiles() {
  const perfiles = await prisma.jobProfile.findMany({
    where: { isActive: true, status: "VIGENTE" },
    orderBy: { title: 'asc' }
  });

  // Filter out duplicates by title (keep the first one encountered which will be alphabetical by title, though here we just want one unique entry per title)
  const uniqueProfiles = [];
  const titlesSeen = new Set<string>();

  for (const p of perfiles) {
    if (!titlesSeen.has(p.title)) {
      titlesSeen.add(p.title);
      uniqueProfiles.push(p);
    }
  }

  return uniqueProfiles;
}
