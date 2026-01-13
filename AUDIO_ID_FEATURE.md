# Audio ID Feature - Voice Note Tool

## Overview

Added a unique `audioId` field to track audio recordings across multiple jobs. When the same audio is saved to multiple jobs, they all share the same `audioId`, making it easy to identify common audio files.

## Changes Made

### 1. Database Schema Update

**File**: `backend/src/models/Audio.js`

**Added Field**:
```javascript
audioId: {
  type: String,
  required: true,
  index: true  // Index for faster lookups
}
```

**Benefits**:
- Unique identifier for each audio recording
- Indexed for fast queries
- Shared across all jobs when audio is saved to multiple jobs

### 2. Backend API Update

**File**: `backend/src/routes.js`

**Save Audio Endpoint** (`POST /voice-note-tool/audio`):
- Accepts `audioId` in request body
- Falls back to auto-generated ID if not provided
- Stores `audioId` with each recording

```javascript
const { audioId, jobNumber, toDepartment, audioBlob, ... } = req.body;

const newRecording = {
  audioId: audioId || `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  audioBlob: Buffer.from(audioBlob, 'base64'),
  // ... other fields
};
```

**Format**: `audio_1704384000000_abc123xyz`
- Timestamp + random string for uniqueness

### 3. Frontend Updates

**File**: `Voice Note Tool/script.js`

#### New Variable
```javascript
let currentAudioId = null; // Unique ID for the current audio recording
```

#### Generate audioId on Recording Stop
```javascript
mediaRecorder.onstop = async () => {
  // Generate unique audioId
  currentAudioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('🎵 Generated audioId:', currentAudioId);
  
  // ... rest of recording stop logic
};
```

#### Use Same audioId for All Selected Jobs
```javascript
for (const jobNumber of selectedJobNumbers) {
  const audioData = {
    jobNumber,
    toDepartment,
    audioBlob: base64Audio,
    audioMimeType: audioBlob.type,
    createdBy: username,
    userId: userId,
    summary: audioSummary || '',
    audioId: currentAudioId  // ✅ Same audioId for all jobs
  };
  
  await voiceNoteToolAPI.saveAudio(audioData);
}
```

#### Clear audioId on Delete/Reset
```javascript
// After save or delete
currentAudioId = null;
```

### 4. Common Audio Identification Logic

**Old Approach** (Fragile):
```javascript
// Created signature from summary + department + timestamp
const signature = `${summary}_${department}_${timeKey}`;
```
**Problems**:
- Unreliable with similar summaries
- Timestamp window could miss matches
- Failed with empty summaries

**New Approach** (Robust):
```javascript
// Group by audioId
const audioIdMap = new Map();

allJobAudioMap.forEach((audioFiles, jobNumber) => {
  audioFiles.forEach(audioFile => {
    const audioId = audioFile.audioId;
    
    if (!audioIdMap.has(audioId)) {
      audioIdMap.set(audioId, {
        audioFile: audioFile,
        jobNumbers: []
      });
    }
    audioIdMap.get(audioId).jobNumbers.push(jobNumber);
  });
});

// Common audio = audioId appears in 2+ jobs
audioIdMap.forEach((data) => {
  if (data.jobNumbers.length >= 2) {
    commonAudioFiles.push({
      ...data.audioFile,
      jobNumbers: data.jobNumbers
    });
  }
});
```

**Benefits**:
- Precise matching by unique ID
- No false positives/negatives
- Works regardless of summary content
- Fast lookups with indexed field

## How It Works

### Scenario: Save Audio to Multiple Jobs

1. **User records audio**: "Apply UV coating"
2. **Recording stops**: Generate `audioId = "audio_1704384000000_abc123xyz"`
3. **User selects 3 jobs**: J04442_25_26, J04443_25_26, J04444_25_26
4. **User clicks Save**: System saves audio to all 3 jobs with **same audioId**

**Database Result**:
```javascript
// Job: J04442_25_26
{
  jobNumber: "J04442_25_26",
  recordings: [{
    audioId: "audio_1704384000000_abc123xyz",
    summary: "Apply UV coating",
    toDepartment: "printing",
    // ... audio data
  }]
}

// Job: J04443_25_26
{
  jobNumber: "J04443_25_26",
  recordings: [{
    audioId: "audio_1704384000000_abc123xyz",  // ✅ Same ID
    summary: "Apply UV coating",
    toDepartment: "printing",
    // ... audio data
  }]
}

