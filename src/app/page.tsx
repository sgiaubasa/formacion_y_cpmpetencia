import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import DashboardClient from "@/components/DashboardClient";

import { getUniqueActiveProfiles } from "@/lib/profileUtils";

export default async function Home() {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);

  let allowedSectors: string[] | null = null;
  if (isSector && sectorRoleId) {
    const mySector = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    if (mySector) {
      allowedSectors = await getAllowedSectorNames(role, mySector.name);
    }
  }

  // Fetch all sectors and profiles for filter dropdowns
  const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const profiles = await getUniqueActiveProfiles(allowedSectors);

  // Filter records based on role (Admin sees all, Sector sees only their sector)
  const whereClause = (isSector && sectorRoleId) 
    ? { employee: { sectorId: sectorRoleId } } 
    : {};

  // Fetch training records
  const rawRecords = await prisma.employeeTrainingRecord.findMany({
    where: whereClause,
    include: {
      employee: {
        include: {
          sector: true,
          jobProfile: true
        }
      }
    }
  });

  // Flatten the records for the client component
  const dashboardData = rawRecords.map(record => {
    let dateToUse = record.completedAt || record.rescheduledDate || record.scheduledDate;
    
    return {
      id: record.id,
      status: record.status, // "COMPLETED", "IN_PLAN", "GAP"
      effectiveness: record.effectiveness, // "PENDING", "EFFECTIVE", "INEFFECTIVE"
      trainingName: record.trainingName,
      date: dateToUse ? dateToUse.toISOString() : null,
      employeeName: record.employee.name,
      employeeId: record.employee.id,
      sectorId: record.employee.sector.id,
      sectorName: record.employee.sector.name,
      profileId: record.employee.jobProfile?.id || null,
      profileTitle: record.employee.jobProfile?.title || 'Sin Perfil'
    };
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Panel de Control General</h1>
      </div>
      
      <DashboardClient 
        data={dashboardData} 
        sectors={sectors} 
        profiles={profiles} 
        isSector={isSector} 
      />
    </div>
  );
}
