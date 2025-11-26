# MCP CloudFormation Builder

**AI-native CloudFormation/Terraform generator with 99.5% first-deploy accuracy**

---

## 🎯 **Overview**

The MCP CloudFormation Builder is the core infrastructure orchestration engine that powers DeveloperLabs AI products. It provides:

- **CloudFormation Generation**: AI-powered template generation from GitHub repositories
- **Self-Healing System**: Automatic error detection and fixing via pattern database
- **MCP Orchestration**: Model Context Protocol integration for Claude-powered infrastructure
- **Pattern Database**: Network-effects driven accuracy improvement (99.5%+ success rate)
- **Terraform Support**: Multi-IaC format generation
- **Cost Estimation**: AWS pricing API integration

---

## 🔒 **IMPORTANT: This is a PRIVATE repository**

This codebase contains DeveloperLabs AI's proprietary orchestration engine. It is NOT distributed to white-label clients. External products (lead-magnet, ISV demo) call this via internal API.

---

## 🏗️ **Architecture**

```
External Products (lead-magnet, ISV demo)
    ↓
Internal API (/api/internal/*)
    ↓
MCP CloudFormation Builder (THIS REPO)
    ├── CloudFormation Generator
    ├── Self-Healing Engine
    ├── Pattern Database
    ├── RAG System
    └── AWS Deployment
```

---

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+
- Supabase account
- AWS account with appropriate permissions
- Anthropic API key

### Installation

```bash
# Clone repository
cd ~/Projects/mcp-cloudformation-builder

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
# (Connect to your Supabase project first)

# Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

---

## 📚 **API Documentation**

### Internal API Endpoints

These endpoints are for internal use by other DeveloperLabs products only. They require `INTERNAL_API_SECRET` authentication.

#### `POST /api/internal/generate-cloudformation`

Generate CloudFormation template from GitHub repository.

**Request**:
```json
{
  "repository_url": "https://github.com/user/repo",
  "environment": "dev" | "staging" | "prod",
  "region": "us-east-1",
  "partner_id": "uuid",
  "user_id": "uuid",
  "options": {
    "enable_healing": true,
    "use_pattern_db": true,
    "cost_analysis": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "template": "AWSTemplateFormatVersion: '2010-09-09'...",
  "metadata": {
    "accuracy_score": 99.5,
    "healing_applied": false,
    "pattern_db_hit": true,
    "generation_time_ms": 850,
    "estimated_cost": {
      "monthly": 247.50,
      "currency": "USD"
    }
  }
}
```

---

## 🧠 **Core Components**

### 1. CloudFormation Generator (`src/lib/cloudformation/`)
- `generator.ts` - Main generation logic
- `validator.ts` - AWS template validation
- `healer.ts` - Kiro self-healing engine
- `orchestrator.ts` - MCP/SpecKit orchestration

### 2. Self-Healing System (`src/lib/self-healing/`)
- `pattern-detector.ts` - Error pattern recognition
- `auto-fix-generator.ts` - Automatic fix generation
- `intelligence-report-generator.ts` - Analysis and insights

### 3. Repository Analysis (`src/lib/repo-analysis/`)
- `analyzer.ts` - Repository structure analysis
- `github-api.ts` - GitHub API integration

### 4. AWS Integration (`src/lib/aws/`)
- `sdk-utils.ts` - AWS SDK utilities
- `pricing.ts` - AWS Pricing API
- `pricing-models.ts` - Cost calculation logic

---

## 🗄️ **Database Schema**

### Core Tables
- `cloudformation_templates` - Generated templates
- `template_deployment_logs` - Deployment tracking
- `template_auto_fixes` - Self-healing patterns
- `repository_version_tracking` - SpecKit cache
- `error_solutions` - Pattern database (CRITICAL - Network effects moat)

### Supporting Tables
- `pricing_cache` - AWS pricing data
- `user_github_analyses` - Analysis history
- `terraform_generations` - Terraform templates
- `credit_system` - Usage tracking

---

## 🔧 **Development**

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Environment Variables
See `.env.example` for required environment variables.

---

## 📊 **Success Metrics**

### Technical Metrics
- CloudFormation generation accuracy: **>99.5%**
- API response time: **<2 seconds (P95)**
- Pattern database hit rate: **>80%**
- Self-healing success rate: **>95%**

### Business Metrics
- API calls per day
- Cost per generation
- Error rate: **<0.5%**

---

## 🚢 **Deployment**

### Production Infrastructure
- **Platform**: Vercel (Next.js API routes)
- **Database**: Supabase (PostgreSQL)
- **AWS**: For deployment testing and pricing
- **Domain**: `api-internal.developerlabs.ai` (internal only)

### Deployment Steps
1. Push to `main` branch
2. Vercel auto-deploys
3. Run database migrations on production Supabase
4. Verify internal API endpoints
5. Update `INTERNAL_API_SECRET` in consuming services

---

## 📖 **Documentation**

- [API Documentation](docs/API.md)
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Self-Healing System](docs/SELF_HEALING.md)

---

## 🔐 **Security**

- Internal API requires `INTERNAL_API_SECRET` header
- Database uses Row-Level Security (RLS)
- AWS credentials stored in environment variables (never in code)
- All API calls logged for audit trail

---

## 📝 **License**

Proprietary - DeveloperLabs AI

---

## 📞 **Support**

For internal support: clance@developerlabs.ai

---

**Built with ❤️ by DeveloperLabs AI**
