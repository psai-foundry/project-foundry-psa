
# Project Foundry PSA - Comprehensive UAT Test Scripts

## Test Environment Setup
- **Test URL**: Local development environment
- **Test Database**: Isolated test data
- **Browser**: Chrome/Firefox/Safari (test on multiple)

## Test User Credentials
| Role | Email | Password | Expected Access Level |
|------|--------|----------|----------------------|
| ADMIN | admin@foundry.com | TestUser123! | Full system access |
| PARTNER | partner@foundry.com | TestUser123! | Full business access |
| PRINCIPAL | principal@foundry.com | TestUser123! | Executive access |
| PRACTICE_LEAD | practicelead@foundry.com | TestUser123! | Practice management |
| MANAGER | manager@foundry.com | TestUser123! | Team management |
| SENIOR_CONSULTANT | seniorconsultant@foundry.com | TestUser123! | Project level access |
| EMPLOYEE | employee@foundry.com | TestUser123! | Basic employee access |
| JUNIOR_CONSULTANT | juniorconsultant@foundry.com | TestUser123! | Task level access |
| CONTRACTOR | contractor@foundry.com | TestUser123! | Limited contractor access |
| CLIENT_USER | client@foundry.com | TestUser123! | Read-only client access |

---

# TEST SCRIPT SUITE

## 1. AUTHENTICATION & AUTHORIZATION TEST SUITE

### TS-AUTH-001: Login/Logout Functionality
**Objective**: Verify authentication works for all user roles
**Priority**: High

**Test Steps**:
1. Navigate to login page
2. Attempt login with each test user credential
3. Verify successful login redirects to appropriate dashboard
4. Verify role-specific navigation menu appears
5. Logout and verify redirect to login page

**Expected Results**:
- All users can log in successfully
- Dashboard reflects role-appropriate content
- Navigation menu shows only permitted items
- Logout redirects to login page

**Test Data**: All test user credentials above

---

### TS-AUTH-002: Role-Based Access Control
**Objective**: Verify users can only access features permitted by their role
**Priority**: Critical

**Test Steps for Each Role**:
1. Login as user
2. Attempt to access each major feature area:
   - Dashboard
   - Projects
   - Clients
   - Time Tracking
   - Timesheets
   - Team Management
   - Reports
   - Settings
   - Admin Functions
   - Xero Integration

**Expected Results by Role**:

**ADMIN**: Full access to all features
- ✅ Dashboard, Projects, Clients, Time Tracking, Timesheets
- ✅ Team Management, All Reports, System Settings
- ✅ Xero Integration, Manual Overrides, Audit Logs

**PARTNER**: Business management access
- ✅ Dashboard, Projects (all), Clients (all), Time Tracking
- ✅ Timesheets (all), Team View, Executive Reports
- ✅ Financial Reports, Billing Rates
- ❌ System Administration, User Management

**PRINCIPAL**: Similar to Partner
- ✅ Dashboard, Projects (all), Clients (all), Time Tracking
- ✅ Timesheets (all), Team View, Executive Reports
- ✅ Financial Reports, Billing Rates
- ❌ System Administration

**PRACTICE_LEAD**: Practice-level management
- ✅ Dashboard, Projects (assigned), Clients (assigned)
- ✅ Time Tracking, Team Timesheets, Team Reports
- ✅ Approval workflows for team
- ❌ All clients/projects, Executive reports

**MANAGER**: Team management
- ✅ Dashboard, Projects (assigned), Clients (assigned)
- ✅ Time Tracking, Team Timesheets, Team Reports
- ✅ Timesheet approvals
- ❌ Financial reports, All projects

**SENIOR_CONSULTANT**: Project-level access
- ✅ Dashboard, Projects (assigned), Time Tracking
- ✅ Personal Reports, Timesheet submission
- ❌ Team management, Approvals, All projects

**EMPLOYEE**: Basic employee access
- ✅ Dashboard, Projects (assigned), Time Tracking
- ✅ Personal Reports, Timesheet submission
- ❌ Team management, Client management

**JUNIOR_CONSULTANT**: Task-level access
- ✅ Dashboard, Projects (assigned), Time Tracking
- ✅ Personal Reports, Timesheet submission
- ❌ Project management, Team features

**CONTRACTOR**: Limited access
- ✅ Dashboard, Projects (assigned), Time Tracking
- ✅ Personal Reports, Timesheet submission
- ❌ Internal team features, Full project access

**CLIENT_USER**: Read-only client access
- ✅ Dashboard (limited), Projects (own only)
- ✅ Personal Reports (project status)
- ❌ Time tracking, Internal features, Team access

---

## 2. DASHBOARD TEST SUITE

### TS-DASH-001: Dashboard Content by Role
**Objective**: Verify dashboard shows appropriate content for each role
**Priority**: High

**Test Steps**:
1. Login as each user role
2. Verify dashboard statistics cards display correctly
3. Check that role-specific quick actions appear
4. Verify charts and graphs load with appropriate data
5. Test responsive design on different screen sizes

