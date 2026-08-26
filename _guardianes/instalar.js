// Instala el guardian de catalogos como hook de git. Correr una vez por clon del repo:
//   node _guardianes/instalar.js
const fs=require('fs'), path=require('path');
const repo=path.resolve(__dirname,'..');
const origen=path.join(__dirname,'pre-commit');
const destino=path.join(repo,'.git','hooks','pre-commit');
fs.copyFileSync(origen,destino);
try{ fs.chmodSync(destino,0o755); }catch(e){}
console.log('Guardian instalado en .git/hooks/pre-commit');
