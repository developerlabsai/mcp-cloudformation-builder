export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold text-foreground">
          MCP CloudFormation Builder
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          AI-native CloudFormation/Terraform generator with 99.5% first-deploy accuracy
        </p>
        <div className="pt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Internal API endpoint: <code className="bg-muted px-2 py-1 rounded">/api/internal/generate-cloudformation</code>
          </p>
          <p className="text-sm text-muted-foreground">
            This service is for internal use by DeveloperLabs AI products only.
          </p>
        </div>
        <div className="pt-8">
          <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-lg">
            ✅ Service Running on Port 3001
          </div>
        </div>
      </div>
    </div>
  );
}
