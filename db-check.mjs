import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  host: 'db.xenfasfrawtnqjrjldqq.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'Huddy1991buddy123!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});
try {
  const users = await pool.query('SELECT id, username FROM users LIMIT 5');
  console.log('Users:', JSON.stringify(users.rows));
  const complaints = await pool.query('SELECT count(*) as cnt FROM complaints');
  console.log('Complaints:', complaints.rows[0].cnt);
  const batches = await pool.query('SELECT count(*) as cnt FROM batch_tests');
  console.log('Batch tests:', batches.rows[0].cnt);
  const sops = await pool.query('SELECT count(*) as cnt FROM sops');
  console.log('SOPs:', sops.rows[0].cnt);
  const deviations = await pool.query('SELECT count(*) as cnt FROM deviations');
  console.log('Deviations:', deviations.rows[0].cnt);
  const capas = await pool.query('SELECT count(*) as cnt FROM capas');
  console.log('CAPAs:', capas.rows[0].cnt);
  const taskboard = await pool.query("SELECT count(*) as cnt FROM taskboard_tasks");
  console.log('Taskboard tasks:', taskboard.rows[0].cnt);
  const audit = await pool.query('SELECT count(*) as cnt FROM audit_log');
  console.log('Audit log entries:', audit.rows[0].cnt);
  await pool.end();
} catch(e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
