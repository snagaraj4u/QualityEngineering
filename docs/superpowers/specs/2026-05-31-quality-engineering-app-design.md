# Quality Engineering App — Design Specification

**Date:** 2026-05-31  
**Status:** Design Approved  
**Project:** Quality Engineering Platform (Hybrid: Web + CLI)

---

## Executive Summary

A comprehensive, framework-agnostic Quality Engineering platform that enables QA engineers and test leads to:
- Generate intelligent test cases from Jira requirements and video uploads
- Support multiple testing frameworks (BDD, hybrid frameworks, etc.)
- Integrate with existing Cucumber.js and other testing frameworks
- Create and track defects in QMetry
- Visualize quality metrics and test execution data

**Key Innovation:** Intelligent backend skill selection that routes test case generation through framework-specific and design-pattern-specific Claude API prompts.

---

## Project Scope

### Users
- **QA Engineers:** Create test cases, run tests, upload reference materials
- **Test Leads:** Monitor dashboards, track metrics, manage defect resolution

### Timeline
- Flexible (no hard deadline)

### Tech Stack
- **Frontend:** React 18, Next.js, Tailwind CSS
- **Backend:** Node.js, Express, PostgreSQL
- **CLI:** Node.js with Commander.js
- **AI Engine:** Claude API with intelligent prompt routing
- **Deployment:** Vercel (web), npm (CLI)
- **Auth:** OAuth 2.0 (Jira), API Keys (QMetry)

---

## Architecture

### Design Pattern: Framework Adapter + Intelligent Skill Router

```
User Input (Jira/Upload/Video) 
    ↓
Skill Router (Framework + Design Pattern → Prompt Selection)
    ↓
Claude API (Framework-Specific Prompt)
    ↓
Test Case Generation
    ↓
Framework Adapter (Format to Target Framework)
    ↓
Integration Engine (Write to Project)
```

### Core Components

**1. Framework Adapter System**
- Adapter for each supported framework (Cucumber.js, Cypress, Jest, Selenium, etc.)
- Each adapter defines: syntax rules, file structure, test execution, result parsing
- Framework-agnostic core model for test cases
- Adapters translate between core model and framework-specific format

**2. Intelligent Skill Router**
- Routes test case generation based on two factors:
  1. **Selected Framework** (Cucumber, Cypress, Jest, etc.)
  2. **Test Design Pattern** (BDD, Unit Testing, E2E Testing, API Testing, etc.)
- Maintains skill registry with prompt mappings
- Selects and executes appropriate Claude API prompt
- Returns formatted test cases to adapter for final output

**3. Configurable Integration Engine**
- **Jira Integration:** Fetch user stories, requirements, acceptance criteria
  - Support: Jira Cloud, Server, Data Center
  - Configurable per client/project
- **QMetry Integration:** Create/link defects
  - Support: Jira plugin or standalone
  - Configurable per client
- **Secure credential storage** for multiple client instances

**4. Video Processing Pipeline**
- Upload and analyze test execution videos
- Extract test steps and actions
- Generate test case candidates via Claude API
- Support AI analysis, simple storage, or reference-only modes

---

## Four Core Sections

### **Section 1: Test Case Builder**

**Inputs:**
- Manual requirement/user story input
- Jira fetch: user stories, acceptance criteria
- File upload: existing test cases
- Video upload: recorded test executions or walkthroughs

**Processing:**
- Parse requirements into structured format
- Run video analysis (optional AI extraction)
- Route through Skill Router based on selected framework + design pattern
- Generate test cases via Claude API
- Format via Framework Adapter

**Outputs:**
- Framework-specific test case files
- Preview before integration
- Option to edit/refine before saving

**For Both Users:**
- QA Engineers: Generate and refine test cases
- Test Leads: Approve/review generated test cases

---

### **Section 2: BDD Framework Integration**

**Inputs:**
- Generated test cases from Section 1
- Existing test files for integration

**Processing:**
- Use Framework Adapter to validate syntax
- Generate project structure as needed
- Write files to project repository
- Create git commits for traceability

**Execution:**
- CLI tool to run integrated tests
- Capture execution logs and results
- Parse results into structured format
- Sync results to dashboard

**Outputs:**
- Integrated test cases in project
- Execution logs and artifacts
- Pass/fail metrics

---

### **Section 3: Defect Management**

**Inputs:**
- Failed test cases from Section 2
- Manual defect creation
- Test case references

**Processing:**
- Map test failure to QMetry fields
- Use stored client config to connect to QMetry
- Create defect with context (test case, error details, environment)

**Integrations:**
- QMetry API (Jira plugin or standalone)
- Auto-link failed tests to created defects
- Bi-directional sync for status updates

**Outputs:**
- Defects created in QMetry
- Defect links stored in database
- Status tracking on dashboard

---

### **Section 4: Dashboard**

**For QA Engineers:**
- Test execution history and trends
- Test case coverage by framework
- Failure analysis and debugging links
- Recent generated test cases

**For Test Leads:**
- Project overview and health metrics
- Defect status and resolution trends
- Team test execution performance
- Framework distribution and gaps

