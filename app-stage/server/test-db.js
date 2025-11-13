const DB = require('./database');
(async ()=>{
  const db = new DB();
  // wait for initialization
  await new Promise(r=>setTimeout(r,1500));
  try{
    const cols = await db.getAll("PRAGMA table_info('users')");
    console.log('user columns:', cols.map(c=>c.name));
  }catch(e){
    console.error('error reading pragma:', e);
  }
  try{ await db.close(); }catch(e){}
  process.exit(0);
})();
