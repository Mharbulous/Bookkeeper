# PowerShell Script to Move Files to Planned Folder Structure
# This script moves remaining files according to docs/folder-structure-plan.md

Write-Host "Starting file migration to feature-based folder structure..." -ForegroundColor Green

# Base paths
$srcPath = "src"
$backupPath = "backup-" + (Get-Date -Format "yyyy-MM-dd-HHmm")

# Create backup directory
Write-Host "Creating backup at: $backupPath" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

# Function to move file safely with backup
function Move-FileWithBackup {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Description
    )
    
    if (Test-Path $Source) {
        Write-Host "Moving: $Description" -ForegroundColor Cyan
        Write-Host "  From: $Source" -ForegroundColor DarkGray
        Write-Host "  To:   $Destination" -ForegroundColor DarkGray
        
        # Create backup
        $backupFile = Join-Path $backupPath $Source
        $backupDir = Split-Path $backupFile -Parent
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Copy-Item $Source $backupFile -Force
        
        # Create destination directory if needed
        $destDir = Split-Path $Destination -Parent
        if (!(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            Write-Host "  Created directory: $destDir" -ForegroundColor Green
        }
        
        # Move file
        Move-Item $Source $Destination -Force
        Write-Host "  Completed" -ForegroundColor Green
    }
    else {
        Write-Host "  Source file not found: $Source" -ForegroundColor Yellow
    }
}

Write-Host "`n=== PHASE 1: Moving File Upload Composables ===" -ForegroundColor Magenta

# Remaining composables to move
$composableMoves = @(
    @{
        Source = "$srcPath/composables/useFolderTimeouts.js"
        Dest   = "$srcPath/features/upload/composables/useFolderTimeouts.js"
        Desc   = "useFolderTimeouts.js composable"
    },
    @{
        Source = "$srcPath/composables/useTimeBasedWarning.js"
        Dest   = "$srcPath/features/upload/composables/useTimeBasedWarning.js"
        Desc   = "useTimeBasedWarning.js composable"
    },
    @{
        Source = "$srcPath/composables/useUploadLogger.js"
        Dest   = "$srcPath/features/upload/composables/useUploadLogger.js"
        Desc   = "useUploadLogger.js composable"
    },
    @{
        Source = "$srcPath/composables/useUploadManager.js"
        Dest   = "$srcPath/features/upload/composables/useUploadManager.js"
        Desc   = "useUploadManager.js composable"
    }
)

foreach ($move in $composableMoves) {
    Move-FileWithBackup -Source $move.Source -Destination $move.Dest -Description $move.Desc
}

# Also move test files if they exist
$testMoves = @(
    @{
        Source = "$srcPath/composables/useFolderTimeouts.test.js"
        Dest   = "$srcPath/features/upload/composables/useFolderTimeouts.test.js"
        Desc   = "useFolderTimeouts.test.js test file"
    }
)

foreach ($move in $testMoves) {
    Move-FileWithBackup -Source $move.Source -Destination $move.Dest -Description $move.Desc
}

Write-Host "`n=== PHASE 2: Moving File Upload Utils ===" -ForegroundColor Magenta

$utilMoves = @(
    @{
        Source = "$srcPath/utils/folderPathUtils.js"
        Dest   = "$srcPath/features/upload/utils/folderPathUtils.js"
        Desc   = "folderPathUtils.js utility"
    },
    @{
        Source = "$srcPath/utils/folderPathUtils.test.js"
        Dest   = "$srcPath/features/upload/utils/folderPathUtils.test.js"
        Desc   = "folderPathUtils.test.js test file"
    },
    @{
        Source = "$srcPath/utils/hardwareCalibration.js"
        Dest   = "$srcPath/features/upload/utils/hardwareCalibration.js"
        Desc   = "hardwareCalibration.js utility"
    },
    @{
        Source = "$srcPath/utils/processingTimer.js"
        Dest   = "$srcPath/features/upload/utils/processingTimer.js"
        Desc   = "processingTimer.js utility"
    }
)

foreach ($move in $utilMoves) {
    Move-FileWithBackup -Source $move.Source -Destination $move.Dest -Description $move.Desc
}

Write-Host "`n=== PHASE 3: Moving FileUpload View ===" -ForegroundColor Magenta

Move-FileWithBackup -Source "$srcPath/views/FileUpload.vue" -Destination "$srcPath/features/upload/views/FileUpload.vue" -Description "FileUpload.vue main view"

Write-Host "`n=== PHASE 4: Creating Core Architecture ===" -ForegroundColor Magenta

