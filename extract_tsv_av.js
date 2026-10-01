const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:/Users/sergio.montes/.gemini/antigravity/brain/8f9a1208-9233-48fb-85cf-af880025c8e3/.system_generated/logs/transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lastUserMsg = '';
  for await (const line of rl) {
    if (line.includes('"type":"USER_INPUT"')) {
      const obj = JSON.parse(line);
      let content = obj.content;
      if (typeof content === 'string') {
          lastUserMsg = content;
      } else if (Array.isArray(content)) {
          lastUserMsg = content.map(c => c.text || '').join('');
      }
    }
  }
  
  if (lastUserMsg) {
      let content = lastUserMsg.replace(/^av ahora\s*/i, '').trim();
      fs.writeFileSync('C:/Users/sergio.montes/Competenca y Formacion/sgcysv-app/data_av.tsv', content);
      console.log('Saved to data_av.tsv');
  }
}
processLineByLine();
