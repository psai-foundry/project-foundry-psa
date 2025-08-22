
# Contributing to Project Foundry PSA

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Development integration branch
- `feature/*` - Feature development branches
- `hotfix/*` - Critical bug fixes

### Code Review Process

1. **Feature Development**
   ```bash
   git checkout -b feature/your-feature-name
   # Make your changes
   git commit -m "[feature] Add new capability"
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Use the PR template provided
   - Include detailed description of changes
   - Tag database schema changes with `[schema]` in commit message
   - Request review from CTO/Technical Management

3. **Review Requirements**
   - All automated checks must pass
   - CTO approval required for merging
   - Database changes require special review

### Database Schema Management

#### Schema Changes
- Always create migrations for schema changes
- Test migrations on development environment first
- Document migration impact and rollback strategy

#### Commands for Schema Management
```bash
# Generate migration after schema changes
cd app && yarn prisma migrate dev --name descriptive_name

# Apply migrations to production
cd app && yarn prisma migrate deploy

# Reset development database
cd app && yarn prisma migrate reset

# Generate Prisma client
cd app && yarn prisma generate
```

### Code Quality Standards

#### TypeScript
- Strict type checking enabled
- No `any` types without justification
- Proper error handling and null checks

#### Database Operations
- Use Prisma ORM for all database interactions
- Implement proper error handling
- Use transactions for multi-step operations

#### Authentication & Security
- NextAuth.js for authentication
- Proper role-based access control
- Secure API endpoints with middleware

### Testing Requirements

#### UAT Testing
- All test scenarios must pass before PR approval
- Test with all user roles (Admin, Manager, Employee, Client)
- Verify resource management functionality

#### Manual Testing Checklist
- [ ] Login/logout functionality
- [ ] Role-based access control
- [ ] Timesheet functionality
- [ ] Project management
- [ ] Resource allocation
- [ ] Capacity planning
- [ ] Reporting features

### Deployment Process

1. **Pre-deployment Checklist**
   - [ ] All tests pass
   - [ ] Database migrations ready
   - [ ] Environment variables updated
   - [ ] Backup strategy confirmed

2. **Deployment Steps**
   ```bash
   # Apply database migrations
   yarn prisma migrate deploy
   
   # Build application
   yarn build
   
   # Deploy to production
   # (deployment method depends on hosting)
   ```

## Repository Structure

```
project-foundry-psa/
├── app/                    # Next.js application
│   ├── components/         # Reusable UI components
│   ├── pages/             # Next.js pages and API routes
│   ├── prisma/            # Database schema and migrations
│   ├── lib/               # Utility functions and configurations
│   └── styles/            # Global styles and Tailwind config
├── scripts/               # Database and utility scripts
├── .github/               # GitHub workflows and templates
└── docs/                  # Project documentation
```

## Database Schema Documentation

The application uses a comprehensive schema supporting:
- User management and authentication
- Project and task management  
- Time tracking and timesheets
- Resource and capacity management
- Client and billing management
- Reporting and analytics

Key models include:
- `User`, `Project`, `Task`, `TimeEntry`
- `Resource`, `ResourceAllocation`, `CapacityAllocation`
- `Client`, `Invoice`, `ProjectResourceAllocation`

## Getting Help

For questions or issues:
1. Check existing documentation
2. Review GitHub issues
3. Contact the development team
4. Schedule code review session with CTO
