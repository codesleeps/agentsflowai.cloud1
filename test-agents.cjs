// Simple test script to verify AI agents are working
const axios = require("axios");

const BASE_URL = "http://localhost:3000";

async function testAgents() {
  console.log("Testing AI Agents...\n");

  try {
    // Test 1: Get all agents
    console.log("1. Testing GET /api/ai/agents");
    const agentsResponse = await axios.get(`${BASE_URL}/api/ai/agents`);
    console.log("✓ Agents loaded:", agentsResponse.data.length);

    // Test 2: Test each agent with a simple message
    const testMessages = {
      "web-dev-agent": "How do I create a React component?",
      "content-agent": "Write a blog post about AI development",
      "marketing-agent": "Create an ad for a new SaaS product",
      "social-media-agent": "Write a LinkedIn post about productivity",
      "seo-agent": 'Analyze this content for SEO: "Learn web development"',
      "analytics-agent": "What metrics should I track for my website?",
    };

    for (const [agentId, message] of Object.entries(testMessages)) {
      console.log(`\n2. Testing ${agentId} with: "${message}"`);

      try {
        const response = await axios.post(`${BASE_URL}/api/ai/agents`, {
          agentId,
          message,
        });

        console.log(
          "✓ Response received:",
          response.data.response.substring(0, 100) + "...",
        );
      } catch (error) {
        console.log("✗ Error:", error.response?.data || error.message);
      }
    }

    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.log("Make sure the development server is running on port 3000");
    }
  }
}

testAgents();
