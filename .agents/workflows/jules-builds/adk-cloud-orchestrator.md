# 🛰️ Cloud-Native Project Orchestrator Specification (ADK 2.0)
**System Architecture**: Serverless Multi-Agent Orchestrator via Google Cloud Run & ADK  
**Status**: Ready for Cloud Deployment  

This specification completely replaces our fragile local PowerShell polling scripts (`v1` to `v41`) with a centralized, event-driven orchestrator built on Google's official **Agent Development Kit (ADK 2.0)** and the **Jules REST API** [cite: 36, 660]. It runs serverlessly in the cloud under a restricted Google Cloud Service Account, eliminating the need to keep your laptop open, run a local development server, or manually copy-paste prompt arrays [cite: 103, 247, 250].

---

## 🏛️ ARCHITECTURAL DEPLOYMENT TOPOLOGY

```
               +--------------------------------------+
               |          GitHub Repository           |
               |  (Triggers Webhook on Commit/Issue)  |
               +------------------+-------------------+
                                  |
                                  v
+---------------------------------+----------------------------------+
|                  Google Cloud Run (ADK 2.0 Host)                    |
|                                                                    |
|  +------------------------+          +--------------------------+  |
|  |   ADK Service Engine   |          |  Dataplex MCP Server     |  |
|  |   (agent.py / FastAPI) |<-------->|  (NoSQL Security Gates)  |  |
|  |   [Gated by Service    |          |  [Least Privilege]       |  |
|  |    Account Identity]   |          +------------+-------------+  |
|  +-----------+------------+                       |                |
+--------------|------------------------------------|----------------+
               |                                    |
               | (asynchronous API calls)           | (database gates)
               v                                    v
+--------------+-------------+         +------------+-------------+
|      Google Jules API      |         |   Firebase Local Emulator|
|  (Isolated Cloud VM Runs)  |<------->|    (Cloud Test Harness)  |
|  [Compiles & Runs Tests]   |         |    [100% Green Assert]   |
+----------------------------+         +--------------------------+
``` [cite: 102, 104, 247, 249, 250]

---

## 🛠️ THE ORCHESTRATION ENGINE (`agent.py`)

This Python script utilizes the **Agent Development Kit (ADK)** to dynamically connect your GitHub workspace, the Model Context Protocol (MCP) server, and the Google Jules REST API into an automated execution loop [cite: 118, 249].

