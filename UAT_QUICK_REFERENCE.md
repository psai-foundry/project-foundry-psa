
# Project Foundry PSA - UAT Quick Reference Guide

## Quick Test Login Matrix
| Role | Email | Password | Quick Access Test |
|------|--------|----------|-------------------|
| **ADMIN** | admin@foundry.com | TestUser123! | Check Settings > System Administration |
| **PARTNER** | partner@foundry.com | TestUser123! | Check Reports > Executive Dashboard |
| **PRINCIPAL** | principal@foundry.com | TestUser123! | Check Reports > Financial Reports |
| **PRACTICE_LEAD** | practicelead@foundry.com | TestUser123! | Check Team > Approvals Queue |
| **MANAGER** | manager@foundry.com | TestUser123! | Check Team > Team Timesheets |
| **SENIOR_CONSULTANT** | seniorconsultant@foundry.com | TestUser123! | Check Projects > Assigned Projects |
| **EMPLOYEE** | employee@foundry.com | TestUser123! | Check Time Tracking > Start Timer |
| **JUNIOR_CONSULTANT** | juniorconsultant@foundry.com | TestUser123! | Check Dashboard > Personal Stats |
| **CONTRACTOR** | contractor@foundry.com | TestUser123! | Check Projects > Limited View |
| **CLIENT_USER** | client@foundry.com | TestUser123! | Check Projects > Read-only Access |

## Critical Test Scenarios by Priority

### 🔴 CRITICAL (Must Pass)
1. **Authentication**: All users can log in/out
2. **Role Security**: Users only see permitted features
3. **Time Tracking**: Timer and manual entry work
4. **Timesheet Submission**: Approval workflow functions
5. **Data Integrity**: No data corruption or orphaned records

### 🟡 HIGH (Should Pass)
1. **Dashboard Loading**: Role-appropriate content displays
2. **Project Management**: CRUD operations work correctly
3. **Client Management**: Access control enforced
4. **Reports**: Generate without errors
5. **Xero Integration**: Manual sync functions

### 🟢 MEDIUM (Nice to Pass)
1. **Performance Monitoring**: Metrics display correctly
2. **Audit Logging**: Actions recorded properly
3. **UI Responsiveness**: Works on mobile/tablet
4. **Export Functions**: Data exports successfully
5. **Search/Filtering**: Results accurate

## 5-Minute Smoke Test per Role

### ADMIN (Full System Test)
1. Login ✅
2. Access Settings > System Administration ✅
3. View Dashboard > All Metrics ✅  
4. Check Audit Logs ✅
5. Access Xero Integration ✅

### PARTNER/PRINCIPAL (Business Management)
1. Login ✅
2. View Dashboard > Executive Stats ✅
3. Access All Projects ✅
4. View Financial Reports ✅
5. Check Team Performance ✅

### MANAGER/PRACTICE_LEAD (Team Management)
1. Login ✅
2. View Dashboard > Team Stats ✅
3. Access Approval Queue ✅
4. View Team Timesheets ✅
5. Generate Team Report ✅

### EMPLOYEE/CONSULTANT (Individual Contributor)
1. Login ✅
2. View Dashboard > Personal Stats ✅
3. Start Time Timer ✅
4. View Assigned Projects ✅
5. Submit Timesheet ✅

### CLIENT_USER (External Access)
1. Login ✅
2. View Dashboard > Limited Stats ✅
3. Access Own Projects Only ✅
4. Verify No Internal Features ✅
5. View Project Status Reports ✅

## Common Issues Checklist

### Authentication Issues
- [ ] Login redirects properly
- [ ] Session timeout works
- [ ] Password requirements enforced
- [ ] Account lockout after failed attempts

### Authorization Issues  
- [ ] Navigation menus role-appropriate
- [ ] API endpoints protected
- [ ] Feature buttons visible/hidden correctly
- [ ] Data filtered by access level

### Functional Issues
- [ ] Forms submit and validate properly
- [ ] Calculations accurate (time, billing)
- [ ] Search and filtering work
- [ ] Export functions generate files

### UI/UX Issues
- [ ] Pages load in reasonable time
- [ ] Mobile responsive design
- [ ] Error messages clear and helpful
- [ ] Consistent styling across pages

## Test Data Verification

### Before Testing
- [ ] Test users exist with correct roles
- [ ] Sample projects assigned appropriately  
- [ ] Time entries exist for testing
- [ ] Client data populated
- [ ] Approval workflows have pending items

### After Testing
- [ ] No test data in production systems
- [ ] User accounts properly secured
- [ ] Test transactions cleaned up
- [ ] System returned to clean state

## Quick Defect Reporting Template

```
DEFECT ID: [AUTO-GENERATED]
DATE: [CURRENT DATE]
TESTER: [YOUR NAME]
USER ROLE: [ADMIN/PARTNER/ETC]
BROWSER: [CHROME/FIREFOX/SAFARI]

SUMMARY: [Brief description]
SEVERITY: [CRITICAL/HIGH/MEDIUM/LOW]
STEPS TO REPRODUCE:
1. Login as [role]
2. Navigate to [page]
3. Click [button/link]
4. [Additional steps]

EXPECTED RESULT: [What should happen]
ACTUAL RESULT: [What actually happened]
SCREENSHOTS: [Attach if applicable]
WORKAROUND: [If available]
```

## Success Metrics Dashboard

### Overall System Health
- Authentication Success Rate: ____%
- Core Feature Functionality: ____%  
- Role-based Access Control: ____%
- Data Integrity: ____%
- Performance Benchmarks: ____%

### By User Role
| Role | Features Tested | Pass Rate | Critical Issues |
|------|-----------------|-----------|-----------------|
| ADMIN | ___/20 | ___% | ___ |
| PARTNER | ___/15 | ___% | ___ |
| PRINCIPAL | ___/15 | ___% | ___ |
| PRACTICE_LEAD | ___/12 | ___% | ___ |
| MANAGER | ___/10 | ___% | ___ |
| SENIOR_CONSULTANT | ___/8 | ___% | ___ |
| EMPLOYEE | ___/6 | ___% | ___ |
| JUNIOR_CONSULTANT | ___/6 | ___% | ___ |
| CONTRACTOR | ___/6 | ___% | ___ |
| CLIENT_USER | ___/4 | ___% | ___ |

## Go/No-Go Decision Criteria

### ✅ GO (Production Ready)
- All CRITICAL tests pass
- 95%+ HIGH priority tests pass
- No security vulnerabilities
- Performance within acceptable limits
- All user roles functional

### ❌ NO-GO (Needs Fixes)
- Any CRITICAL test fails
- <90% HIGH priority tests pass
- Security concerns identified
- Major performance issues
- Core user workflows broken

This quick reference guide provides testing teams with efficient workflows to validate the Project Foundry PSA platform across all user personas while maintaining comprehensive coverage of critical functionality.
