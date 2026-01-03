// API Configuration
// Automatically detect environment: use production URL if not on localhost
// Points to main backend in CDC Site/backend folder
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'  // Local: main backend runs on port 3001
  : 'https://cdcapi.onrender.com/api';  // Production: main backend

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    console.log('🌐 [API] Making request to:', url);
    const response = await fetch(url, config);
    console.log('🌐 [API] Response status:', response.status);
    
    const data = await response.json();
    console.log('🌐 [API] Response data:', data);
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('❌ [API] Error:', error);
    
    // Handle connection errors more gracefully
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Cannot connect to server. Please make sure the backend server is running on port 3001.');
    }
    
    // Handle 404 errors
    if (error.message.includes('<!DOCTYPE') || error.message.includes('Unexpected token')) {
      throw new Error('Route not found. Please make sure the backend server has been restarted to load the latest routes.');
    }
    
    throw error;
  }
}

// Auth API
export const authAPI = {
  login: (username) => apiCall('/auth/login-voice-note', {
    method: 'POST',
    body: { username }
  })
};

// Jobs API
export const jobsAPI = {
  // Search job numbers from MSSQL (4+ digits)
  searchJobNumbers: (jobNumberPart) => apiCall(`/jobs/search-numbers/${encodeURIComponent(jobNumberPart)}`),
  // Get job details for voice note tool (with ClientName, JobName, OrderQuantity, PODate)
  getJobDetails: (jobNumber) => apiCall(`/jobs/details-update/${encodeURIComponent(jobNumber)}`)
};

// Voice Notes API
export const voiceNotesAPI = {
  create: (voiceNoteData) => apiCall('/voice-notes', {
    method: 'POST',
    body: voiceNoteData
  }),
  getByJobNumber: (jobNumber) => apiCall(`/voice-notes/job/${encodeURIComponent(jobNumber)}`),
  getAll: () => apiCall('/voice-notes')
};
