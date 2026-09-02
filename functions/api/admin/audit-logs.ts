import { DataStore } from '../_store';
import { checkAuthHeader } from '../_jwt';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const role = auth.payload?.role;
    const store = new DataStore(env);
    let logs = await store.getAuditLogs(100);

    // If not super_admin, filter out all super_admin traces and staff management events
    if (role !== 'super_admin' && role !== 'admin') {
      logs = logs.filter((log) => {
        const isStaffAction = ['ADD_STAFF', 'UPDATE_STAFF', 'DELETE_STAFF', 'RESET_PIN'].includes(log.action);
        const hasSuperAdmin =
          (log.operator && (log.operator.includes('Super Admin') || log.operator.includes('ผู้ดูแลระบบสูงสุด') || log.operator.toLowerCase() === 'admin')) ||
          (log.details && (log.details.includes('Super Admin') || log.details.includes('ผู้ดูแลระบบสูงสุด') || log.details.toLowerCase().includes('admin')));
        return !isStaffAction && !hasSuperAdmin;
      });
    }

    return new Response(JSON.stringify({ logs }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
