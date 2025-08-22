
# CORA Data Import Guide

## Overview
This guide will help you import your legacy CORA system data into the Project Foundry PSA platform.

## Data Volume Summary
- **Users**: 323 records
- **Projects**: 577 records  
- **Tasks**: 500 records
- **Timesheets**: 17,745 records
- **Time Entries**: 51,134 records
- **Total**: 70,000+ records

## Data Mapping

### Users (323 records)
```
CORA Field → PSA Field
User_ID → Internal mapping
Email → email
FirstName + Surname → name
User_Type_Desc → role (mapped to UserRole enum)
Practice → department
```

**Role Mapping:**
- Administrator → ADMIN
- Manager → MANAGER  
- Partner → PARTNER
- Principal → PRINCIPAL
- Senior Consultant → SENIOR_CONSULTANT
- Junior Consultant → JUNIOR_CONSULTANT
- Contractor → CONTRACTOR
- Others → EMPLOYEE

**Security Note:** All imported users get temporary password: `tempPassword123!`

### Projects (577 records)
```
CORA Field → PSA Field
Column1.id → code (as CORA-{id})
Column1.description → name + client extraction
Column1.projectStatusDescription → status
Column1.startDate → startDate
Column1.finishDate → endDate
```

**Client Creation:** Clients are automatically extracted from project descriptions using patterns like "ClientName - ProjectName"

### Tasks (500 records)
```
CORA Field → PSA Field
id → Internal mapping to projectId
description → name
duration → estimatedHours
statusDescription → status (COMPLETED/OPEN)
```

### Time Entries (51,134 records)
```
CORA Field → PSA Field
UserId → userId (via mapping)
ProjectId → projectId (via mapping)  
TaskId → taskId (via mapping)
Hours → duration
Timesheet_Entry_Date → date
TaskDescription → description
```

## Pre-Import Checklist

### 1. **Backup Current Database**
```bash
cd /home/ubuntu/project-foundry-psa/app
npm run db:backup
```

### 2. **Import Status**
✅ CORA data import has been completed successfully
- ✅ Users: 323 records imported
- ✅ Projects: 577 records imported
- ✅ Tasks: 500 records imported  
- ✅ Timesheets: 17,745 records processed
- ✅ Time Entries: 51,134 records imported

### 3. **Database Connection**
Verify your database is running and accessible.

## Import Process

### Step 1: Create Backup
```bash
npm run db:backup
```

### Step 2: Run Import
```bash
npm run db:import-cora
```

### Step 3: Verify Results
The import script will show progress and final summary:
```
🎉 CORA Data Import Complete!

📊 Database Summary:
Users: 323
Clients: [Auto-generated count]
Projects: 577
Tasks: 500  
Time Entries: 51,134
```

## Data Quality Considerations

### **Automatic Handling:**
- ✅ **Duplicate Prevention**: Checks existing records before import
- ✅ **Invalid Data Filtering**: Skips inactive users, invalid dates
- ✅ **Client Creation**: Auto-creates clients from project descriptions
- ✅ **Foreign Key Resolution**: Maps CORA IDs to new system IDs
- ✅ **Error Recovery**: Continues import even if individual records fail

### **Manual Review Required:**
- 🔍 **Client Names**: Review auto-extracted client names for accuracy
- 🔍 **User Roles**: Verify role mappings are appropriate
- 🔍 **Project Status**: Check project status mapping (Green → ACTIVE)
- 🔍 **Time Entry Dates**: Validate date parsing for different formats

## Post-Import Tasks

### 1. **Password Reset**
All imported users have temporary password: `tempPassword123!`
- Send password reset instructions to active users
- Consider implementing bulk password reset functionality

### 2. **User Access Review**  
- Review user roles and permissions
- Activate/deactivate accounts as needed
- Set up project assignments

### 3. **Data Validation**
- Spot check imported time entries
- Verify project-client relationships  
- Test timesheet functionality with imported data

### 4. **Client Information**
- Update auto-created client records with proper contact information
- Add client contacts and details
- Verify billing information

## Rollback Procedure

If issues are found after import:

### Option 1: Database Reset
```bash
# Stop the application
# Restore from backup created in Step 1
# Run original seed script
npm run db:seed
```

### Option 2: Selective Cleanup
```sql
-- Remove imported records (use with caution)
DELETE FROM time_entries WHERE description LIKE '%Imported from CORA%';
DELETE FROM tasks WHERE description LIKE '%Imported from CORA%';  
DELETE FROM projects WHERE code LIKE 'CORA-%';
-- etc.
```

## Common Issues & Solutions

### **Issue**: "Project not found" errors
**Solution**: Some tasks reference projects not in the projects export. These are automatically skipped.

### **Issue**: Date parsing errors  
**Solution**: The script handles multiple date formats. Invalid dates default to current date.

### **Issue**: Duplicate users
**Solution**: Script checks existing email addresses and skips duplicates.

### **Issue**: Large time entry import is slow
**Solution**: Import processes in batches with progress updates. Expect 10-15 minutes for full import.

## Performance Notes

- **Import Duration**: ~15-20 minutes for full dataset
- **Memory Usage**: ~500MB during peak import
- **Progress Updates**: Every 1,000 time entries imported
- **Error Tolerance**: Individual record failures don't stop the process

## Success Criteria

✅ **Users**: 300+ imported (excluding inactive)  
✅ **Clients**: 50+ auto-created from project descriptions  
✅ **Projects**: 550+ imported with proper client assignments  
✅ **Tasks**: 400+ imported with project relationships  
✅ **Time Entries**: 45,000+ imported with valid user/project/task links

## Support

If you encounter issues during import:
1. Check the console output for specific error messages
2. Review the backup created before import
3. Verify file formats match expected CSV structure  
4. Test with a smaller subset of data first (modify script to process fewer records)
