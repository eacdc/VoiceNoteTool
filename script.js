import { authAPI, jobsAPI, voiceNotesAPI, voiceNoteToolAPI, voiceNoteUserAPI } from './api.js';

// Global error handler for module loading issues
window.addEventListener('error', (event) => {
  console.error('Global error:', event);
}, true);


// Check if user is on login page or main page
const pathname = window.location.pathname;
const filename = pathname.split('/').pop();
const isLoginPage = filename === 'index.html' || filename === '' || !filename.includes('main.html');

// If on main page, check authentication
if (!isLoginPage) {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  
  if (!token || !username) {
    // Redirect to login if not authenticated
    window.location.href = 'index.html';
  } else {
    // Display username
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
      usernameDisplay.textContent = `User: ${username}`;
    }
  }
}

// Login functionality
if (isLoginPage) {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnText = document.getElementById('loginBtnText');
  const loginBtnIcon = document.getElementById('loginBtnIcon');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    loginError.style.display = 'none';
    loginError.className = 'inline-warning';

    if (!username) {
      loginError.textContent = 'Please enter your username.';
      loginError.style.display = 'block';
      return;
    }

    if (!password) {
      loginError.textContent = 'Please enter your password.';
      loginError.style.display = 'block';
      return;
    }

    // Set loading state
    if (loginBtn) {
      loginBtn.disabled = true;
      if (loginBtnText) loginBtnText.textContent = 'Loading...';
      if (loginBtnIcon) {
        loginBtnIcon.innerHTML = '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="15.708" stroke-dashoffset="15.708" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" values="0 12 12;360 12 12"/><animate attributeName="stroke-dashoffset" dur="1.5s" values="0;15.708" repeatCount="indefinite"/></circle>';
      }
    }

    try {
      const response = await authAPI.login(username, password);
      
      // Store token, userId, and username from DB (normalized)
      localStorage.setItem('token', response.token || 'dummy-token');
      localStorage.setItem('userId', response.userId || '');
      localStorage.setItem('username', response.username || username.toLowerCase()); // Use DB username
      
      // Redirect to main page
      window.location.href = 'main.html';
    } catch (error) {
      console.error('Login error:', error);
      loginError.textContent = error.message || 'Login failed. Please check your credentials.';
      loginError.style.display = 'block';
      
      // Reset button state
      if (loginBtn) {
        loginBtn.disabled = false;
        if (loginBtnText) loginBtnText.textContent = 'Login';
        if (loginBtnIcon) {
          loginBtnIcon.style.display = 'block';
          loginBtnIcon.innerHTML = '<path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        }
      }
    }
  });

  // Add User functionality on login page
  const addUserForm = document.getElementById('addUserForm');
  const addUserError = document.getElementById('addUserError');
  const addUserSuccess = document.getElementById('addUserSuccess');
  const addUserSubmitBtn = document.getElementById('addUserSubmitBtn');

  if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('newUsername').value.trim();
      const password = document.getElementById('newPassword').value;

      // Hide previous messages
      if (addUserError) {
        addUserError.style.display = 'none';
      }
      if (addUserSuccess) {
        addUserSuccess.style.display = 'none';
      }

      if (!username || !password) {
        if (addUserError) {
          addUserError.textContent = 'Please enter both username and password.';
          addUserError.style.display = 'block';
        }
        return;
      }

      // Set loading state
      if (addUserSubmitBtn) {
        addUserSubmitBtn.disabled = true;
        addUserSubmitBtn.innerHTML = '<span>Creating...</span>';
      }

      try {
        await voiceNoteUserAPI.createUser(username, password);
        
        // Show success message
        if (addUserSuccess) {
          addUserSuccess.textContent = `User "${username}" created successfully! You can now login.`;
          addUserSuccess.style.display = 'block';
        }

        // Clear form
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';

        // Hide success message after 5 seconds
        setTimeout(() => {
          if (addUserSuccess) {
            addUserSuccess.style.display = 'none';
          }
        }, 5000);
      } catch (error) {
        console.error('Error creating user:', error);
        if (addUserError) {
          addUserError.textContent = error.message || 'Failed to create user. Please try again.';
          addUserError.style.display = 'block';
        }
      } finally {
        if (addUserSubmitBtn) {
          addUserSubmitBtn.disabled = false;
          addUserSubmitBtn.innerHTML = '<span>Create Account</span>';
        }
      }
    });
  }
}

