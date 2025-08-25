# Frequently Asked Questions (FAQ)

## File Upload and Processing

### Q: Why does my upload queue show fewer files than Windows File Explorer?

**A:** You may notice a small discrepancy (typically 1-3 files) between what Windows File Explorer counts and what appears in your upload queue.  This is normal behavior due to browser security filtering. 

**What's happening:**
- **Windows File Explorer** counts ALL files, including hidden system files
- **Browser file selection** (webkitdirectory API) automatically filters out certain files for security reasons
- **Your upload queue** shows exactly what the browser allows you to select

**Files that browsers typically filter out:**
- `desktop.ini` (Windows folder configuration files)
- `thumbs.db` (Windows thumbnail cache files)
- Files starting with `.` (hidden files)
- Files with Windows `FILE_ATTRIBUTE_HIDDEN` attribute
- Certain system files for security protection

**Example:**
- Windows Explorer: 2,284 files
- Upload queue: 2,282 files
- Difference: 2 hidden system files (likely `desktop.ini` or `thumbs.db`)

**Why this is good:**
This filtering protects you from accidentally uploading system files that:
- Contain personal metadata
- Are specific to your computer setup
- Don't need to be backed up or shared
- Could pose security risks

**Bottom line:** The file count difference is intentional browser behavior designed to keep you safe. Your actual photos, documents, and important files are all being processed correctly.