**Common Features:**
- Configurable date ranges
- Filter by framework, project, design pattern
- Export reports (PDF, CSV)

---

## Intelligent Skill Selection System

### Skill Router Logic

```
Framework (e.g., Cucumber) + Design Pattern (e.g., BDD UI Testing)
    ↓
Query Skill Registry
    ↓
Load Prompt Template
    ↓
Execute Claude API with Framework + Pattern Context
    ↓
Parse Results & Validate Syntax
    ↓
Return to Framework Adapter
```

### Example Skill Mappings

| Framework | Design Pattern | Skill Name | Focus |
|-----------|-----------------|-----------|-------|
| Cucumber | BDD UI Testing | `cucumber-bdd-ui` | Gherkin syntax, Given/When/Then, UI interactions |
| Cucumber | API Testing | `cucumber-api-bdd` | API endpoints, requests/responses, assertions |
| Jest | Unit Testing | `jest-unit` | Component logic, mocking, assertions |
| Jest | Integration Testing | `jest-integration` | Multiple component interactions, setup/teardown |
| Cypress | E2E Testing | `cypress-e2e` | User workflows, selectors, assertions, waits |
| Selenium | Cross-Browser | `selenium-cross-browser` | XPath, multi-browser support, waits |

### Extensibility
- New frameworks: Add adapter + skill mappings
- New patterns: Add skill prompt + mapping
- Prompts versioned and maintained in Skill Registry

---

## Data Model

### Test Case

```typescript
{
  id: string;
  projectId: string;
  title: string;
  description: string;
  framework: string; // "cucumber", "jest", "cypress", etc.
  designPattern: string; // "bdd-ui", "unit", "api", etc.
  sourceType: "manual" | "jira" | "upload" | "video"; // How it was created
  content: string; // Framework-specific test case code
  jiraLinkage?: {
    storyId: string;
    storyTitle: string;
    acceptanceCriteria: string[];
  };
  videoReference?: {
    uploadedUrl: string;
    analysisResults: string;
  };
  status: "draft" | "approved" | "integrated" | "executed";
  lastModified: Date;
  createdBy: string; // User ID
}
```

### Defect

```typescript
{
  id: string;
  qmetryId: string; // External ID in QMetry
  testCaseId: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  severity: string;
  description: string;
  failureDetails: string;
  linkedTestRuns: string[];
  createdDate: Date;
  resolvedDate?: Date;
}
```

### Execution Result

```typescript
{
  id: string;
  testCaseId: string;
  framework: string;
  environment: string;
  status: "pass" | "fail" | "skipped";
  errorMessage?: string;
  duration: number;
  timestamp: Date;
  cliVersion: string;
}
```

---

## Integrations

### Jira Integration

**Supported Versions:** Cloud, Server, Data Center

**Features:**
- Fetch user stories with acceptance criteria
- Fetch requirements and descriptions
- Create/link issues for traceability
- Bidirectional sync for test case status

**Configuration:**
- Per-project Jira instance URL
- OAuth 2.0 or API token auth
- Customizable field mappings

### QMetry Integration

**Supported Modes:**
- Jira plugin (integrated within Jira)
- Standalone application

**Features:**
- Create defects from failed tests
- Link test cases to defects
- Sync defect status updates
- Customizable field mappings

**Configuration:**
- Per-project QMetry endpoint
- API credentials (client-provided)
- Field mapping templates

---

## Security & Multi-Tenancy

- **Client Isolation:** Each client's data, credentials, Jira/QMetry configs stored separately
- **Credential Management:** Encrypt stored API keys and tokens
- **RBAC:** Role-based access (QA Engineer, Test Lead, Admin)
- **Audit Logging:** Track all test case generation, defect creation, integrations
- **Rate Limiting:** Claude API quota management per client/project

---

## Success Criteria

1. ✅ Generate valid test cases in multiple frameworks from requirements
2. ✅ Successfully integrate generated test cases into Cucumber.js project
3. ✅ Create defects in QMetry from failed tests
4. ✅ Dashboard shows meaningful metrics for both user types
5. ✅ Support flexible framework selection per user/project
6. ✅ Intelligent prompt selection based on framework + design pattern
7. ✅ Extensible architecture for adding new frameworks
8. ✅ Multi-client support with configurable Jira/QMetry

---

## Known Constraints & Decisions

1. **Flexible Timeline:** No hard deadline; prioritization flexible based on user feedback
2. **AI-Based Video Analysis:** Requires Claude API; quality depends on video clarity and frame rate
3. **Framework Support Roadmap:** Start with Cucumber.js (primary), expand to Cypress, Jest, Selenium
4. **Skill Registry:** Maintained in codebase; new frameworks/patterns require code deployment
5. **Multi-Tenant Cost:** Claude API costs scale with usage; consider per-client quotas

---

## Next Steps

1. Write implementation plan with phases and milestones
2. Set up project structure and repository
3. Begin Phase 1: Foundation & Integrations
4. Iterate based on user feedback
