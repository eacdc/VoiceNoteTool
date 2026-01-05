import { authAPI, jobsAPI, voiceNotesAPI, voiceNoteToolAPI } from './api.js';

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
    
    loginError.style.display = 'none';
    loginError.className = 'inline-warning';

    if (!username) {
      loginError.textContent = 'Please select a username.';
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
      const username = localStorage.getItem('username');
      const audioFiles = await voiceNoteToolAPI.getAudioByJobNumber(jobNumber, username);
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

  // Prevent form submission (no search button needed - auto-search on input)
  jobSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
  });


  // Audio Recording Functionality
  let mediaRecorder = null;
  let audioChunks = [];
  let audioBlob = null;
  let audioUrl = null;
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
          audioSummary = null; // Clear summary
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
