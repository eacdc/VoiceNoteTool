import { authAPI, jobsAPI, voiceNotesAPI, voiceNoteToolAPI } from './api.js';

// Hide loading indicator when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hideLoader);
} else {
  hideLoader();
}

function hideLoader() {
  const loader = document.getElementById('loading-indicator');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 300);
  }
}

// Global error handler for module loading issues
window.addEventListener('error', (event) => {
  console.error('Global error:', event);
  if (event.message && (event.message.includes('Failed to fetch dynamically imported module') || 
      event.message.includes('Cannot find module') ||
      event.message.includes('Unexpected token'))) {
    showError('Failed to load application files. Please refresh the page or check your internet connection.');
  }
}, true);

// Function to show error message
function showError(message) {
  const loader = document.getElementById('loading-indicator');
  if (loader) {
    loader.innerHTML = `<div style="text-align: center; padding: 20px;"><h2 style="color: #ef4444;">⚠️ Error</h2><p>${message}</p><button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer;">Refresh Page</button></div>`;
    loader.classList.remove('hidden');
  }
}

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

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    
    loginError.style.display = 'none';
    loginError.className = 'inline-warning';

    if (!username) {
      loginError.textContent = 'Please select a username.';
      loginError.style.display = 'block';
      return;
    }

    try {
      const response = await authAPI.login(username);
      
      // Store token and username
      localStorage.setItem('token', response.token || 'dummy-token');
      localStorage.setItem('username', username);
      
      // Redirect to main page
      window.location.href = 'main.html';
    } catch (error) {
      console.error('Login error:', error);
      loginError.textContent = error.message || 'Login failed. Please try again.';
      loginError.style.display = 'block';
    }
  });
}

