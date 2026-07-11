import xlsx from 'xlsx';

const filePath = 'C:/Users/sergio.montes/Competenca y Formacion/NOMINA_UNIFICADA_DEFINITIVA.xlsx';
const wb = xlsx.readFile(filePath);
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

if (data.length > 0) {
  console.log('Total rows:', data.length);
  console.log('Columns:', Object.keys(data[0] as any));
  console.log('Row 1 sample:', data[0]);
} else {
  console.log('No data found in sheet:', sheetName);
}