# Create core directories
New-Item -ItemType Directory -Path "$srcPath/core/stores" -Force | Out-Null
New-Item -ItemType Directory -Path "$srcPath/core/services" -Force | Out-Null

$coreMoves = @(
    @{
        Source = "$srcPath/core/stores/auth.js"
        Dest   = "$srcPath/core/stores/auth.js"
        Desc   = "auth.js store"
    },
    @{
        Source = "$srcPath/services/firebase.js"
        Dest   = "$srcPath/core/services/firebase.js"
        Desc   = "firebase.js service"
    }
)

foreach ($move in $coreMoves) {
    Move-FileWithBackup -Source $move.Source -Destination $move.Dest -Description $move.Desc
}

Write-Host "`n=== PHASE 5: Creating Feature Structure ===" -ForegroundColor Magenta

# Create file-upload feature index
$fileUploadIndex = @'
// File Upload Feature - Main Export
// This file serves as the main entry point for the file upload feature module

// Export main components
export { default as FileUpload } from './views/FileUpload.vue'
export { default as FileUploadQueue } from './components/FileUploadQueue.vue'
export { default as UploadDropzone } from './components/UploadDropzone.vue'
export { default as FolderOptionsDialog } from './components/FolderOptionsDialog.vue'

// Export core composables
export { useFileQueue } from './composables/useFileQueue.js'
export { useFileMetadata } from './composables/useFileMetadata.js'
export { useFileDragDrop } from './features/upload/composables/useFileDragDrop.js'
export { useQueueDeduplication } from './composables/useQueueDeduplication.js'

// Export utilities
export { analyzeFiles } from './utils/fileAnalysis.js'
export { calculateHardwareFactor } from './utils/hardwareCalibration.js'

// Feature metadata
export const featureInfo = {
  name: 'file-upload',
  version: '1.0.0',
  description: 'File upload and processing system with deduplication',
  dependencies: ['@/core/services/firebase']
}
'@

Write-Host "Creating file-upload feature index..." -ForegroundColor Cyan
$indexPath = "$srcPath/features/upload/index.js"
Set-Content -Path $indexPath -Value $fileUploadIndex -Encoding UTF8
Write-Host "  Created: $indexPath" -ForegroundColor Green

# Create file-viewer placeholder structure
Write-Host "Creating file-viewer feature placeholder..." -ForegroundColor Cyan
$viewerDirs = @(
    "$srcPath/features/file-viewer/components",
    "$srcPath/features/file-viewer/composables", 
    "$srcPath/features/file-viewer/utils",
    "$srcPath/features/file-viewer/views"
)

foreach ($dir in $viewerDirs) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Write-Host "  Created directory: $dir" -ForegroundColor Green
}

# Create file-viewer index placeholder
$fileViewerIndex = @'
// File Viewer Feature - Placeholder
// This feature is planned for future implementation

// Placeholder exports
export const featureInfo = {
  name: 'file-viewer',
  version: '0.1.0',
  description: 'File viewing and management system (planned)',
  status: 'placeholder'
}

// TODO: Implement file viewer components and functionality
'@

$viewerIndexPath = "$srcPath/features/file-viewer/index.js"
Set-Content -Path $viewerIndexPath -Value $fileViewerIndex -Encoding UTF8
Write-Host "  Created: $viewerIndexPath" -ForegroundColor Green

Write-Host "`n=== MIGRATION SUMMARY ===" -ForegroundColor Green
Write-Host "File Upload composables moved to features/upload/composables/" -ForegroundColor Green
Write-Host "File Upload utils moved to features/upload/utils/" -ForegroundColor Green  
Write-Host "FileUpload.vue moved to features/upload/views/" -ForegroundColor Green
Write-Host "Core files moved to core/ directory structure" -ForegroundColor Green
Write-Host "Feature index files created" -ForegroundColor Green
Write-Host "File-viewer placeholder structure created" -ForegroundColor Green

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Yellow
Write-Host "1. Update import statements throughout the codebase" -ForegroundColor White
Write-Host "2. Update router configuration for FileUpload.vue new location" -ForegroundColor White  
Write-Host "3. Run 'npm run build' to verify no import errors" -ForegroundColor White
Write-Host "4. Run tests to ensure functionality is preserved" -ForegroundColor White
Write-Host "5. Update documentation to reflect new structure" -ForegroundColor White

Write-Host "`nBackup created at: $backupPath" -ForegroundColor Cyan
Write-Host "Migration completed successfully!" -ForegroundColor Green