// Main page functionality
if (!isLoginPage) {
  // Logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = 'index.html';
    });
  }

  // Collapsible panels
  document.querySelectorAll(".panel--collapsible .panel-header").forEach((header) => {
    header.addEventListener("click", () => {
      const panel = header.closest(".panel--collapsible");
      panel?.classList.toggle("panel-collapsed");
    });
  });

  // Job search functionality
  const jobSearchForm = document.getElementById('jobSearchForm');
  const jobSearchError = document.getElementById('jobSearchError');
  const jobNumberInput = document.getElementById('jobNumber');
  const jobNumberDropdown = document.getElementById('jobNumberDropdown');
  let searchTimeout = null;
  let currentJobNumber = null;

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
      const jobDetails = await jobsAPI.getJobDetails(jobNumber);
      
      // Populate job details section
      document.getElementById('clientName').value = jobDetails.clientName || '';
      document.getElementById('jobName').value = jobDetails.jobName || '';
      document.getElementById('orderQuantity').value = jobDetails.orderQuantity || 0;
      document.getElementById('poDate').value = jobDetails.poDate || '-';
      
      // Show job details section
      document.getElementById('jobDetailsSection').style.display = 'block';
      document.getElementById('voiceNoteSection').style.display = 'block';
      
      // Fetch existing audio files for this job
      await fetchExistingAudioFiles(jobNumber);
      
    } catch (error) {
      console.error('Error fetching job details:', error);
      // Fallback to default values if error
      document.getElementById('clientName').value = '';
      document.getElementById('jobName').value = '';
      document.getElementById('orderQuantity').value = 0;
      document.getElementById('poDate').value = '';
      
      jobSearchError.textContent = error.message || 'Failed to fetch job details.';
      jobSearchError.className = 'inline-warning';
      jobSearchError.style.display = 'block';
    }
  }

  // Function to fetch existing audio files
  async function fetchExistingAudioFiles(jobNumber) {
    try {
      const audioFiles = await voiceNoteToolAPI.getAudioByJobNumber(jobNumber);
      const existingAudioList = document.getElementById('existingAudioList');
      const existingAudioSection = document.getElementById('existingAudioSection');
      
      if (audioFiles && audioFiles.length > 0) {
        existingAudioList.innerHTML = '';
        
        audioFiles.forEach((audioFile, index) => {
          const audioItem = document.createElement('div');
          audioItem.className = 'existing-audio-item';
          audioItem.innerHTML = `
            <div class="audio-item-header">
              <div class="audio-item-info">
                <span class="audio-item-number">#${index + 1}</span>
                <span class="audio-item-dept">${audioFile.toDepartment}</span>
                <span class="audio-item-date">${new Date(audioFile.createdAt).toLocaleString()}</span>
                <span class="audio-item-creator">by ${audioFile.createdBy}</span>
              </div>
              <button class="audio-item-play-btn" data-audio-id="${audioFile._id}">
                <span class="btn-icon">▶️</span>
                <span>Play</span>
              </button>
            </div>
            <audio class="existing-audio-player" id="existingAudio_${audioFile._id}" style="display: none; width: 100%; margin-top: 10px;"></audio>
          `;
          existingAudioList.appendChild(audioItem);
        });
        
        existingAudioSection.style.display = 'block';
        
        // Add event listeners for play buttons
        existingAudioList.querySelectorAll('.audio-item-play-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const audioId = btn.getAttribute('data-audio-id');
            await playExistingAudio(audioId, btn);
          });
        });
      } else {
        existingAudioList.innerHTML = '<p class="no-audio-message">No audio files found for this job.</p>';
        existingAudioSection.style.display = 'block';
      }
    } catch (error) {
      console.error('Error fetching existing audio files:', error);
      // Don't show error, just hide the section
      document.getElementById('existingAudioSection').style.display = 'none';
    }
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

  // Job search form submit
  jobSearchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const jobNumber = jobNumberInput.value.trim();
    
    jobSearchError.style.display = 'none';
    jobSearchError.className = 'inline-warning';
    jobNumberDropdown.style.display = 'none';

    if (!jobNumber) {
      jobSearchError.textContent = 'Please enter a job number.';
      jobSearchError.style.display = 'block';
      return;
    }

    try {
      // Store current job number
      currentJobNumber = jobNumber;
      
      // Fetch job details to display
      await fetchJobDetails(jobNumber);
      
      // Show success message
      jobSearchError.textContent = 'Job details loaded successfully!';
      jobSearchError.className = 'inline-success';
      jobSearchError.style.display = 'block';
      
      // Hide success message after 2 seconds
      setTimeout(() => {
        jobSearchError.style.display = 'none';
      }, 2000);
    } catch (error) {
      console.error('Error loading job details:', error);
      // Clear job details if fetch fails
      document.getElementById('clientName').value = '';
      document.getElementById('jobName').value = '';
      document.getElementById('orderQuantity').value = 0;
      document.getElementById('poDate').value = '';
      
      // Hide sections
      document.getElementById('jobDetailsSection').style.display = 'none';
      document.getElementById('voiceNoteSection').style.display = 'none';
      document.getElementById('existingAudioSection').style.display = 'none';
      
      currentJobNumber = null;
      
      jobSearchError.textContent = error.message || 'Failed to load job details.';
      jobSearchError.className = 'inline-warning';
      jobSearchError.style.display = 'block';
    }
  });

  // Save voice note functionality
  const saveVoiceNoteBtn = document.getElementById('saveVoiceNoteBtn');
  if (saveVoiceNoteBtn) {
    saveVoiceNoteBtn.addEventListener('click', async () => {
      const jobNumber = currentJobNumber;
      const toDepartment = document.getElementById('toDepartment').value;

      if (!jobNumber) {
        jobSearchError.textContent = 'Please select a job number first.';
        jobSearchError.className = 'inline-warning';
        jobSearchError.style.display = 'block';
        return;
      }

      if (!toDepartment) {
        jobSearchError.textContent = 'Please select a department.';
        jobSearchError.className = 'inline-warning';
        jobSearchError.style.display = 'block';
        return;
      }

      if (!audioBlob) {
        jobSearchError.textContent = 'Please record audio first.';
        jobSearchError.className = 'inline-warning';
        jobSearchError.style.display = 'block';
        return;
      }

      // Convert blob to base64 and save
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        
        try {
          saveVoiceNoteBtn.disabled = true;
          saveVoiceNoteBtn.textContent = 'Saving...';

          const username = localStorage.getItem('username');
          const audioData = {
            jobNumber,
            toDepartment,
            audioBlob: base64Audio,
            audioMimeType: audioBlob.type,
            createdBy: username
          };

          await voiceNoteToolAPI.saveAudio(audioData);

          // Show success message
          jobSearchError.textContent = 'Voice note saved successfully!';
          jobSearchError.className = 'inline-success';
          jobSearchError.style.display = 'block';

          // Clear audio and reset UI
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            audioUrl = null;
          }
          audioBlob = null;
          audioChunks = [];
          audioPlayback.style.display = 'none';
          recordBtn.style.display = 'inline-flex';

          // Refresh existing audio files list
          if (currentJobNumber) {
            await fetchExistingAudioFiles(currentJobNumber);
          }

          // Hide success message after 2 seconds
          setTimeout(() => {
            jobSearchError.style.display = 'none';
          }, 2000);
        } catch (error) {
          console.error('Error saving voice note:', error);
          jobSearchError.textContent = error.message || 'Failed to save voice note.';
          jobSearchError.className = 'inline-warning';
          jobSearchError.style.display = 'block';
        } finally {
          saveVoiceNoteBtn.disabled = false;
          saveVoiceNoteBtn.textContent = 'Save Voice Note';
        }
      };
      reader.readAsDataURL(audioBlob);
    });
  }

  // Audio Recording Functionality
  let mediaRecorder = null;
  let audioChunks = [];
  let audioBlob = null;
  let audioUrl = null;
  let recordingTimer = null;
  let recordingStartTime = null;

  const recordBtn = document.getElementById('recordBtn');
  const stopBtn = document.getElementById('stopBtn');
  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const saveAudioBtn = document.getElementById('saveAudioBtn');
  const audioPlayer = document.getElementById('audioPlayer');
  const audioPlayback = document.getElementById('audioPlayback');
  const recordingStatus = document.getElementById('recordingStatus');

  // Record button
  if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
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
          
          // Clear recording status
          recordingStatus.classList.remove('recording');
          recordingStatus.textContent = '';
          if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
          }
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();
        
        // Show stop button
        recordBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        
        // Show recording status
        recordingStatus.classList.add('recording');
        recordingStatus.textContent = 'Recording... 00:00';
        
        // Update recording timer
        recordingTimer = setInterval(() => {
          const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
          const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
          const seconds = (elapsed % 60).toString().padStart(2, '0');
          recordingStatus.textContent = `Recording... ${minutes}:${seconds}`;
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
      
      // Reset UI
      audioPlayback.style.display = 'none';
      recordBtn.style.display = 'inline-flex';
      stopBtn.style.display = 'none';
      playBtn.style.display = 'inline-flex';
      pauseBtn.style.display = 'none';
      
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
          const jobNumber = currentJobNumber;
          const toDepartment = document.getElementById('toDepartment').value;

          if (!jobNumber) {
            jobSearchError.textContent = 'Please select a job number first.';
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

          const audioData = {
            jobNumber,
            toDepartment,
            audioBlob: base64Audio,
            audioMimeType: audioBlob.type,
            createdBy: username
          };

          await voiceNoteToolAPI.saveAudio(audioData);

          // Show success message
          jobSearchError.textContent = 'Audio saved successfully!';
          jobSearchError.className = 'inline-success';
          jobSearchError.style.display = 'block';

          // Clear audio and reset UI
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            audioUrl = null;
          }
          audioBlob = null;
          audioChunks = [];
          audioPlayback.style.display = 'none';
          recordBtn.style.display = 'inline-flex';
          
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
