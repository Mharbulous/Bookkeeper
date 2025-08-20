# Planned prompt for creating Book Keeper app

### Step 1 ✅ COMPLETED

Copy documentation of the Firebase storage and Firestore designs from Corphaeus repo

**Status**: Completed - Firebase storage and Firestore documentation copied from Coryphaeus repository to Bookkeeper

### Step 2 ✅ COMPLETED

Verify the App Switcher functionality that was recently added to Corphaeus repository has been added to the BookKeeper app.

**Status**: Completed - AppSwitcher component verified and updated with correct app configurations (Coryphaeus and Intranet)

### Step 2.1 ✅ COMPLETED - Material Design 3 AppSwitcher Enhancement

**Issue Identified**: The AppSwitcher dropdown had a focus management problem where the dropdown would appear whenever any button within the dropdown menu received focus, rather than just the top button. This was caused by the CSS `group-focus-within:block` implementation creating a focus trap.

**Solution Implemented**: 
- Completely rebuilt the AppSwitcher component using Material Design 3 principles
- Replaced CSS-only focus-within approach with proper JavaScript state management
- Added comprehensive keyboard navigation (Arrow keys, Enter, Escape, Home, End)
- Implemented proper ARIA accessibility attributes and roles
- Added Material Design 3 elevation shadows and smooth transitions
- Included click-outside-to-close functionality and mobile-responsive backdrop
- Enhanced focus management that prevents focus traps and properly restores focus

**Technical Validation**:
- ✅ Linting passed
- ✅ Build completed successfully  
- ✅ No breaking changes to existing functionality
- ✅ Focus trap eliminated
- ✅ Full keyboard accessibility support

**Files Modified**:
- `src/components/AppSwitcher.vue` (complete rewrite)
- `src/components/layout/AppSidebar.vue` (integration update)

**Status**: Completed - Material Design 3 compliant dropdown with proper focus management and enhanced user experience

### Step 3 📋 NOT STARTED - Build Front End for File Uploading

Using Material Design, 
create a front end interface for uploading files, with options for bulk uploading using a folder picker, or by dragging and dropping folders into the app, as well as the ability to upload individual files by dragging and dropping, or by open a file picker interface.

**Status**: Not Started - Next step to begin implementation

### Step 4 📋 NOT STARTED - Build Front End Bulk Upload options.

To enable truly bulk uploads, when uploading folders, check if the folder has subfolders, and ask the user if they want to upload files saved in subfolder, or just the main folder.  Build front end only.   Users should be able to drag and drop folders, or select a folder, and see a popup asking if they want to include files saved in subfolders, but nothing should actually be uploaded.  Not applicable for individual files.

**Status**: Not Started - Pending Step 3 completion

### Step 5 📋 NOT STARTED - Build Front File Upload Queue Preview with duplication detection.

Build front end only.   Users should be able to drag and drop folders, or select a folder, and after selecting whether to include files saved in subfolders, they should be shown a list of the files that will be uploaded.  This should include a search for any duplicate files using SHA256 hash values.  However when duplicates are found, this fact should not be shared with the user immediately.  Instead, we should then check the upload logs to see whether any previous upload of this file had the exact same meta data.  If a file with the same SHA256 hash exists, but the metadata is different in anyway, then do not indicate that this file has been previously uploaded, because we want the user to upload this variation of the file so that we can log it's meta data without actually uploading it.  If a previous upload with the same SHA 256 hash value, and exactly the same data is found, then display a note next this file indicating "File previously uploaded by ____________ on _________ date and will be skipped."
If a previous upload with the same SHA 256 hash value but different meta data is found, then display "Duplicate file with different meta data was uploaded by ____________ on ________.  Proceed with upload to enable comparison of these similar files."  If only one file is being uploaded, then instead of a list of files, display a embedded notification that display for 3-5 seconds before fading away.  The message for single files should be reworded slightly to reflect the fact that only one file upload was attempted, but the meaning should be the same. 

Do a similar analysis of files in the upload queue, checking to see if duplicate files are being uploaded.  If files with duplicate SHA 256 values but different meta data are found, then display "Duplicate files with different meta data detected.  Proceed with upload to enable comparison of these similar files."   If files with duplicate SHA 256 and identical meta data is found, then display "Duplicate files detected.  Only one copy will be uploaded, the other will be skipped."

After listing the file upload queue, there should be a button for the user to click to be able to proceed with the uploads.  However, if only a single file is being uploaded, and not a folder, then skip the file upload queu display, and immediately attempt the upload, displaying the appropriate notificatoin for 3-5 seconds if a duplicate SHA 256 hash value was detected.  

Use material design for the front end elements as much as possible.

**Status**: Not Started - Pending Steps 3-4 completion

### Step 6 📋 NOT STARTED - Implement Actual File Uploads

Once the Front End looks good, and user has approved the UI, then start implementing the actual uploads.  

Use the same file upload queue display, and with a progress bar next to each file.  When a file is queued but has not started uploading, instead of a progress bar display the text "pending".  For duplicate files with identical hash codes, instead of a progress bar, display the message "skipped..." but only after the upload attempt has been logged. For files that are in progress, show a horizontal green progress bar.  For files that have been fully uploaded, show a full green progress bar.

When uploading of a particular file starts, add a upload log entry showing that the upload started.  When uploading of a particular file completes successfully, update the same log entry to show that the upload finished.  In this way, if any file upload gets interrupted, we should be able to tell from the logs.

Use material design wherever possible.

**Status**: Not Started - Pending Steps 3-5 completion

---

## Current Progress Summary

- ✅ **Step 1**: Firebase documentation copied from Coryphaeus
- ✅ **Step 2**: AppSwitcher component verified and configured  
- ✅ **Step 2.1**: Material Design 3 AppSwitcher enhancement completed
- 📋 **Step 3**: File upload front end interface (NEXT TO START)
- 📋 **Step 4**: Bulk upload options with subfolder selection
- 📋 **Step 5**: Upload queue preview with duplicate detection
- 📋 **Step 6**: Actual file upload implementation

**Ready to Begin**: Step 3 - Build Front End for File Uploading