// Job: J04444_25_26
{
  jobNumber: "J04444_25_26",
  recordings: [{
    audioId: "audio_1704384000000_abc123xyz",  // ✅ Same ID
    summary: "Apply UV coating",
    toDepartment: "printing",
    // ... audio data
  }]
}
```

### When Fetching Audio Files

1. Fetch audio for all job numbers
2. Group by `audioId`
3. **Common Audio**: `audioId` appears in 2+ jobs
4. **Job-Specific**: `audioId` appears in only 1 job

**Display**:
```
📁 Existing Audio Files

  📂 Common Audio Files (All Jobs)
     #1 [All Jobs (3)] - Printing - 1/4/2026, 10:30 AM 📝
        audioId: audio_1704384000000_abc123xyz
        Jobs: J04442_25_26, J04443_25_26, J04444_25_26

  📂 Job-Specific Audio Files
     📋 J04445_25_26 (1 file)
        #1 - Post Printing - 1/4/2026, 9:30 AM
           audioId: audio_1704385000000_xyz789abc
```

## Benefits

### 1. Accurate Common Audio Identification
- No false matches
- No missed matches
- Works with any content

### 2. Performance
- Indexed field = fast queries
- O(1) lookup by audioId
- Efficient grouping

### 3. Flexibility
- Easy to query: "Find all jobs with this audio"
- Easy to update: "Update summary for all instances"
- Easy to delete: "Remove this audio from all jobs"

### 4. Future Features Enabled
- Bulk operations on common audio
- Audio usage analytics
- Deduplication capabilities
- Version tracking

## Edge Cases Handled

### 1. Legacy Data (No audioId)
```javascript
if (!audioId) {
  console.warn('Audio file without audioId found');
  return; // Skip in common audio detection
}
```

### 2. Partial Save Failures
```javascript
// Each job gets saved independently
// If one fails, others still get the audioId
for (const jobNumber of selectedJobNumbers) {
  try {
    await saveAudio({ ...audioData, audioId: currentAudioId });
  } catch (error) {
    console.error(`Failed for ${jobNumber}`);
    // Continue with other jobs
  }
}
```

### 3. Same Audio Saved Twice
- New recording = new audioId
- Even if content identical
- Prevents false grouping

### 4. Audio ID Generation Collision
- Extremely rare (timestamp + 9-char random)
- Probability: ~1 in 10 billion per second
- Additional protection: Database _id field remains unique

## Migration Notes

### For Existing Data
Old audio files without `audioId` will:
- Still be saved and displayed
- Appear as job-specific (not common)
- Log warning in console
- Not break functionality

### Updating Old Records
Could run a migration script:
```javascript
// Find all recordings without audioId
db.audios.find({ "recordings.audioId": { $exists: false } })

// Add unique audioId to each
db.audios.updateMany(
  { "recordings.audioId": { $exists: false } },
  { $set: { "recordings.$[].audioId": generateUniqueId() } }
)
```

## Testing Checklist

✅ Single job save - unique audioId generated  
✅ Multiple jobs save - same audioId used for all  
✅ Common audio detection - audioId matching works  
✅ Job-specific audio - single audioId detected correctly  
✅ Delete audio - audioId cleared  
✅ Save again - new audioId generated  
✅ Backend fallback - auto-generates if missing  
✅ Legacy data - doesn't break display  
✅ Console logging - audioId visible in logs  

## API Changes

### Request Format (Save Audio)
```json
{
  "jobNumber": "J04442_25_26",
  "toDepartment": "printing",
  "audioBlob": "base64...",
  "audioMimeType": "audio/webm",
  "createdBy": "username",
  "userId": "507f1f77bcf86cd799439011",
  "summary": "Apply UV coating",
  "audioId": "audio_1704384000000_abc123xyz"  // ✅ New field
}
```

### Response Format (Get Audio)
```json
{
  "_id": "507f191e810c19729de860ea",
  "audioId": "audio_1704384000000_abc123xyz",  // ✅ Included in response
  "toDepartment": "printing",
  "summary": "Apply UV coating",
  "createdAt": "2024-01-04T10:30:00.000Z",
  "cloudinaryUrl": "https://..."
}
```

## Summary

The `audioId` feature provides a robust, scalable solution for tracking audio recordings across multiple jobs. It replaces fragile signature-based matching with precise ID-based grouping, enabling accurate common audio detection and opening doors for future enhancements.
