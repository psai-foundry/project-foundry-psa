
# Database Schema Documentation

## Overview
Project Foundry PSA uses PostgreSQL with Prisma ORM for database management. The schema supports comprehensive PSA functionality including resource management, capacity planning, and project tracking.

## Core Models

### User Management
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  username      String?  @unique
  firstName     String?
  lastName      String?
  role          UserRole @default(EMPLOYEE)
  // ... additional fields
}

enum UserRole {
  ADMIN
  MANAGER
  EMPLOYEE
  CLIENT
}
```

### Project Management
```prisma
model Project {
  id          String      @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  clientId    String?
  managerId   String?
  // ... relationships and additional fields
}

enum ProjectStatus {
  ACTIVE
  COMPLETED
  ON_HOLD
  CANCELLED
}
```

### Resource Management
```prisma
model Resource {
  id              String         @id @default(cuid())
  userId          String         @unique
  employmentType  EmploymentType @default(FULL_TIME)
  hourlyRate      Float?
  utilization     Float          @default(1.0)
  // ... additional fields and relationships
}

model ResourceAllocation {
  id           String          @id @default(cuid())
  resourceId   String
  projectId    String?
  allocationType AllocationType @default(PROJECT)
  percentage   Float
  startDate    DateTime
  endDate      DateTime?
  // ... relationships
}
```

### Capacity Planning
```prisma
model CapacityAllocation {
  id              String    @id @default(cuid())
  resourceId      String
  totalCapacity   Float
  allocatedHours  Float     @default(0)
  availableHours  Float
  weekStarting    DateTime
  // ... relationships
}
```

## Enums

### Employment & Resource Types
- `EmploymentType`: FULL_TIME, PART_TIME, CONTRACT, FREELANCE
- `AllocationType`: PROJECT, INTERNAL, TRAINING, LEAVE
- `PriorityLevel`: LOW, MEDIUM, HIGH, CRITICAL
- `RiskLevel`: LOW, MEDIUM, HIGH, CRITICAL

### Project & Task Status
- `ProjectStatus`: ACTIVE, COMPLETED, ON_HOLD, CANCELLED
- `TaskStatus`: TODO, IN_PROGRESS, REVIEW, DONE, CANCELLED
- `TaskPriority`: LOW, MEDIUM, HIGH, URGENT

## Key Relationships

### Project Ecosystem
- Projects belong to Clients
- Projects have Managers (Users)
- Projects contain Tasks
- Projects have Resource Allocations

### Resource Management
- Resources are linked to Users (1:1)
- Resources have multiple Allocations
- Resources have Capacity tracked weekly
- Resources can be allocated to Projects or Internal work

### Time Tracking
- Users log Time Entries against Tasks
- Time Entries roll up to Projects
- Time tracking integrates with Resource Allocation

## Migration Strategy

### Schema Evolution
1. Always create migrations for changes
2. Test migrations on development first
3. Backup production before applying
4. Document rollback procedures

### Common Migration Commands
```bash
# Create new migration
yarn prisma migrate dev --name descriptive_name

# Apply to production  
yarn prisma migrate deploy

# Reset development DB
yarn prisma migrate reset
```

## Indexes and Performance

Key indexes for performance:
- User email (unique)
- Project-Client relationships
- Resource-User relationships  
- Time Entry date ranges
- Allocation date ranges

## Data Integrity

### Constraints
- Foreign key relationships enforced
- Enum constraints on status fields
- Date validation (start < end)
- Percentage validations (0-100%)

### Business Rules
- Resource utilization cannot exceed 100%
- Allocation percentages must sum correctly
- Time entries require valid Task assignments
- Project dates must be logical

## Backup & Recovery

### Backup Strategy
- Daily automated backups
- Pre-migration snapshots
- Export capabilities for data migration

### Recovery Procedures
- Point-in-time recovery available
- Migration rollback procedures
- Data consistency validation

## Security Considerations

### Access Control
- Row-level security where applicable  
- Role-based data access
- Audit trail for critical changes

### Data Protection
- Sensitive data encryption
- Secure connection requirements
- Regular security audits

---
**Last Updated:** August 2025
**Schema Version:** v2.1 (Resource Management Integration)
