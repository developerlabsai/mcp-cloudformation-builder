# Query Developer Constitution (RAG)

Query the knowledge base for relevant rules and guidelines using Pinecone RAG.

## Arguments:
$ARGUMENTS - Your question about rules, best practices, or guidelines

## How It Works:
1. Your question is converted to an embedding using OpenAI
2. Pinecone finds the most relevant rule chunks (top 5)
3. Those rules are injected into the response context
4. Claude answers with governance-aware guidance

## Available Namespaces:
- security-compliance: Security & compliance rules
- infrastructure-as-code: IaC governance (Terraform, CloudFormation)
- ci-cd-governance: CI/CD pipeline rules
- code-quality: Coding style and quality standards
- api-governance: API design and governance
- data-governance: Data handling rules
- observability-reliability: Monitoring and reliability
- cost-governance: Cost management rules
- ai-code-policies: AI usage policies
- cloudformation-rules: CloudFormation-specific rules
- project-patterns: Project-specific patterns

## Example Queries:
- "What are the security requirements for storing API keys?"
- "How should I structure a CloudFormation template?"
- "What are the rules for error handling?"
- "What cost considerations should I have for RDS?"
- "What are the code review requirements?"

## Steps:
1. Parse the question from $ARGUMENTS
2. Call the RAG query function to get relevant rules
3. Present the retrieved rules with source references
4. Answer the question based on the retrieved context

## Note:
If the knowledge base is not yet populated, run:
```bash
npx ts-node src/lib/rag/populate-knowledge-base.ts
```