// Main page functionality
if (!isLoginPage) {
  // Logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      window.location.href = 'index.html';
    });
  }

  // Collapsible panels (general) - exclude existingAudioSection
  document.querySelectorAll(".panel--collapsible .panel-header").forEach((header) => {
    const panel = header.closest(".panel--collapsible");
    // Skip the existing audio section - it has its own handler
    if (panel && panel.id !== 'existingAudioSection') {
      header.addEventListener("click", () => {
        panel?.classList.toggle("panel-collapsed");
      });
    }
  });

  // Job search functionality
  const jobSearchForm = document.getElementById('jobSearchForm');
  const jobSearchError = document.getElementById('jobSearchError');
  const jobNumberInput = document.getElementById('jobNumber');
  const jobNumberDropdown = document.getElementById('jobNumberDropdown');
  let searchTimeout = null;
  let currentJobNumber = null;
  let currentJobNumbers = []; // Store all job numbers from batch query

  // Handle job number input - search when 4+ digits entered
  jobNumberInput.addEventListener('input', async (e) => {
    const value = e.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Hide dropdown if less than 4 characters
    if (value.length < 4) {
      jobNumberDropdown.style.display = 'none';
      return;
    }

    // Debounce search (wait 300ms after user stops typing)
    searchTimeout = setTimeout(async () => {
      try {
        console.log('🔍 [FRONTEND] Searching job numbers for:', value);
        const jobNumbers = await jobsAPI.searchJobNumbers(value);
        console.log('🔍 [FRONTEND] Received jobNumbers:', jobNumbers);
        
        if (jobNumbers && jobNumbers.length > 0) {
          // Populate dropdown
          jobNumberDropdown.innerHTML = '';
          jobNumbers.forEach(jobNum => {
            const item = document.createElement('div');
            item.style.padding = '10px 14px';
            item.style.cursor = 'pointer';
            item.style.borderBottom = '1px solid rgba(55, 65, 81, 0.5)';
            item.style.color = '#f9fafb';
            item.style.fontSize = '0.9rem';
            item.textContent = jobNum;
            item.addEventListener('mouseenter', () => {
              item.style.backgroundColor = 'rgba(79, 70, 229, 0.3)';
            });
            item.addEventListener('mouseleave', () => {
              item.style.backgroundColor = 'transparent';
            });
            item.addEventListener('click', () => {
              jobNumberInput.value = jobNum;
              jobNumberDropdown.style.display = 'none';
              // Set current job number
              currentJobNumber = jobNum;
              // Trigger job details fetch
              fetchJobDetails(jobNum);
            });
            jobNumberDropdown.appendChild(item);
          });
          jobNumberDropdown.style.display = 'block';
          console.log('🔍 [FRONTEND] Dropdown populated with', jobNumbers.length, 'items');
        } else {
          console.log('🔍 [FRONTEND] No job numbers found or empty array');
          jobNumberDropdown.style.display = 'none';
        }
      } catch (error) {
        console.error('❌ [FRONTEND] Error searching job numbers:', error);
        jobNumberDropdown.style.display = 'none';
      }
    }, 300);
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const jobSearchPanel = jobSearchForm.closest('.panel');
    if (jobSearchPanel && !jobSearchPanel.contains(e.target)) {
      jobNumberDropdown.style.display = 'none';
    }
  });

  // Function to fetch job details and audio files
  async function fetchJobDetails(jobNumber) {
    try {
      // Set current job number
      currentJobNumber = jobNumber;
      
      const response = await jobsAPI.getJobDetails(jobNumber);
      console.log('📦 [FRONTEND] Received job details:', response);
      
      // Response now contains { jobs: [...], count: N }
      const jobs = response.jobs || [];
      
      if (jobs.length === 0) {
        throw new Error('No job details found');
      }
      
      // Store all job numbers for audio fetching
      currentJobNumbers = jobs.map(job => job.jobNumber).filter(Boolean);
      console.log('📦 [FRONTEND] All job numbers:', currentJobNumbers);
      
      // Show/hide selection controls based on job count
      const jobSelectionControls = document.getElementById('jobSelectionControls');
      const showCheckboxes = jobs.length > 1;
      
      if (showCheckboxes) {
        jobSelectionControls.style.display = 'flex';
      } else {
        jobSelectionControls.style.display = 'none';
      }
      
      // Populate the jobs list with collapsible cards
      const jobsList = document.getElementById('jobsList');
      jobsList.innerHTML = '';
      
      jobs.forEach((job, index) => {
        const jobCard = createJobCard(job, index, showCheckboxes);
        jobsList.appendChild(jobCard);
      });
      
      // Setup select all / unselect all buttons
      if (showCheckboxes) {
        setupSelectionControls();
      }
      
      // Show job details section
      document.getElementById('jobDetailsSection').style.display = 'block';
      document.getElementById('voiceNoteSection').style.display = 'block';
      
      // Fetch existing audio files for all jobs
      await fetchExistingAudioFiles(jobNumber);
      
    } catch (error) {
      console.error('Error fetching job details:', error);
      
      jobSearchError.textContent = error.message || 'Failed to fetch job details.';
      jobSearchError.className = 'inline-warning';
      jobSearchError.style.display = 'block';
    }
  }
  
  // Function to create a collapsible job card
  function createJobCard(job, index, showCheckbox) {
    const card = document.createElement('div');
    card.className = 'job-card';
    card.dataset.jobNumber = job.jobNumber || '';
    if (index === 0) {
      card.classList.add('expanded'); // First card expanded by default
    }
    
    // Card Header
    const header = document.createElement('div');
    header.className = 'job-card-header';
    
    // Create checkbox HTML if needed
    const checkboxHtml = showCheckbox 
      ? `<input type="checkbox" class="job-card-checkbox" checked data-job-number="${job.jobNumber || ''}">`
      : '';
    
    header.innerHTML = `
      <div class="job-card-header-left">
        ${checkboxHtml}
        <div class="job-card-title">
          <span class="job-card-job-number">${job.jobNumber || 'N/A'}</span>
          <span>${job.jobTitle || 'No Title'}</span>
        </div>
      </div>
      <svg class="job-card-toggle" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    `;
    
    // Card Body (collapsible)
    const body = document.createElement('div');
    body.className = 'job-card-body';
    body.innerHTML = `
      <div class="job-card-details-grid">
        <div class="job-card-field">
          <span class="job-card-field-label">Client Name</span>
          <span class="job-card-field-value">${job.clientName || 'N/A'}</span>
        </div>
        <div class="job-card-field">
          <span class="job-card-field-label">Job Number</span>
          <span class="job-card-field-value">${job.jobNumber || 'N/A'}</span>
        </div>
        <div class="job-card-field">
          <span class="job-card-field-label">Job Title</span>
          <span class="job-card-field-value">${job.jobTitle || 'N/A'}</span>
        </div>
        <div class="job-card-field">
          <span class="job-card-field-label">Order Quantity</span>
          <span class="job-card-field-value">${job.orderQuantity?.toLocaleString() || 0}</span>
        </div>
        <div class="job-card-field">
          <span class="job-card-field-label">Product Category</span>
          <span class="job-card-field-value">${job.productCategory || 'N/A'}</span>
        </div>
        <div class="job-card-field">
          <span class="job-card-field-label">Unit Price</span>
          <span class="job-card-field-value">₹${job.unitPrice || 0}</span>
        </div>
        <div class="job-card-field">
          <span class="job-card-field-label">Job Created On</span>
          <span class="job-card-field-value">${job.jobCreatedOn || 'N/A'}</span>
        </div>
      </div>
    `;
    
    // Toggle expand/collapse on header left section click (not on checkbox)
    const headerLeft = header.querySelector('.job-card-header-left');
    const toggle = header.querySelector('.job-card-toggle');
    
    if (showCheckbox) {
      // Prevent checkbox clicks from toggling the card
      const checkbox = header.querySelector('.job-card-checkbox');
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      // Only toggle when clicking the title area (not checkbox)
      headerLeft.addEventListener('click', (e) => {
        if (!e.target.classList.contains('job-card-checkbox')) {
          card.classList.toggle('expanded');
        }
      });
    } else {
      // If no checkbox, entire header left can toggle
      headerLeft.addEventListener('click', () => {
        card.classList.toggle('expanded');
      });
    }
    
    // Toggle icon click
    toggle.addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
    
    card.appendChild(header);
    card.appendChild(body);
    
    return card;
  }
  
  // Setup select all / unselect all controls
  function setupSelectionControls() {
    const selectAllBtn = document.getElementById('selectAllJobsBtn');
    const unselectAllBtn = document.getElementById('unselectAllJobsBtn');
    
    // Remove existing listeners (if any)
    const newSelectAllBtn = selectAllBtn.cloneNode(true);
    const newUnselectAllBtn = unselectAllBtn.cloneNode(true);
    selectAllBtn.replaceWith(newSelectAllBtn);
    unselectAllBtn.replaceWith(newUnselectAllBtn);
    
    // Select all
    newSelectAllBtn.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('.job-card-checkbox');
      checkboxes.forEach(cb => cb.checked = true);
    });
    
    // Unselect all
    newUnselectAllBtn.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('.job-card-checkbox');
      checkboxes.forEach(cb => cb.checked = false);
    });
  }
  
  // Get selected job numbers
  function getSelectedJobNumbers() {
    const checkboxes = document.querySelectorAll('.job-card-checkbox');
    if (checkboxes.length === 0) {
      // No checkboxes means single job, get from dataset
      const jobCard = document.querySelector('.job-card');
      return jobCard ? [jobCard.dataset.jobNumber] : [];
    }
    
    const selectedJobs = [];
    checkboxes.forEach(cb => {
      if (cb.checked) {
        selectedJobs.push(cb.dataset.jobNumber);
      }
    });
    return selectedJobs;
  }

  // Function to fetch existing audio files for all jobs
  async function fetchExistingAudioFiles(mainJobNumber) {
    try {
      const userId = localStorage.getItem('userId');
      const existingAudioSection = document.getElementById('existingAudioSection');
      const commonAudioSection = document.getElementById('commonAudioSection');
      const commonAudioList = document.getElementById('commonAudioList');
      const jobSpecificAudioSection = document.getElementById('jobSpecificAudioSection');
      const jobSpecificAudioList = document.getElementById('jobSpecificAudioList');
      
      let hasAnyAudio = false;
      
      // Fetch audio for ALL job numbers
      console.log('🎵 [FRONTEND] Fetching audio for all jobs:', currentJobNumbers);
      const allJobAudioMap = new Map(); // jobNumber -> audioFiles[]
      
      for (const jobNumber of currentJobNumbers) {
        const audioFiles = await voiceNoteToolAPI.getAudioByJobNumber(jobNumber, userId);
        if (audioFiles && audioFiles.length > 0) {
          allJobAudioMap.set(jobNumber, audioFiles);
          hasAnyAudio = true;
        }
      }
      
      if (!hasAnyAudio) {
        existingAudioSection.style.display = 'none';
        return;
      }
      
      // Identify common vs job-specific audio files using audioId
      // Common audio = audio files with the same audioId in multiple (2+) jobs
      // Job-specific = audio files that exist in only one job
      
      const audioIdMap = new Map(); // audioId -> { audioFile, jobNumbers[] }
      
      // Group audio files by audioId and track which jobs they appear in
      allJobAudioMap.forEach((audioFiles, jobNumber) => {
        audioFiles.forEach(audioFile => {
          const audioId = audioFile.audioId;
          
          if (!audioId) {
            // Skip audio files without audioId (legacy data)
            console.warn('⚠️ [FRONTEND] Audio file without audioId found:', audioFile._id);
            return;
          }
          
          if (!audioIdMap.has(audioId)) {
            audioIdMap.set(audioId, {
              audioFile: audioFile,
              jobNumbers: []
            });
          }
          audioIdMap.get(audioId).jobNumbers.push(jobNumber);
        });
      });
      
      // Separate common and job-specific audio based on audioId
      const commonAudioFiles = [];
      const jobSpecificAudioMap = new Map(); // jobNumber -> audioFiles[]
      
      audioIdMap.forEach((data) => {
        if (data.jobNumbers.length >= 2) {
          // Common audio (same audioId appears in 2+ jobs)
          commonAudioFiles.push({
            ...data.audioFile,
            jobNumbers: data.jobNumbers
          });
          console.log(`✅ [FRONTEND] Common audio found - audioId: ${data.audioFile.audioId}, jobs: ${data.jobNumbers.join(', ')}`);
        } else {
          // Job-specific audio (audioId appears in only 1 job)
          const jobNumber = data.jobNumbers[0];
          if (!jobSpecificAudioMap.has(jobNumber)) {
            jobSpecificAudioMap.set(jobNumber, []);
          }
          jobSpecificAudioMap.get(jobNumber).push(data.audioFile);
        }
      });
      
      // 1. Display common audio files
      if (commonAudioFiles.length > 0) {
        commonAudioList.innerHTML = '';
        
        commonAudioFiles.forEach((audioFile, index) => {
          const audioItem = createAudioItem(audioFile, index, null, audioFile.jobNumbers);
          commonAudioList.appendChild(audioItem);
        });
        
        commonAudioSection.style.display = 'block';
      } else {
        commonAudioSection.style.display = 'none';
      }
      
      // 2. Display job-specific audio files
      if (jobSpecificAudioMap.size > 0) {
        jobSpecificAudioList.innerHTML = '';
        
        // Sort by job number for consistent display
        const sortedJobNumbers = Array.from(jobSpecificAudioMap.keys()).sort();
        
        sortedJobNumbers.forEach(jobNumber => {
          const jobAudioFiles = jobSpecificAudioMap.get(jobNumber);
          
          // Create a job group
          const jobGroup = document.createElement('div');
          jobGroup.className = 'job-audio-group';
          
          // Job group header
          const groupHeader = document.createElement('div');
          groupHeader.className = 'job-audio-group-header';
          groupHeader.innerHTML = `
            <span class="job-audio-group-job-number">${jobNumber}</span>
            <span class="job-audio-group-count">(${jobAudioFiles.length} file${jobAudioFiles.length > 1 ? 's' : ''})</span>
          `;
          jobGroup.appendChild(groupHeader);
          
          // Job group list
          const groupList = document.createElement('div');
          groupList.className = 'job-audio-group-list';
          
          jobAudioFiles.forEach((audioFile, index) => {
            const audioItem = createAudioItem(audioFile, index, jobNumber);
            groupList.appendChild(audioItem);
          });
          
          jobGroup.appendChild(groupList);
          jobSpecificAudioList.appendChild(jobGroup);
        });
        
        jobSpecificAudioSection.style.display = 'block';
      } else {
        jobSpecificAudioSection.style.display = 'none';
      }
      
      // Show main section (collapsed by default)
      existingAudioSection.style.display = 'block';
      existingAudioSection.classList.add('collapsed');
      
      // Setup toggle handler (only once)
      if (!existingAudioSection.dataset.toggleSetup) {
        setupExistingAudioToggle();
        existingAudioSection.dataset.toggleSetup = 'true';
      }
      
      // Apply blinking animation to draw attention
      existingAudioSection.classList.add('blink-attention');
      
      // Remove blink animation after it completes (3 cycles × 1.5s = 4.5s)
      setTimeout(() => {
        existingAudioSection.classList.remove('blink-attention');
      }, 4500);
      
    } catch (error) {
      console.error('Error fetching existing audio files:', error);
      document.getElementById('existingAudioSection').style.display = 'none';
    }
  }
  
  // Toggle existing audio section collapse/expand
  function setupExistingAudioToggle() {
    const header = document.getElementById('existingAudioHeader');
    const section = document.getElementById('existingAudioSection');
    
    if (!header || !section) {
      console.log('❌ [TOGGLE] Header or section not found');
      return;
    }
    
    console.log('✅ [TOGGLE] Setting up existing audio toggle');
    
    // Remove any existing listeners by cloning
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);
    
    // Add click listener to the new header
    newHeader.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      
      const isCurrentlyCollapsed = section.classList.contains('collapsed');
      
      console.log(`🔄 [TOGGLE] Toggling section. Currently collapsed: ${isCurrentlyCollapsed}`);
      
      section.classList.toggle('collapsed');
      
      // Stop blinking when user manually expands
      if (!section.classList.contains('collapsed')) {
        console.log('📂 [TOGGLE] Section expanded - stopping blink');
        section.classList.remove('blink-attention');
      } else {
        console.log('📁 [TOGGLE] Section collapsed');
      }
    });
  }
  
  // Helper function to create an audio item
  function createAudioItem(audioFile, index, jobNumber, commonJobNumbers = null) {
    const audioItem = document.createElement('div');
    audioItem.className = 'existing-audio-item';
    
    // For common audio, show all job numbers it applies to
    let jobBadgeHtml = '';
    if (commonJobNumbers && commonJobNumbers.length > 0) {
      const jobsList = commonJobNumbers.join(', ');
      jobBadgeHtml = `<span class="audio-item-common-badge" title="Present in: ${jobsList}">All Jobs (${commonJobNumbers.length})</span>`;
    } else if (jobNumber) {
      // For job-specific audio, show the specific job number
      jobBadgeHtml = `<span class="audio-item-job-badge">${jobNumber}</span>`;
    }
    
    audioItem.innerHTML = `
      <div class="audio-item-header">
        <div class="audio-item-info">
          <span class="audio-item-number">#${index + 1}</span>
          ${jobBadgeHtml}
          <span class="audio-item-dept">${audioFile.toDepartment}</span>
          <span class="audio-item-date">${new Date(audioFile.createdAt).toLocaleString()}</span>
          ${audioFile.summary ? `<span class="audio-item-summary-indicator" title="${audioFile.summary}">📝</span>` : ''}
        </div>
        <button class="audio-item-play-btn" data-audio-id="${audioFile._id}">
          <span class="btn-icon">▶️</span>
          <span>Play</span>
        </button>
      </div>
      ${audioFile.summary ? `<div class="audio-item-summary">${audioFile.summary}</div>` : ''}
      <audio class="existing-audio-player" id="existingAudio_${audioFile._id}" style="display: none; width: 100%; margin-top: 10px;"></audio>
    `;
    
    // Add play button event listener
    const playBtn = audioItem.querySelector('.audio-item-play-btn');
    playBtn.addEventListener('click', async () => {
      const audioId = playBtn.getAttribute('data-audio-id');
      await playExistingAudio(audioId, playBtn);
    });
    
    return audioItem;
  }

  // Function to play existing audio
  async function playExistingAudio(audioId, playBtn) {
    try {
      const audioPlayer = document.getElementById(`existingAudio_${audioId}`);
      if (!audioPlayer) return;
      
      // If already loaded, just toggle play/pause
      if (audioPlayer.src) {
        if (audioPlayer.paused) {
          audioPlayer.play();
          playBtn.innerHTML = '<span class="btn-icon">⏸️</span><span>Pause</span>';
        } else {
          audioPlayer.pause();
          playBtn.innerHTML = '<span class="btn-icon">▶️</span><span>Play</span>';
        }
        return;
      }
      
      // Load audio
      playBtn.disabled = true;
      playBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Loading...</span>';
      
      const audioData = await voiceNoteToolAPI.getAudioById(audioId);
      
      // Convert base64 to blob URL
      const binaryString = atob(audioData.audioBlob);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: audioData.audioMimeType });
      const url = URL.createObjectURL(blob);
      
      audioPlayer.src = url;
      audioPlayer.style.display = 'block';
      audioPlayer.play();
      
      playBtn.disabled = false;
      playBtn.innerHTML = '<span class="btn-icon">⏸️</span><span>Pause</span>';
      
      // Handle audio events
      audioPlayer.onpause = () => {
        playBtn.innerHTML = '<span class="btn-icon">▶️</span><span>Play</span>';
      };
      
      audioPlayer.onended = () => {
        playBtn.innerHTML = '<span class="btn-icon">▶️</span><span>Play</span>';
      };
      
    } catch (error) {
      console.error('Error playing audio:', error);
      playBtn.disabled = false;
      playBtn.innerHTML = '<span class="btn-icon">▶️</span><span>Play</span>';
      jobSearchError.textContent = 'Error loading audio file.';
      jobSearchError.className = 'inline-warning';
      jobSearchError.style.display = 'block';
    }
  }

  // Prevent form submission (no search button needed - auto-search on input)
  jobSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
  });


  // Audio Recording Functionality
  let mediaRecorder = null;
  let audioChunks = [];
  let audioBlob = null;
  let audioUrl = null;
  let currentAudioId = null; // Unique ID for the current audio recording
  let recordingTimer = null;
  let recordingStartTime = null;
  let maxRecordingTime = 120000; // 2 minutes in milliseconds
  let autoStopTimeout = null;
  let audioSummary = null; // Store AI analysis summary

  const recordBtn = document.getElementById('recordBtn');
  const stopBtn = document.getElementById('stopBtn');
  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const saveAudioBtn = document.getElementById('saveAudioBtn');
  const audioPlayer = document.getElementById('audioPlayer');
  const audioPlayback = document.getElementById('audioPlayback');
  const recordingStatus = document.getElementById('recordingStatus');
  const audioSummaryDiv = document.getElementById('audioSummary');
  const audioSummaryContent = document.getElementById('audioSummaryContent');

  // Function to compress audio blob
  async function compressAudio(blob) {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create offline context for compression (lower sample rate)
      const sampleRate = 16000; // Reduce from 48000 to 16000 (good enough for voice)
      const numberOfChannels = 1; // Mono instead of stereo
      const offlineContext = new OfflineAudioContext(
        numberOfChannels,
        audioBuffer.duration * sampleRate,
        sampleRate
      );
      
      // Create buffer source
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      // Render compressed audio
      const compressedBuffer = await offlineContext.startRendering();
      
      // Convert to WAV format (smaller than webm for voice)
      const wavBlob = await bufferToWave(compressedBuffer, sampleRate);
      
      console.log('🗜️ Original size:', Math.round(blob.size / 1024), 'KB');
      console.log('🗜️ Compressed size:', Math.round(wavBlob.size / 1024), 'KB');
      console.log('🗜️ Compression ratio:', Math.round((1 - wavBlob.size / blob.size) * 100) + '%');
      
      return wavBlob;
    } catch (error) {
      console.error('Error compressing audio:', error);
      // Return original blob if compression fails
      return blob;
    }
  }

  // Function to convert audio buffer to WAV
  function bufferToWave(abuffer, sampleRate) {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Write interleaved data
    for (let i = 0; i < abuffer.numberOfChannels; i++) {
      channels.push(abuffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([buffer], { type: 'audio/wav' });

    function setUint16(data) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  }

  // Record button
  if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
      // Check if department is selected before starting recording
      const toDepartment = document.getElementById('toDepartment');
      if (!toDepartment || !toDepartment.value) {
        alert('Please select a department before recording audio.');
        toDepartment?.focus();
        return;
      }

      // Check if job number is selected
      // Use currentJobNumber if set, otherwise check the input value
      const jobNumber = currentJobNumber || jobNumberInput?.value?.trim();
      if (!jobNumber) {
        alert('Please select a job number first.');
        jobNumberInput?.focus();
        return;
      }
      
      // Update currentJobNumber if it wasn't set
      if (!currentJobNumber && jobNumber) {
        currentJobNumber = jobNumber;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Use audio/webm with opus codec for better compression
        const options = { mimeType: 'audio/webm;codecs=opus' };
        
        // Fallback if opus not supported
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'audio/webm';
        }
        
        mediaRecorder = new MediaRecorder(stream, options);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const originalBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
          
          // Generate unique audioId for this recording
          currentAudioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log('🎵 [FRONTEND] Generated audioId:', currentAudioId);
          
          // Show compressing message
          recordingStatus.textContent = 'Compressing audio...';
          
          // Compress audio
          audioBlob = await compressAudio(originalBlob);
          audioUrl = URL.createObjectURL(audioBlob);
          audioPlayer.src = audioUrl;
          
          // Show playback controls
          audioPlayback.style.display = 'block';
          recordBtn.style.display = 'none';
          stopBtn.style.display = 'none';
          playBtn.style.display = 'inline-flex';
          pauseBtn.style.display = 'none';
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          
          // Clear recording timer
          if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
          }
          if (autoStopTimeout) {
            clearTimeout(autoStopTimeout);
            autoStopTimeout = null;
          }
          
          // Analyze audio with OpenAI
          recordingStatus.classList.add('analyzing');
          recordingStatus.textContent = '🤖 Analyzing audio with AI...';
          
          try {
            const toDepartment = document.getElementById('toDepartment');
            if (!toDepartment || !toDepartment.value) {
              recordingStatus.classList.remove('analyzing');
              recordingStatus.textContent = '⚠️ Please select a department first';
              recordingStatus.className = 'recording-status warning';
              return;
            }
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Audio = reader.result.split(',')[1];
              
              try {
                const analysisResult = await voiceNoteToolAPI.analyzeAudio({
                  audioBlob: base64Audio,
                  audioMimeType: audioBlob.type,
                  toDepartment: toDepartment.value
                });
                
                // Store summary for saving
                audioSummary = analysisResult.analysis;
                
                // Display analysis result in summary area
                recordingStatus.classList.remove('analyzing', 'recording');
                recordingStatus.className = 'recording-status success';
                recordingStatus.textContent = '✅ AI Analysis Complete';
                
                // Display summary in the summary area
                audioSummaryContent.innerHTML = `<div style="white-space: pre-wrap; line-height: 1.6;">${analysisResult.analysis}</div>`;
                audioSummaryDiv.style.display = 'block';
                
                console.log('✅ Analysis:', analysisResult);
              } catch (error) {
                console.error('Error analyzing audio:', error);
                recordingStatus.classList.remove('analyzing', 'recording');
                recordingStatus.className = 'recording-status warning';
                recordingStatus.textContent = '⚠️ AI analysis failed: ' + (error.message || 'Unknown error');
              }
            };
            reader.readAsDataURL(audioBlob);
          } catch (error) {
            console.error('Error preparing audio for analysis:', error);
            recordingStatus.classList.remove('analyzing', 'recording');
            recordingStatus.className = 'recording-status warning';
            recordingStatus.textContent = '⚠️ Error preparing audio for analysis';
          }
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();
        
        // Auto-stop after 2 minutes
        autoStopTimeout = setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            jobSearchError.textContent = 'Recording stopped automatically (2 minute limit reached).';
            jobSearchError.className = 'inline-info';
            jobSearchError.style.display = 'block';
            setTimeout(() => {
              jobSearchError.style.display = 'none';
            }, 3000);
          }
        }, maxRecordingTime);
        
        // Show stop button
        recordBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        
        // Show recording status
        recordingStatus.classList.add('recording');
        recordingStatus.textContent = 'Recording... 00:00 / 02:00';
        
        // Update recording timer
        recordingTimer = setInterval(() => {
          const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
          const remaining = Math.floor((maxRecordingTime - (Date.now() - recordingStartTime)) / 1000);
          const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
          const seconds = (elapsed % 60).toString().padStart(2, '0');
          const remainingMinutes = Math.floor(remaining / 60).toString().padStart(2, '0');
          const remainingSeconds = (remaining % 60).toString().padStart(2, '0');
          recordingStatus.textContent = `Recording... ${minutes}:${seconds} / ${remainingMinutes}:${remainingSeconds} remaining`;
        }, 1000);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        jobSearchError.textContent = 'Error accessing microphone. Please check permissions.';
        jobSearchError.className = 'inline-warning';
        jobSearchError.style.display = 'block';
      }
    });
  }

  // Stop button
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        // Clear auto-stop timeout
        if (autoStopTimeout) {
          clearTimeout(autoStopTimeout);
          autoStopTimeout = null;
        }
      }
    });
  }

  // Play button
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (audioPlayer) {
        audioPlayer.play();
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-flex';
      }
    });
  }

  // Pause button
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (audioPlayer) {
        audioPlayer.pause();
        playBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
      }
    });
  }

  // Audio player events
  if (audioPlayer) {
    audioPlayer.addEventListener('play', () => {
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';
    });

    audioPlayer.addEventListener('pause', () => {
      playBtn.style.display = 'inline-flex';
      pauseBtn.style.display = 'none';
    });

    audioPlayer.addEventListener('ended', () => {
      playBtn.style.display = 'inline-flex';
      pauseBtn.style.display = 'none';
    });
  }

  // Delete button
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      // Clear audio
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        audioUrl = null;
      }
      audioBlob = null;
      audioChunks = [];
      audioSummary = null; // Clear summary
      currentAudioId = null; // Clear audio ID
      
      // Reset UI
      audioPlayback.style.display = 'none';
      recordBtn.style.display = 'inline-flex';
      stopBtn.style.display = 'none';
      playBtn.style.display = 'inline-flex';
      pauseBtn.style.display = 'none';
      
      // Hide summary
      if (audioSummaryDiv) {
        audioSummaryDiv.style.display = 'none';
      }
      if (audioSummaryContent) {
        audioSummaryContent.innerHTML = '';
      }
      if (recordingStatus) {
        recordingStatus.textContent = '';
        recordingStatus.className = 'recording-status';
      }
      
      if (audioPlayer) {
        audioPlayer.src = '';
        audioPlayer.pause();
      }
    });
  }

  // Save audio button (placeholder - user will specify functionality later)
  if (saveAudioBtn) {
    saveAudioBtn.addEventListener('click', async () => {
      if (!audioBlob) {
        jobSearchError.textContent = 'No audio recorded. Please record audio first.';
        jobSearchError.className = 'inline-warning';
        jobSearchError.style.display = 'block';
        return;
      }

      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1]; // Remove data:audio/webm;base64, prefix
        
        try {
          saveAudioBtn.disabled = true;
          saveAudioBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Saving...</span>';

          const username = localStorage.getItem('username');
          const userId = localStorage.getItem('userId');
          const toDepartment = document.getElementById('toDepartment').value;
          const selectedJobNumbers = getSelectedJobNumbers();

          if (selectedJobNumbers.length === 0) {
            jobSearchError.textContent = 'Please select at least one job.';
            jobSearchError.className = 'inline-warning';
            jobSearchError.style.display = 'block';
            saveAudioBtn.disabled = false;
            saveAudioBtn.innerHTML = '<span class="btn-icon">💾</span><span>Save</span>';
            return;
          }

          if (!toDepartment) {
            jobSearchError.textContent = 'Please select a department.';
            jobSearchError.className = 'inline-warning';
            jobSearchError.style.display = 'block';
            saveAudioBtn.disabled = false;
            saveAudioBtn.innerHTML = '<span class="btn-icon">💾</span><span>Save</span>';
            return;
          }

          if (!userId) {
            jobSearchError.textContent = 'User ID not found. Please login again.';
            jobSearchError.className = 'inline-warning';
            jobSearchError.style.display = 'block';
            saveAudioBtn.disabled = false;
            saveAudioBtn.innerHTML = '<span class="btn-icon">💾</span><span>Save</span>';
            return;
          }

          console.log(`💾 [FRONTEND] Saving audio for ${selectedJobNumbers.length} job(s):`, selectedJobNumbers);

          // Save audio for each selected job (use same audioId for all)
          let successCount = 0;
          let errorCount = 0;
          
          console.log(`💾 [FRONTEND] Using audioId for all jobs: ${currentAudioId}`);
          
          for (const jobNumber of selectedJobNumbers) {
            try {
              const audioData = {
                jobNumber,
                toDepartment,
                audioBlob: base64Audio,
                audioMimeType: audioBlob.type,
                createdBy: username,
                userId: userId,
                summary: audioSummary || '',
                audioId: currentAudioId // Same audioId for all selected jobs
              };

              await voiceNoteToolAPI.saveAudio(audioData);
              successCount++;
              console.log(`✅ [FRONTEND] Saved audio for job: ${jobNumber}`);
            } catch (error) {
              console.error(`❌ [FRONTEND] Failed to save audio for job ${jobNumber}:`, error);
              errorCount++;
            }
          }

          // Show success message
          if (successCount > 0) {
            const message = successCount === 1 
              ? 'Audio saved successfully!' 
              : `Audio saved successfully for ${successCount} job(s)!`;
            jobSearchError.textContent = errorCount > 0 
              ? `${message} (${errorCount} failed)` 
              : message;
            jobSearchError.className = 'inline-success';
            jobSearchError.style.display = 'block';
          } else {
            jobSearchError.textContent = 'Failed to save audio for all jobs.';
            jobSearchError.className = 'inline-warning';
            jobSearchError.style.display = 'block';
            saveAudioBtn.disabled = false;
            saveAudioBtn.innerHTML = '<span class="btn-icon">💾</span><span>Save</span>';
            return;
          }

          // Clear audio and reset UI
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            audioUrl = null;
          }
          audioBlob = null;
          audioChunks = [];
          audioSummary = null; // Clear summary
          currentAudioId = null; // Clear audio ID
          audioPlayback.style.display = 'none';
          recordBtn.style.display = 'inline-flex';
          
          // Hide summary
          if (audioSummaryDiv) {
            audioSummaryDiv.style.display = 'none';
          }
          if (audioSummaryContent) {
            audioSummaryContent.innerHTML = '';
          }
          if (recordingStatus) {
            recordingStatus.textContent = '';
            recordingStatus.className = 'recording-status';
          }
          
          // Clear department field
          const toDepartmentField = document.getElementById('toDepartment');
          if (toDepartmentField) {
            toDepartmentField.value = '';
          }
          
          // Scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          // Refresh existing audio files list
          if (currentJobNumber) {
            await fetchExistingAudioFiles(currentJobNumber);
          }

          setTimeout(() => {
            jobSearchError.style.display = 'none';
          }, 2000);
        } catch (error) {
          console.error('Error saving audio:', error);
          jobSearchError.textContent = error.message || 'Failed to save audio.';
          jobSearchError.className = 'inline-warning';
          jobSearchError.style.display = 'block';
        } finally {
          saveAudioBtn.disabled = false;
          saveAudioBtn.innerHTML = '<span class="btn-icon">💾</span><span>Save</span>';
        }
      };
      reader.readAsDataURL(audioBlob);
    });
  }
}
