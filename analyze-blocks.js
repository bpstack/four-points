const fs = require('fs');

const schedules = {
  adriana: 'N N N N N N L T T T L L L L M M M PI PI L L L PI M M M L L M M PI'.split(' '),
  Andrés: 'L M L L M T L T T T L L L M M M L L L T PI T T L L T M PI M L L'.split(' '),
  MartaR: 'L L L M M L PI L L M M M T L L L L T T L L L N N N N N L T L L'.split(' '),
  Sara: 'L L T T T M L M M L L L N N N N N L T M M M L L PI M T T T L L'.split(' '),
  Hugo: 'M L M L L L N N N N N N L T T T T L L L T T T L L L L M L L M'.split(' '),
  Elena: 'M M M L L T T L L L T T M PI L L M M M T L L L T T T M L L PI M'.split(' '),
  PaulaMarmol: 'T T T L L L L M M M PI PI M L L L L N N N N N L T L L T L L T T'.split(' '),
  Vane: 'T T L L T M M L L L L M T L T T T L L M L M M M L L L N N N N'.split(' ')
};

const workShifts = ['M', 'T', 'N', 'PI'];

console.log('=== ANALISIS DE BLOQUES DE TRABAJO ===');
console.log('Regla: Minimo 3 dias consecutivos, Maximo 6 dias consecutivos\n');

let totalViolations = 0;

for (const [name, shifts] of Object.entries(schedules)) {
  const blocks = [];
  let blockStart = -1, blockLen = 0;
  
  for (let i = 0; i < shifts.length; i++) {
    const isWork = workShifts.includes(shifts[i]);
    if (isWork) {
      if (blockStart === -1) {
        blockStart = i + 1;
        blockLen = 1;
      } else {
        blockLen++;
      }
    } else {
      if (blockStart !== -1) {
        blocks.push({ start: blockStart, end: blockStart + blockLen - 1, len: blockLen });
        blockStart = -1;
        blockLen = 0;
      }
    }
  }
  if (blockStart !== -1) {
    blocks.push({ start: blockStart, end: blockStart + blockLen - 1, len: blockLen });
  }
  
  const violations = [];
  for (const b of blocks) {
    if (b.len < 3) {
      violations.push(`Bloque < 3: dias ${b.start}-${b.end} (${b.len} dias)`);
      totalViolations++;
    }
    if (b.len > 6) {
      violations.push(`Bloque > 6: dias ${b.start}-${b.end} (${b.len} dias)`);
      totalViolations++;
    }
  }
  
  const blockSummary = blocks.map(b => b.len).join(',');
  const status = violations.length > 0 ? 'VIOLACIONES' : 'OK';
  console.log(`${name.padEnd(12)}: bloques=[${blockSummary}] ${status}`);
  
  for (const v of violations) {
    console.log(`             - ${v}`);
  }
}

console.log('\n=== RESUMEN ===');
console.log(`Total violaciones: ${totalViolations}`);
