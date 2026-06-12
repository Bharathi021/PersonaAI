import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  timeout: 15000,
});

export async function login(email, fullName) {
  const { data } = await API.post('/auth/login', {
    email,
    full_name: fullName,
  });
  return data;
}

export async function runAnalysis(payload) {
  const { data } = await API.post('/analysis/run', payload);
  return data;
}

export async function getDashboard(userId) {
  const { data } = await API.get(`/dashboard/${userId}`);
  return data;
}

export async function getEnterpriseMetrics() {
  const { data } = await API.get('/dashboard/enterprise/metrics');
  return data;
}

export async function getPlans() {
  const { data } = await API.get('/business/plans');
  return data;
}

export async function askAssistant(question, context = {}, apiKey = '') {
  const { data } = await API.post('/assistant/chat', {
    question,
    context,
    api_key: apiKey || null,
  });
  return data;
}

export async function generateExecutionPlan(payload) {
  const { data } = await API.post('/assistant/plan', payload);
  return data;
}
