import { prisma } from "./prisma";

export async function getUniqueActiveProfiles(allowedSectors?: string[] | null) {
  const whereClause: any = { isActive: true, status: "VIGENTE" };
  if (allowedSectors && allowedSectors.length > 0) {
    whereClause.gerencia = { in: allowedSectors };
  }

  const perfiles = await prisma.jobProfile.findMany({
    where: whereClause,
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
