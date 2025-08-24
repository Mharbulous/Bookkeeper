# Legacy Trial 5 Files Archive Plan

## Files to Archive or Remove

These files are part of the legacy Trial 5 prediction system that has been replaced by the hardware calibration system:

### Trial 5 Specific Scripts (Archive)
- `trial5_comprehensive_calibration.py` - Trial 5 calibration analysis
- `trial5_enhanced_optimization.py` - Trial 5 optimization scripts  
- `trial5_parser.py` - Parser for Trial 5 console data

### Legacy Raw Console Data (Archive)
- `3_Raw_ConsoleData.md` - Contains legacy `TIME_ESTIMATION_FORMULA` logs
- `4_Raw_ConsoleData.md` - Contains legacy `FOLDER_ANALYSIS_DATA` logs
- `5_Raw_ConsoleData.md` - Trial 5 era console data
- `7_Raw_ConsoleData.md` - Legacy console data

### Legacy CSV Files (Archive)  
- `3_*.csv` - Trial 3 data files
- `4_*.csv` - Trial 4 data files including `4_CalibratedResults.csv`, `4_ValidationResults.csv`
- `5_*.csv` - Trial 5 data files

### Legacy Analysis Scripts (Archive)
- `analyze_3stage_data.py` - 3-stage analysis for legacy system
- `final_calibration.py` - Legacy calibration script
- `recalibrate_constants.py` - Legacy constant recalibration
- `validate_estimation_formula.py` - Legacy formula validation
- `validate_new_formula.py` - Legacy formula validation
- Early calibration scripts: `simple_calibration.py`, `size_aware_calibration.py`, etc.

## Files to Keep (Current System)

### Hardware Calibration System
- `8_Raw_ConsoleData.md` - Current H-factor test data
- `phase2_relationship_analysis.py` - H-factor analysis script
- `hardware_calibration_implementation_summary.md` - Current system documentation
- `validate_h_formula.js` - Current validation script

### General Documentation
- `analysis_summary.md` - General analysis summary
- `manual_phase2_analysis.js` - Manual analysis tools

## Recommended Action

Create `legacy_trial5_archive/` folder and move all Trial 5 related files there to:
1. Clean up the main directory
2. Preserve historical development data 
3. Focus on current hardware calibration system