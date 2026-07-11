import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

async function main() {
  console.log('Importing Sectors...');
  if (data.Sector) await prisma.sector.createMany({ data: data.Sector });

  console.log('Importing JobProfiles...');
  if (data.JobProfile) {
    const profiles = data.JobProfile.map(p => ({
      ...p,
      idiomasRequiere: p.idiomasRequiere === 1,
      turnos: p.turnos === 1,
      experienciaReq: p.experienciaReq === 1,
      isActive: p.isActive === 1
    }));
    await prisma.jobProfile.createMany({ data: profiles });
  }

  console.log('Importing Trainings...');
  if (data.Training) {
    const trainings = data.Training.map(t => ({
      ...t,
      isMandatory: t.isMandatory === 1
    }));
    await prisma.training.createMany({ data: trainings });
  }

  console.log('Importing Requirements...');
  if (data.Requirement) await prisma.requirement.createMany({ data: data.Requirement });

  console.log('Importing Employees...');
  if (data.Employee) {
    const employees = data.Employee.map(e => ({
      ...e,
      isActive: e.isActive === 1
    }));
    await prisma.employee.createMany({ data: employees });
  }

  console.log('Importing Training Sessions...');
  if (data.TrainingSession) {
    const sessions = data.TrainingSession.map(s => ({
      ...s,
      date: new Date(s.date)
    }));
    await prisma.trainingSession.createMany({ data: sessions });
  }

  console.log('Importing Attendances...');
  if (data.Attendance) {
    const attendances = data.Attendance.map(a => ({
      ...a,
      signedAt: new Date(a.signedAt)
    }));
    await prisma.attendance.createMany({ data: attendances });
  }

  console.log('Importing Effectiveness Evaluations...');
  if (data.EffectivenessEvaluation) {
    const evals = data.EffectivenessEvaluation.map(e => ({
      ...e,
      evaluatedAt: e.evaluatedAt ? new Date(e.evaluatedAt) : null
    }));
    await prisma.effectivenessEvaluation.createMany({ data: evals });
  }

  console.log('Importing EmployeeTrainingRecords (skipping GAPs)...');
  if (data.EmployeeTrainingRecord) {
    const records = data.EmployeeTrainingRecord
      .filter(r => r.status !== 'GAP')
      .map(r => ({
        ...r,
        completedAt: r.completedAt ? new Date(r.completedAt) : null,
        evaluatedAt: r.evaluatedAt ? new Date(r.evaluatedAt) : null,
        scheduledDate: r.scheduledDate ? new Date(r.scheduledDate) : null,
        rescheduledDate: r.rescheduledDate ? new Date(r.rescheduledDate) : null
      }));
    if (records.length > 0) {
      await prisma.employeeTrainingRecord.createMany({ data: records });
    }
  }

  console.log('Importing PendingTransfers...');
  if (data.PendingTransfer) {
    const transfers = data.PendingTransfer.map(t => ({
      ...t,
      createdAt: new Date(t.createdAt)
    }));
    await prisma.pendingTransfer.createMany({ data: transfers });
  }

  console.log('Done migrating data to Supabase!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
