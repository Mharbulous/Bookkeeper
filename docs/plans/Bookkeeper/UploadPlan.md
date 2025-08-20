# Planned prompt for creating Book Keeper app

### Step 1 

Copy documentation of the Firebase storage and Firestore designs from Corphaeus

### Step 2 

Verify the App Switcher functionality that was recently added to Corphaeus repository has been added to the BookKeeper app.

### Step 3 - Build Front End for File Uploading

Using Material Design, 
create a front end interface for uploading files, with options for bulk uploading using a folder picker, or by dragging and dropping folders into the app, as well as the ability to upload individual files by dragging and dropping, or by open a file picker interface.


### Step 4 - Build Front End Bulk Upload options.

To enable truly bulk uploads, when uploading folders, check if the folder has subfolders, and ask the user if they want to upload files saved in subfolder, or just the main folder.  Build front end only.   Users should be able to drag and drop folders, or select a folder, and see a popup asking if they want to include files saved in subfolders, but nothing should actually be uploaded.  Not applicable for individual files.

### Step 5 - Build Front File Upload Queue Preview with duplication detection.

Build front end only.   Users should be able to drag and drop folders, or select a folder, and after selecting whether to include files saved in subfolders, they should be shown a list of the files that will be uploaded.  This should include a search for any duplicate files using SHA256 hash values.  However when duplicates are found, this fact should not be shared with the user immediately.  Instead, we should then check the upload logs to see whether any previous upload of this file had the exact same meta data.  If a file with the same SHA256 hash exists, but the metadata is different in anyway, then do not indicate that this file has been previously uploaded, because we want the user to upload this variation of the file so that we can log it's meta data without actually uploading it.  If a previous upload with the same SHA 256 hash value, and exactly the same data is found, then display a note next this file indicating "File previously uploaded by ____________ on _________ date and will be skipped."
If a previous upload with the same SHA 256 hash value but different meta data is found, then display "Duplicate file with different meta data was uploaded by ____________ on ________.  Proceed with upload to enable comparison of these similar files."  If only one file is being uploaded, then instead of a list of files, display a embedded notification that display for 3-5 seconds before fading away.  The message for single files should be reworded slightly to reflect the fact that only one file upload was attempted, but the meaning should be the same. 

Do a similar analysis of files in the upload queue, checking to see if duplicate files are being uploaded.  If files with duplicate SHA 256 values but different meta data are found, then display "Duplicate files with different meta data detected.  Proceed with upload to enable comparison of these similar files."   If files with duplicate SHA 256 and identical meta data is found, then display "Duplicate files detected.  Only one copy will be uploaded, the other will be skipped."

After listing the file upload queue, there should be a button for the user to click to be able to proceed with the uploads.  However, if only a single file is being uploaded, and not a folder, then skip the file upload queu display, and immediately attempt the upload, displaying the appropriate notificatoin for 3-5 seconds if a duplicate SHA 256 hash value was detected.  

Use material design for the front end elements as much as possible.

### Step 6 

Once the Front End looks good, and user has approved the UI, then start implementing the actual uploads.  

Use the same file upload queue display, and with a progress bar next to each file.  When a file is queued but has not started uploading, instead of a progress bar display the text "pending".  For duplicate files with identical hash codes, instead of a progress bar, display the message "skipped..." but only after the upload attempt has been logged. For files that are in progress, show a horizontal green progress bar.  For files that have been fully uploaded, show a full green progress bar.

When uploading of a particular file starts, add a upload log entry showing that the upload started.  When uploading of a particular file completes successfully, update the same log entry to show that the upload finished.  In this way, if any file upload gets interrupted, we should be able to tell from the logs.

Use material design wherever possible.



