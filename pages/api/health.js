import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checks = {
    database: 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    node_version: process.version,
    environment: process.env.NODE_ENV
  };

  // Database health check
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    checks.database = 'healthy';
  } catch (error) {
    checks.database = 'unhealthy';
    checks.database_error = error.message;
  }

  // Overall health status
  const isHealthy = checks.database === 'healthy';
  const status = isHealthy ? 200 : 503;

  const response = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    message: isHealthy ? 'All systems operational' : 'Some systems are experiencing issues'
  };

  res.status(status).json(response);
}