**Expected Results by Role**:
- **Admin/Partner/Principal**: Executive stats, team performance, revenue metrics
- **Manager/Practice Lead**: Team stats, approval queues, utilization rates
- **Consultants/Employees**: Personal stats, assigned projects, time tracking
- **Client**: Project status, limited read-only information

---

### TS-DASH-002: Dashboard Interactivity
**Objective**: Verify interactive elements work correctly
**Priority**: Medium

**Test Steps**:
1. Test "Start Timer" button (for roles with time tracking)
2. Click on stat cards to navigate to detail pages
3. Interact with charts/graphs
4. Test quick action buttons
5. Verify real-time updates (if applicable)

**Expected Results**:
- Buttons navigate to correct pages
- Charts are interactive where expected
- Real-time elements update appropriately
- No broken links or 404 errors

---

## 3. PROJECT MANAGEMENT TEST SUITE

### TS-PROJ-001: Project Viewing Permissions
**Objective**: Verify users see only projects they should access
**Priority**: Critical

**Test Steps**:
1. Login as each user role
2. Navigate to Projects page
3. Verify project list shows appropriate projects
4. Attempt to access project details
5. Try to edit project information

**Expected Results**:
- **Admin/Partner/Principal**: See all projects
- **Practice Lead/Manager**: See assigned practice/team projects
- **Consultants/Employees**: See only assigned projects
- **Client**: See only their projects with limited detail

---

### TS-PROJ-002: Project Creation and Management
**Objective**: Verify project creation and editing works for authorized roles
**Priority**: High

**Test Cases for Authorized Roles (Admin, Partner, Principal)**:
1. Create new project with all required fields
2. Edit existing project details
3. Assign team members to projects
4. Set billing rates and budgets
5. Archive/deactivate projects

**Test Cases for Unauthorized Roles**:
1. Verify "Create Project" button not visible
2. Verify edit functions are disabled/hidden
3. Confirm read-only access where appropriate

**Expected Results**:
- Authorized roles can perform all project management tasks
- Unauthorized roles see read-only or limited views
- Form validation works correctly
- Changes save and persist properly

---

## 4. CLIENT MANAGEMENT TEST SUITE

### TS-CLIENT-001: Client Access Control
**Objective**: Verify client access is properly controlled by role
**Priority**: Critical

**Test Steps**:
1. Navigate to Clients page as each role
2. Verify client list shows appropriate clients
3. Test client detail views
4. Attempt client creation/editing
5. Test client contact management

**Expected Results**:
- **Admin/Partner/Principal**: Full client management access
- **Practice Lead/Manager**: Assigned clients only
- **Consultants/Employees**: Assigned clients, limited details
- **Client**: Own organization only, read-only

---

### TS-CLIENT-002: Client Data Management
**Objective**: Verify client data operations work correctly
**Priority**: Medium

**Test Steps for Authorized Roles**:
1. Create new client with contact information
2. Edit client details and contacts
3. Add multiple contacts to client
4. Set primary contact
5. Deactivate client

**Expected Results**:
- Client creation form validates properly
- Contact management functions work
- Data saves and updates correctly
- Inactive clients handled appropriately

---

## 5. TIME TRACKING TEST SUITE

### TS-TIME-001: Time Entry Functionality
**Objective**: Verify time tracking works for all user types
**Priority**: Critical

**Test Steps** (All roles except CLIENT_USER):
1. Start time timer for a project/task
2. Pause and resume timer
3. Stop timer and save entry
4. Create manual time entry
5. Edit time entry
6. Delete time entry
7. Submit timesheet

**Expected Results**:
- Timer starts, pauses, resumes, stops correctly
- Manual entries save with proper validation
- Time calculations are accurate
- Billable/non-billable status works
- Timesheet submission functions properly

---

### TS-TIME-002: Timesheet Approval Workflow
**Objective**: Verify approval process works correctly
**Priority**: Critical

**Test Steps**:
1. **Employee/Consultant**: Submit timesheet for approval
2. **Manager/Practice Lead**: 
   - View pending approvals
   - Approve timesheet
   - Reject timesheet with comments
3. **Employee**: View approval status and comments
4. **Admin**: Override approvals if needed

**Expected Results**:
- Submission workflow operates smoothly
- Approval notifications sent appropriately
- Status updates reflect in system
- Comments/feedback system works
- Override capabilities function for admins

---

## 6. REPORTING TEST SUITE

### TS-REPORT-001: Report Access by Role
**Objective**: Verify users access appropriate reports
**Priority**: High

**Test Steps**:
1. Navigate to Reports section
2. Verify available report types
3. Generate each available report
4. Test date range filters
5. Export functionality

**Expected Results by Role**:
- **Executive (Admin/Partner/Principal)**: All report types
- **Managers**: Team and project reports
- **Individual Contributors**: Personal reports only
- **Client**: Project status reports only

---

### TS-REPORT-002: Report Data Accuracy
**Objective**: Verify reports show accurate data
**Priority**: Critical

**Test Steps**:
1. Create test time entries
2. Generate utilization report
3. Verify hours match entries
4. Test financial calculations
5. Cross-check with raw data

