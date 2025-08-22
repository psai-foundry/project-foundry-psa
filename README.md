
# Project Foundry PSA Platform

## 🚀 Overview

Project Foundry PSA is a comprehensive Professional Services Automation platform built with Next.js, TypeScript, and PostgreSQL. It provides complete project management, resource allocation, capacity planning, and time tracking capabilities for professional services organizations.

## 📋 Key Features

### Core PSA Functionality
- **Project Management**: Complete project lifecycle management
- **Time Tracking**: Advanced timesheet system with multi-project support  
- **Client Management**: Client portal and relationship management
- **Team Collaboration**: Role-based access and team workflows

### Advanced Resource Management
- **Resource Allocation**: Dynamic resource assignment and tracking
- **Capacity Planning**: Weekly capacity management and utilization tracking
- **Workforce Management**: Employment type management and rate tracking
- **Utilization Analytics**: Real-time utilization reporting and forecasting

### Business Intelligence
- **Dashboard Analytics**: Executive and operational dashboards
- **Financial Reporting**: Revenue, cost, and profitability analysis
- **Resource Reports**: Utilization, allocation, and capacity reports
- **Custom Reports**: Flexible reporting engine

## 🏗️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Authentication**: NextAuth.js with role-based access
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Zustand, React Query
- **Forms**: React Hook Form with Zod validation

## 📊 Database Architecture

### Core Models
- User management with role-based permissions
- Project and task hierarchies
- Time tracking with multi-dimensional allocation
- Client and billing management

### Resource Management Models  
- Resource profiles with skill and capacity tracking
- Dynamic allocation system with project assignments
- Weekly capacity planning and forecasting
- Utilization tracking and optimization

### Analytics Models
- Performance metrics and KPIs
- Financial tracking and profitability analysis
- Resource utilization and planning data

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Yarn package manager

### Installation
```bash
# Clone repository
git clone <your-github-repo-url>
cd project-foundry-psa

# Install dependencies
cd app && yarn install

# Setup environment
cp .env.example .env.local
# Configure your database and auth settings

# Setup database
yarn prisma migrate dev
yarn prisma generate
yarn prisma db seed

# Start development server
yarn dev
```

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/psa_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Optional: Redis for caching
REDIS_URL="redis://localhost:6379"
```

## 🧪 Testing

### UAT Test Accounts
```
Admin: admin@test.com / TestUser123!
Manager: manager@test.com / TestUser123!  
Employee: employee@test.com / TestUser123!
Client: client@test.com / TestUser123!
```

### Running Tests
```bash
# Type checking
yarn tsc --noEmit

# Linting
yarn lint

# Database validation
yarn prisma validate

# Full application test
yarn build
```

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] Monitoring and logging setup
- [ ] Backup strategy implemented

### Deploy Commands
```bash
# Apply database migrations
yarn prisma migrate deploy

# Build application
yarn build

# Start production server
yarn start
```

## 📖 Documentation

- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Technical Specification](./TECHNICAL_SPECIFICATION.md)
- [UAT Test Scripts](./UAT_TEST_SCRIPTS.md)

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication with NextAuth.js
- Role-based access control (Admin, Manager, Employee, Client)
- Session management and CSRF protection
- Secure API endpoints with middleware validation

### Data Protection
- Database connection encryption
- Input validation and sanitization
- Secure file upload handling
- Regular security audits

## 🏢 Business Features

### Project Management
- Multi-client project tracking
- Task management with dependencies
- Project templates and workflows
- Budget and timeline tracking

### Resource Management  
- Real-time resource allocation
- Capacity planning and forecasting
- Skills-based resource matching
- Utilization optimization

### Financial Management
- Time and expense tracking
- Automated billing and invoicing
- Profitability analysis
- Budget management and reporting

### Reporting & Analytics
- Executive dashboards
- Operational metrics
- Custom report builder
- Data export capabilities

## 📞 Support

### Development Team
- **CTO Review Required**: All code changes require CTO approval
- **Database Changes**: Special review process for schema modifications
- **Security Issues**: Immediate escalation protocol

### Getting Help
1. Check documentation and existing issues
2. Review UAT test scenarios
3. Contact development team
4. Schedule technical review session

## 📝 License

This project is proprietary software owned by Project Foundry PSA.

---

**Current Version**: v2.1.0 (Resource Management Integration)  
**Last Updated**: August 2025  
**Status**: Production Ready

---

## 🎯 Quick Links

- [Live Application](https://your-domain.com)
- [GitHub Repository](https://github.com/your-org/project-foundry-psa)
- [Issue Tracker](https://github.com/your-org/project-foundry-psa/issues)
- [Wiki Documentation](https://github.com/your-org/project-foundry-psa/wiki)
