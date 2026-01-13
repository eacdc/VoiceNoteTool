# Audio Files Organization Feature - Voice Note Tool

## Overview

The Existing Audio Files section has been reorganized to separate common audio files (for the main searched job) from job-specific audio files (for related jobs). This provides better organization when multiple similar jobs are returned.

## Changes Made

### 1. HTML Structure Update

**File**: `Voice Note Tool/main.html`

**Old Structure**:
```html
<section id="existingAudioSection">
  <div id="existingAudioList">
    <!-- All audio files mixed together -->
  </div>
</section>
```

**New Structure**:
```html
<section id="existingAudioSection">
  <!-- Common Audio Files (Main Searched Job) -->
  <div id="commonAudioSection">
    <h4 class="audio-subsection-title">Common Audio Files (All Jobs)</h4>
    <div id="commonAudioList"></div>
  </div>

  <!-- Job-Specific Audio Files (Other Jobs) -->
  <div id="jobSpecificAudioSection">
    <h4 class="audio-subsection-title">Job-Specific Audio Files</h4>
    <div id="jobSpecificAudioList"></div>
  </div>
</section>
```

### 2. CSS Styling Updates

**File**: `Voice Note Tool/styles.css`

**New Styles Added**:

```css
/* Subsection titles */
.audio-subsection-title

/* Job audio groups */
.job-audio-group
.job-audio-group-header
.job-audio-group-job-number
.job-audio-group-count
.job-audio-group-list

/* Audio item enhancements */
.audio-item-job-badge          /* Job number badge */
.audio-item-summary            /* Summary display */
.audio-item-summary-indicator  /* Summary icon (📝) */
```

### 3. JavaScript Logic Updates

**File**: `Voice Note Tool/script.js`

#### New Global Variable
```javascript
let currentJobNumbers = []; // Store all job numbers from batch query
```

#### Updated Functions

##### `fetchJobDetails(jobNumber)` - Enhanced
**New Logic**:
- Extracts all job numbers from batch API response
- Stores them in `currentJobNumbers` array
- Passes all job numbers to audio fetching logic

##### `fetchExistingAudioFiles(mainJobNumber)` - Completely Rewritten
**New Features**:

1. **Common Audio Section**:
   - Fetches audio for the main searched job number
   - Displays in "Common Audio Files (All Jobs)" section
   - Hidden if no audio files exist

2. **Job-Specific Audio Section**:
   - Iterates through all other job numbers (excluding main job)
   - Fetches audio for each job individually
   - Groups audio files by job number
   - Shows job number badge with file count
   - Hidden if no audio files exist

3. **Smart Display**:
   - Only shows main section if any audio exists
   - Automatically hides empty subsections
   - Maintains existing playback functionality

##### `createAudioItem(audioFile, index, jobNumber)` - New Helper Function
**Purpose**: Creates a reusable audio item element

**Features**:
- Accepts optional `jobNumber` parameter
- Displays job number badge if provided (for job-specific section)
- Shows audio summary if available
- Adds play button with event listener
- Returns fully constructed DOM element

**Audio Item Structure**:
```html
<div class="existing-audio-item">
  <div class="audio-item-header">
    <div class="audio-item-info">
      <span>#1</span>
      <span class="audio-item-job-badge">J04442_25_26</span>  <!-- If job-specific -->
      <span>Printing</span>
      <span>1/4/2026, 10:30 AM</span>
      <span title="Summary...">📝</span>  <!-- If has summary -->
    </div>
    <button>Play</button>
  </div>
  <div class="audio-item-summary">Summary text here...</div>  <!-- If has summary -->
  <audio></audio>
</div>
```

## User Experience

### Before (Old Behavior)
- All audio files shown in a single list
- No distinction between jobs
- Harder to find relevant audio when multiple jobs exist

### After (New Behavior)

#### Single Job Scenario
```
📁 Existing Audio Files
  └─ Common Audio Files (All Jobs)
      ├─ #1 - Printing - 1/4/2026, 10:30 AM 📝
      └─ #2 - Sales - 1/4/2026, 11:00 AM
```

