# Batch Job Details Update - Voice Note Tool

## Overview

The Voice Note Tool has been updated to fetch and display multiple similar job details at once using a new SQL stored procedure. This provides better context when creating voice notes for jobs.

## Changes Made

### 1. Backend API Update

**File**: `backend/src/routes.js`

**Endpoint**: `GET /api/jobs/details-update/:jobNumber`

**Changes**:
- Replaced direct SQL query with stored procedure call: `find_similar_jobs_batch_get_job_details_1hr`
- Now returns an array of jobs instead of a single job
- Added new fields: `jobNumber`, `jobTitle`, `productCategory`, `unitPrice`, `jobCreatedOn`
- Replaced `poDate` field with `jobCreatedOn`

**Request**:
```
GET /api/jobs/details-update/J04443_25_26
```

**Response Format**:
```json
{
  "jobs": [
    {
      "clientName": "Chandras Chemical Enterprises Pvt Ltd",
      "jobNumber": "J04442_25_26",
      "jobTitle": "10 ML SUPER JOINER GREEN CARTON",
      "orderQuantity": 100000,
      "productCategory": "Carton - Side Pasting",
      "unitPrice": 0.55,
      "jobCreatedOn": "2025-12-18"
    },
    {
      "clientName": "Chandras Chemical Enterprises Pvt Ltd",
      "jobNumber": "J04443_25_26",
      "jobTitle": "50 ML DENDRITE TUBE CARTON",
      "orderQuantity": 150000,
      "productCategory": "Carton - Side Pasting",
      "unitPrice": 0.77,
      "jobCreatedOn": "2025-12-18"
    }
  ],
  "count": 2
}
```

### 2. Frontend UI Update

**File**: `Voice Note Tool/main.html`

**Changes**:
- Removed individual job detail input fields (clientName, jobName, orderQuantity, poDate)
- Moved `toDepartment` dropdown to the top (single field for all jobs)
- Added `jobsList` container for dynamically generated job cards

**New Structure**:
```html
<section class="panel panel--collapsible" id="jobDetailsSection">
  <div class="panel-body">
    <!-- Single Department Field -->
    <select id="toDepartment">...</select>
    
    <!-- Multiple Job Cards (Collapsible) -->
    <div id="jobsList" class="jobs-list">
      <!-- Cards dynamically inserted here -->
    </div>
  </div>
</section>
```

### 3. Frontend JavaScript Update

**File**: `Voice Note Tool/script.js`

**New Functions**:

#### `fetchJobDetails(jobNumber)`
- Updated to handle multiple jobs from API response
- Creates collapsible cards for each job
- First job card is expanded by default

#### `createJobCard(job, index)`
- New function to create collapsible job cards
- Each card shows:
  - **Header**: Job Number + Job Title (clickable to expand/collapse)
  - **Body**: Full job details in a grid layout
- Cards can be toggled individually

**Job Card Fields Displayed**:
1. Client Name
2. Job Number
3. Job Title
4. Order Quantity (formatted with commas)
5. Product Category
6. Unit Price (₹)
7. Job Created On (formatted as YYYY-MM-DD)

### 4. CSS Styling

**File**: `Voice Note Tool/styles.css`

**New Styles Added**:

```css
.jobs-list                    /* Container for all job cards */
.job-card                     /* Individual card styling */
.job-card-header              /* Clickable header with job number and title */
.job-card-title               /* Title styling */
.job-card-job-number          /* Job number badge in accent color */
.job-card-toggle              /* Chevron icon that rotates on expand */
.job-card-body                /* Collapsible body with details */
.job-card-details-grid        /* Grid layout for job fields */
.job-card-field               /* Individual field container */
.job-card-field-label         /* Field label (uppercase, muted) */
.job-card-field-value         /* Field value (prominent) */
```

**Features**:
- Smooth animations for expand/collapse
- Hover effects on cards and headers
- Accent colors for job numbers
- Responsive grid layout for job details

## User Experience

### Before
- Only one job's details shown
- All fields displayed at once
- Department field mixed with job details
- Limited information (client, job name, quantity, PO date)

### After
- Multiple related jobs shown together
- Jobs collapsed by default (first one expanded)
- Department field separated and common for all jobs
- Rich information (client, job number, title, quantity, category, price, created date)
- Interactive cards - click to expand/collapse
- Better visual organization with cards

## Stored Procedure

**Name**: `find_similar_jobs_batch_get_job_details_1hr`

**Parameter**: `@JobNumber` (NVARCHAR)

**Returns**: Multiple rows with columns:
- ClientName
- JobBookingNo
- JobTitle
- OrderQty
- ProductCategory
- UnitPrice
- JobCreatedOn

## Migration Notes

1. **Backend**: No breaking changes - endpoint path remains the same
2. **Frontend**: Fully backward compatible - will work with any number of jobs (1 or more)
3. **Database**: Requires stored procedure `find_similar_jobs_batch_get_job_details_1hr` to exist
4. **Fields Renamed**: 
   - `jobName` → `jobTitle`
   - `poDate` → `jobCreatedOn`

## Testing

### Test Cases:
1. ✅ Search for job number that returns single job
2. ✅ Search for job number that returns multiple jobs
3. ✅ Expand/collapse individual job cards
4. ✅ Department selection works for all jobs
5. ✅ Recording audio saves with correct job number
6. ✅ Existing audio files display correctly

## Benefits

1. **Context**: See all related jobs created around the same time
2. **Efficiency**: No need to search multiple times for related jobs
3. **Clarity**: Better organized information with collapsible cards
4. **Consistency**: Department applies to all jobs in the batch
5. **Rich Data**: More fields (category, price) for better context