**Expected Results**:
- Report calculations are accurate
- Filtering works correctly
- Export maintains data integrity
- Charts reflect correct information

---

## 7. XERO INTEGRATION TEST SUITE

### TS-XERO-001: Manual Sync Functionality
**Objective**: Verify manual Xero sync works for authorized users
**Priority**: High

**Test Steps** (Admin/Partner level):
1. Access manual sync dashboard
2. Select date range for sync
3. Perform dry-run validation
4. Execute actual sync
5. Review sync results
6. Handle sync errors

**Expected Results**:
- Manual sync interface accessible to authorized users
- Date selection and filtering work
- Dry-run provides accurate preview
- Sync completes successfully
- Error handling works appropriately

---

### TS-XERO-002: Validation Override System
**Objective**: Verify validation overrides work correctly
**Priority**: Medium

**Test Steps**:
1. Identify timesheet with validation errors
2. Create validation override
3. Apply override with justification
4. Review override in audit trail
5. Sync overridden timesheet

**Expected Results**:
- Override creation requires proper authorization
- Justification is mandatory and saved
- Audit trail records override activity
- Overridden items sync successfully

---

## 8. PERFORMANCE MONITORING TEST SUITE

### TS-PERF-001: Performance Dashboard
**Objective**: Verify performance monitoring works
**Priority**: Medium

**Test Steps**:
1. Access performance dashboard (Admin only)
2. View real-time metrics
3. Check system health indicators
4. Review performance trends
5. Test alert thresholds

**Expected Results**:
- Performance metrics display correctly
- Real-time updates function
- Historical trends show properly
- Alerts trigger appropriately

---

## 9. AUDIT TRAIL TEST SUITE

### TS-AUDIT-001: Audit Logging
**Objective**: Verify all critical actions are logged
**Priority**: High

**Test Steps**:
1. Perform various actions across the system
2. Access audit log (Admin only)
3. Verify actions are recorded
4. Test audit log filtering
5. Check retention policies

**Expected Results**:
- All critical actions logged with details
- User attribution accurate
- Timestamps correct
- Filtering and search work
- Data retention follows policy

---

## 10. SYSTEM ADMINISTRATION TEST SUITE

### TS-ADMIN-001: User Management
**Objective**: Verify user management functions (Admin only)
**Priority**: High

**Test Steps**:
1. Create new user account
2. Modify user permissions
3. Deactivate user account
4. Reset user password
5. Manage role assignments

**Expected Results**:
- User creation/modification works
- Permission changes apply immediately
- Deactivation prevents login
- Password resets function
- Role changes affect access properly

---

## 11. DATA INTEGRITY TEST SUITE

### TS-DATA-001: Data Consistency
**Objective**: Verify data remains consistent across operations
**Priority**: Critical

**Test Steps**:
1. Create related records (client, project, time entries)
2. Perform various operations
3. Verify relationships maintained
4. Test cascading updates/deletes
5. Check referential integrity

**Expected Results**:
- Related data stays synchronized
- Updates propagate correctly
- Cascading operations work safely
- No orphaned records created

---

## TEST EXECUTION GUIDELINES

### Pre-Test Checklist
- [ ] Test environment is clean and prepared
- [ ] All test user accounts are created and verified
- [ ] Test data is loaded and appropriate
- [ ] Browser cache is cleared
- [ ] Network connectivity is stable

### During Testing
- Document all defects immediately
- Take screenshots of unexpected behavior
- Note response times and performance issues
- Record exact steps to reproduce issues
- Test on multiple browsers where applicable

### Post-Test Activities
- Compile defect report with severity levels
- Create test execution summary
- Document any blockers or critical issues
- Provide recommendations for production readiness

### Success Criteria
- **Critical**: 100% pass rate (security, data integrity, core workflows)
- **High**: 95% pass rate (main features, user interfaces)
- **Medium**: 85% pass rate (nice-to-have features, edge cases)
- **Low**: 75% pass rate (minor UI issues, performance optimizations)

### Defect Severity Classification
- **Critical**: System unusable, data corruption, security breach
- **High**: Major feature broken, significant user impact
- **Medium**: Minor feature issue, workaround available
- **Low**: Cosmetic issue, minimal impact

---

## ROLE-SPECIFIC TEST EXECUTION PLAN

### Phase 1: Core Authentication (All Roles)
Execute TS-AUTH-001, TS-AUTH-002 for all user roles

### Phase 2: Role-based Feature Testing
- **Admin**: Execute all test suites
- **Partner/Principal**: Focus on business management features
- **Practice Lead/Manager**: Focus on team management features  
- **Consultants/Employees**: Focus on personal productivity features
- **Client**: Focus on read-only access verification

### Phase 3: Integration Testing
Execute Xero integration, performance monitoring, and audit trail tests

### Phase 4: Data Integrity and Security
Execute data consistency and security validation tests

### Phase 5: User Acceptance Validation
Real-world scenario testing with actual business workflows

---

This comprehensive test suite ensures thorough validation of the Project Foundry PSA platform across all user roles and feature areas. Each test script includes clear objectives, detailed steps, and expected results to guide the testing team through systematic UAT execution.
