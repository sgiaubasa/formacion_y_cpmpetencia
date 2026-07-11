import xlsx from 'xlsx';

const filePath = 'C:/Users/sergio.montes/Competenca y Formacion/Login (1).xlsx';
const wb = xlsx.readFile(filePath);
const sheetName = wb.SheetNames.find(n => n.toLowerCase().trim() === 'consolidado') || wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet) as any[];

const estados = new Set<string>();

for (const row of data) {
  const getVal = (keyStr: string) => {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(keyStr.toLowerCase()));
    return key ? row[key]?.toString().trim() : null;
  };
  const estado = getVal('estado');
  if (estado) estados.add(estado);
}

console.log('Estados encontrados en el Excel:', Array.from(estados));