#### Multiple Jobs Scenario
```
📁 Existing Audio Files
  ├─ Common Audio Files (All Jobs)
  │   ├─ #1 - Printing - 1/4/2026, 10:30 AM 📝
  │   └─ #2 - Sales - 1/4/2026, 11:00 AM
  │
  └─ Job-Specific Audio Files
      ├─ 📋 J04442_25_26 (2 files)
      │   ├─ #1 - Printing - 1/4/2026, 9:00 AM
      │   └─ #2 - Post Printing - 1/4/2026, 9:30 AM
      │
      └─ 📋 J04444_25_26 (1 file)
          └─ #1 - Packing and Dispatch - 1/4/2026, 12:00 PM
```

## Features

### 1. Common Audio Files Section
- Shows audio files for the **main searched job** number
- Labeled as "Common Audio Files (All Jobs)"
- Visible only if audio files exist
- No job number badge (since it's the main job)

### 2. Job-Specific Audio Section
- Shows audio files for **all other related jobs**
- Grouped by job number
- Each group shows:
  - Job number (with accent color)
  - File count: "(2 files)"
  - List of audio files
- Job number badge on each audio item
- Visible only if any related jobs have audio

### 3. Audio Item Enhancements
- **Job Badge**: Shows job number (only in job-specific section)
- **Summary Display**: Full summary shown below audio header
- **Summary Indicator**: 📝 icon with tooltip on hover
- **Playback**: Unchanged - works as before

### 4. Smart Visibility
- Main section hidden if no audio files at all
- Common section hidden if main job has no audio
- Job-specific section hidden if no other jobs have audio
- Individual job groups only shown if they have audio

## Technical Details

### Data Flow

1. **Job Search**:
   ```
   User searches J04443_25_26
   ↓
   Backend returns 3 similar jobs:
   - J04442_25_26
   - J04443_25_26 (main)
   - J04444_25_26
   ```

2. **Audio Fetching**:
   ```
   Fetch audio for J04443_25_26 (main) → Common Audio
   Fetch audio for J04442_25_26 → Job-Specific
   Fetch audio for J04444_25_26 → Job-Specific
   ```

3. **Display Organization**:
   ```
   Common Audio Files
   └─ Audio for J04443_25_26

   Job-Specific Audio Files
   ├─ J04442_25_26
   │  └─ Audio files for this job
   └─ J04444_25_26
      └─ Audio files for this job
   ```

### API Calls

For each job with audio files:
```javascript
GET /api/voice-note-tool/audio/job/:jobNumber?userId=:userId
```

**Optimization**: Sequential fetching (one job at a time)
- Could be improved with parallel fetching in future

### Error Handling

- Continues fetching other jobs if one fails
- Hides sections gracefully if no audio found
- Logs errors to console without showing to user
- Main section only hidden if ALL fetches fail

## Benefits

1. **Organization**: Clear separation between common and job-specific audio
2. **Clarity**: Easy to identify which audio belongs to which job
3. **Efficiency**: Quickly find relevant instructions for specific jobs
4. **Context**: Job number badge provides immediate context
5. **Scalability**: Works with any number of related jobs

## Example Use Cases

### Use Case 1: Multiple Similar Carton Jobs
```
User searches: J04443_25_26
Returns: 3 similar jobs for same client

Common Audio (J04443_25_26):
- General instruction: "Apply UV coating on all jobs"

Job-Specific:
- J04442_25_26: "Extra glue on flap edge"
- J04444_25_26: "Different die-cutting pattern"
```

### Use Case 2: Single Job
```
User searches: J05000_25_26
Returns: 1 job

Common Audio (J05000_25_26):
- "Rush job - prioritize printing"
- "Client wants sample first"

Job-Specific: (Hidden - no other jobs)
```

### Use Case 3: No Audio Files
```
User searches: J06000_25_26
Returns: 5 similar jobs
None have audio files

Existing Audio Files: (Hidden - no audio at all)
```

## Future Enhancements

Potential improvements:
1. Parallel audio fetching for better performance
2. Collapse/expand job groups
3. Filter by department across all jobs
4. Search within audio summaries
5. Bulk operations (delete, download)
6. Timeline view of audio across jobs
7. Audio file comparison tool
