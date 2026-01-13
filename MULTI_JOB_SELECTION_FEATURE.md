# Multi-Job Selection Feature - Voice Note Tool

## Overview

Added checkbox selection functionality to allow users to save the same audio recording to multiple jobs at once. This is particularly useful when similar jobs need the same instruction.

## Changes Made

### 1. HTML Updates

**File**: `Voice Note Tool/main.html`

**Added Elements**:
```html
<!-- Selection Controls (shown only for multiple jobs) -->
<div id="jobSelectionControls" class="job-selection-controls" style="display: none;">
  <button type="button" id="selectAllJobsBtn">Select All</button>
  <button type="button" id="unselectAllJobsBtn">Unselect All</button>
</div>
```

### 2. CSS Updates

**File**: `Voice Note Tool/styles.css`

**New Styles**:
- `.job-selection-controls` - Container for Select All/Unselect All buttons
- `.btn-secondary` - Secondary button styling with hover effects
- `.job-card-header-left` - Left section of header with checkbox and title
- `.job-card-checkbox` - Checkbox styling with accent color
- Updated `.job-card-header` to use flexbox with gap
- Updated `.job-card-toggle` to be a flex-shrink item

### 3. JavaScript Updates

**File**: `Voice Note Tool/script.js`

#### New Functions

##### `getSelectedJobNumbers()`
Returns an array of selected job numbers based on checkbox states.

**Logic**:
- If no checkboxes exist (single job), returns the job number from the card's `dataset`
- If checkboxes exist, returns only the job numbers with checked checkboxes
- Returns empty array if no jobs are selected

```javascript
function getSelectedJobNumbers() {
  const checkboxes = document.querySelectorAll('.job-card-checkbox');
  if (checkboxes.length === 0) {
    // Single job - no checkboxes
    const jobCard = document.querySelector('.job-card');
    return jobCard ? [jobCard.dataset.jobNumber] : [];
  }
  
  // Multiple jobs - get checked ones
  const selectedJobs = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selectedJobs.push(cb.dataset.jobNumber);
    }
  });
  return selectedJobs;
}
```

##### `setupSelectionControls()`
Sets up event listeners for Select All and Unselect All buttons.

**Features**:
- Clones and replaces buttons to remove old event listeners
- Select All: Checks all job checkboxes
- Unselect All: Unchecks all job checkboxes

#### Updated Functions

##### `fetchJobDetails(jobNumber)` - Enhanced
**New Logic**:
- Determines if checkboxes should be shown based on job count (`jobs.length > 1`)
- Shows/hides selection controls accordingly
- Passes `showCheckboxes` flag to `createJobCard()`
- Calls `setupSelectionControls()` for multiple jobs

##### `createJobCard(job, index, showCheckbox)` - Enhanced
**New Features**:
- Accepts `showCheckbox` parameter (boolean)
- Adds checkbox HTML to header if `showCheckbox` is true
- Checkbox is checked by default
- Sets `data-job-number` attribute on card for fallback selection
- Prevents checkbox click from toggling card expansion
- Only title area triggers expand/collapse (not checkbox)

**Checkbox HTML**:
```html
<input type="checkbox" 
       class="job-card-checkbox" 
       checked 
       data-job-number="${job.jobNumber}">
```

##### `saveAudioBtn` Click Handler - Enhanced
**New Logic**:
1. Gets selected job numbers using `getSelectedJobNumbers()`
2. Validates at least one job is selected
3. Loops through all selected jobs
4. Saves audio for each job individually
5. Tracks success and error counts
6. Shows appropriate success message:
   - Single job: "Audio saved successfully!"
   - Multiple jobs: "Audio saved successfully for X job(s)!"
   - With errors: "Audio saved successfully for X job(s)! (Y failed)"

**Error Handling**:
- Continues saving for remaining jobs even if one fails
- Shows partial success message if some jobs succeed
- Shows error if all jobs fail

## User Experience

### Single Job Scenario
- **No checkboxes shown**
- User just records and saves
- Audio is automatically saved for the single job
- Behavior identical to previous version

### Multiple Jobs Scenario
- **Checkboxes shown** on each card header (visible even when collapsed)
- **All jobs checked by default**
- **Select All / Unselect All buttons** appear at the top
- User can:
  1. Uncheck jobs they don't want
  2. Use Select All to check all jobs
  3. Use Unselect All to clear all selections
  4. Manually check/uncheck individual jobs

### Saving Process
1. User records audio (works as before)
2. User selects target department (common for all jobs)
3. User reviews selected jobs (via checkboxes)
4. User clicks Save
5. System saves audio to all selected jobs
6. Success message shows count: "Audio saved successfully for 3 job(s)!"

## Technical Details

### Data Storage
- Each job gets its own audio document (or appends to existing)
- Same audio blob is saved for each selected job
- Same department, summary, and metadata for all
- Each job's audio is independently queryable

### Validation
- At least one job must be selected
- Department must be selected
- Audio must be recorded
- User must be logged in

### Performance
- Sequential saving (one job at a time)
- Continues on error (doesn't stop entire operation)
- UI shows progress with "Saving..." state
- Logs each job save to console

## Benefits

1. **Efficiency**: Save same instruction to multiple similar jobs at once
2. **Flexibility**: Choose which jobs get the audio
3. **Clarity**: Visual feedback with checkboxes
4. **Robustness**: Partial success handling (some jobs succeed even if others fail)
5. **Consistency**: Same audio, department, and summary for all selected jobs

## Edge Cases Handled

1. **Single job**: Checkboxes hidden, works as before
2. **No selection**: Validation prevents save
3. **Partial failure**: Shows success count + failure count
4. **All failures**: Shows error message, doesn't clear UI
5. **Department not selected**: Validation prevents save

## Example Use Cases

### Use Case 1: Similar Carton Jobs
- User searches for `J04443_25_26`
- Procedure returns 2 similar jobs:
  - J04442_25_26 - 10 ML SUPER JOINER GREEN CARTON
  - J04443_25_26 - 50 ML DENDRITE TUBE CARTON
- User records: "Apply extra glue on flap edge"
- Both jobs checked by default
- User clicks Save
- Audio saved to both jobs with "Printing" department

### Use Case 2: Selective Application
- User searches for job that returns 5 similar jobs
- User wants instruction for only 3 of them
- User unchecks 2 jobs
- Records audio
- Clicks Save
- Audio saved to only the 3 selected jobs

### Use Case 3: Quick Select/Unselect
- User searches for job with 10 similar results
- User clicks "Unselect All"
- User manually checks only 2 specific jobs
- Records audio
- Audio saved to only those 2 jobs

## Testing Checklist

✅ Single job - no checkboxes shown, saves correctly  
✅ Multiple jobs - checkboxes shown and all checked by default  
✅ Select All button - checks all checkboxes  
✅ Unselect All button - unchecks all checkboxes  
✅ Individual checkbox toggle - works independently  
✅ No selection validation - prevents save  
✅ Multiple job save - saves to all selected  
✅ Partial failure - shows count with errors  
✅ Success message - shows correct count  
✅ Checkbox click - doesn't toggle card expansion  
✅ Title click - toggles card expansion (not checkbox)  
✅ Department cleared after save  
✅ Scroll to top after save  
✅ Audio files refreshed after save  

## Future Enhancements

Potential improvements:
1. Batch save API endpoint (single request for all jobs)
2. Progress indicator during multi-job save
3. Job-specific error details in UI
4. Save to selected jobs in parallel (faster)
5. Remember last checkbox states per session