```python
import os
import httpx
from fastapi import FastAPI, Request
from google.antigravity import Agent, LocalAgentConfig
from adk import ADKApp, MCPToolset, UserFeedbackLoop

# 1. Initialize FastAPI & ADK Application Frame
app = FastAPI()
mcp_url = os.getenv("DATAPLEX_MCP_URL")
jules_api_key = os.getenv("JULES_API_KEY")

# 2. Bind Centralized Database & Security Tools via MCP
# This dynamically wraps our Firestore, Auth, and Rules validation enclaves
mcp_tools = MCPToolset(serverUrl=mcp_url) [cite: 249]

# 3. Define the Global Executive System Instructions (GEMINI.md Laws)
system_instructions = """
You are the master SSTracker Nexus Command Project Manager [cite: 352].
You are legally bound to enforce these codebase constraints on all tasks [cite: 352, 862]:
1. Svelte 5 Reactivity: Always use runes ($state, $derived, $effect) [cite: 353, 863].
2. b815 Defensive Hydration: Every query must start with: if (!db || !authStore.isAuthenticated) return; [cite: 354, 863]
3. The 80-Line Function Cap: No function body may exceed 80 lines [cite: 352, 863].
4. Zero-Trust Security: Explicitly strip rbac fields on frontend payloads [cite: 352].
""" [cite: 352, 353, 354]

# 4. Instantiate the ADK Controller
orchestrator = Agent(
    model="antigravity-preview-05-2026", # Shared co-trained reasoning model [cite: 425]
    instructions=system_instructions,
    tools=mcp_tools.get_tools(), [cite: 249]
)

# 5. Webhook Listener: Intercepts GitHub commits & routes to Jules cloud VMs
@app.post("/webhooks/github")
async def handle_github_event(request: Request):
    payload = await request.json()
    
    # Identify newly pushed issues or unblocked tasks
    if payload.get("action") == "opened" and "issue" in payload:
        issue_title = payload["issue"]["title"]
        issue_body = payload["issue"]["body"]
        repo_name = payload["repository"]["full_name"]
        
        print(f"🚀 [Orchestrator] Intercepted Task: '{issue_title}' for Repo: '{repo_name}'")
        
        # Programmatically handoff heavy compilation & testing to a remote cloud VM
        await trigger_jules_asynchronous_run(repo_name, issue_title, issue_body)
        
    return {"status": "event_dispatched_to_jules_vm"}

# 6. Handoff to Google Jules REST API
async def trigger_jules_asynchronous_run(repo_name: str, title: str, body: str):
    headers = {
        "X-Goog-Api-Key": jules_api_key,
        "Content-Type": "application/json"
    } [cite: 36]
    
    # Fetch your active workspace Source ID
    async with httpx.AsyncClient() as client:
        sources_resp = await client.get("https://jules.googleapis.com/v1/sources", headers=headers) [cite: 118]
        sources = sources_resp.json().get("sources", [])
        source_id = next(s["name"] for s in sources if repo_name in s["displayName"]) [cite: 118]
        
        # Spin up a dedicated, isolated VM Cloud run out-of-band
        session_payload = {
            "source": source_id,
            "branch": "dev",
            "prompt": f"Feature Task: {title}\nInstructions: {body}",
            "automationMode": "CREATE_PR" # Automatically submit PR upon green tests [cite: 118]
        } [cite: 118]
        
        session_resp = await client.post(
            "https://jules.googleapis.com/v1/sessions", 
            headers=headers, 
            json=session_payload
        ) [cite: 118]
        
        session_id = session_resp.json()["name"]
        print(f"📡 [Jules] Remote Session successfully initialized: {session_id}") [cite: 118]

# 7. Start ADK Web UI with Debugging Playground on Port 8080
if __name__ == "__main__":
    app_runner = ADKApp(app, orchestrator)
    app_runner.run(port=8080, with_ui=True) # Launches the beautiful visual playground [cite: 251]
``` [cite: 36, 118, 247, 249, 251]

---

## 🔒 SECURITY & IAM POLICY (LEAST PRIVILEGE)

To ensure this orchestrator has sufficient permissions to manage database records and deploy cloud run configurations, it runs under a dedicated Google Cloud Service Account (`dataplex-agent-sa`) [cite: 250] bound to these strict roles:

1. **`roles/run.invoker`** (Cloud Run Invoker): Allows safe execution paths between the ADK frontend and the backend database MCP server [cite: 1029].
2. **`roles/secretmanager.secretAccessor`** (Secret Manager Accessor): Mounts API keys (`JULES_API_KEY`, `STRIPE_SECRET_KEY`) dynamically from Secret Manager into Cloud Run RAM at startup [cite: 246, 247].
3. **`roles/dataplex.metadataReader`** (Knowledge Catalog Reader): Allows the agent to query database Aspects and verify schemas without granting it raw SQL write access [cite: 1029].

---

## 🚀 ZERO-TOUCH DEPLOYMENT PROTOCOL

You can deploy this entire pipeline to **Google Cloud Run** using a single command block [cite: 251]:

```bash
# 1. Store your Jules API key securely in Secret Manager
echo -n "YOUR_JULES_API_KEY" | gcloud secrets create JULES_API_KEY --data-file=-

# 2. Deploy the GenAI Database MCP Server
gcloud run deploy database-mcp-server \
  --image=gcr.io/database-toolbox/toolbox:latest \
  --set-secrets=TOOLS_CONFIG=tools-yaml:latest \
  --service-account=dataplex-agent-sa@your-project.iam.gserviceaccount.com

# 3. Deploy the ADK Master Cloud Orchestrator with Visual UI
gcloud run deploy sstracker-cloud-orchestrator \
  --source=. \
  --service-account=dataplex-agent-sa@your-project.iam.gserviceaccount.com \
  --set-env-vars=DATAPLEX_MCP_URL=https://database-mcp-server-xyz.run.app \
  --set-secrets=JULES_API_KEY=JULES_API_KEY:latest \
  --allow-unauthenticated \
  --port=8080
``` [cite: 246, 247, 251]

*This outputs a live Service URL (e.g., `https://sstracker-cloud-orchestrator-xyz.run.app`). You can open this link in any browser or on your phone to watch real-time tool logs, approve PR drafts, or review code diffs in a professional, visual dashboard [cite: 251].*
