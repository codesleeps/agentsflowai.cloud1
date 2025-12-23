import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed default services
  const defaultServices = [
    {
      name: "AI Agent Basic",
      description: "Basic AI Chatbot for your website",
      tier: "basic",
      price: 299,
      features: ["24/7 Availability", "Basic FAQs", "Lead Capture"],
      is_active: true,
    },
    {
      name: "AI Agent Growth",
      description: "Advanced AI with custom training",
      tier: "growth",
      price: 599,
      features: [
        "Everything in Basic",
        "Custom Knowledge Base",
        "CRM Integration",
      ],
      is_active: true,
    },
    {
      name: "AI Agent Enterprise",
      description: "Full automated workflow solution",
      tier: "enterprise",
      price: 999,
      features: [
        "Everything in Growth",
        "Custom Workflows",
        "Dedicated Support",
        "SLA",
      ],
      is_active: true,
    },
  ];

  for (const service of defaultServices) {
    await prisma.service.create({
      data: service,
    });
  }

  // Seed EnrichmentSource records
  const enrichmentSources = [
    {
      name: "people_data_labs",
      api_key_configured: false,
      is_active: false,
      priority: 1,
      rate_limit_per_minute: 60,
      cost_per_request: 0.02,
    },
    {
      name: "forager",
      api_key_configured: false,
      is_active: false,
      priority: 2,
      rate_limit_per_minute: 100,
      cost_per_request: 0.01,
    },
    {
      name: "crustdata",
      api_key_configured: false,
      is_active: false,
      priority: 3,
      rate_limit_per_minute: 50,
      cost_per_request: 0.03,
    },
  ];

  for (const source of enrichmentSources) {
    await prisma.enrichmentSource.create({ data: source });
  }

  // Seed EmailTemplate records
  const emailTemplates = [
    {
      name: "Welcome Email",
      subject: "Welcome to {{company_name}}, {{name}}!",
      body: "Hi {{name}},\n\nThank you for your interest in our services. We're excited to help you grow your business with AI-powered solutions.\n\nBest regards,\nThe Team",
      variables: ["name", "company_name", "email"],
      category: "welcome",
    },
    {
      name: "Follow-up Email",
      subject: "Following up on our conversation",
      body: "Hi {{name}},\n\nI wanted to follow up on our recent conversation about {{company}}'s needs. Our AI solutions could help streamline your operations.\n\nWould you have time for a quick call this week?\n\nBest regards,\nThe Team",
      variables: ["name", "company"],
      category: "follow_up",
    },
    {
      name: "Nurture Sequence - Day 3",
      subject: "Quick tip for {{company_name}}",
      body: "Hi {{name}},\n\nHere's a quick tip that might help {{company_name}}:\n\n[Your tip here]\n\nLet us know if you'd like to learn more!\n\nBest regards,\nThe Team",
      variables: ["name", "company_name"],
      category: "nurture",
    },
  ];

  for (const template of emailTemplates) {
    await prisma.emailTemplate.create({ data: template });
  }

  // Seed ChannelConfig records
  const channelConfigs = [
    {
      channel_type: "whatsapp",
      is_active: false,
      provider: "twilio",
      api_credentials: {},
    },
    {
      channel_type: "sms",
      is_active: false,
      provider: "twilio",
      api_credentials: {},
    },
    {
      channel_type: "messenger",
      is_active: false,
      provider: "facebook",
      api_credentials: {},
    },
    {
      channel_type: "instagram",
      is_active: false,
      provider: "facebook",
      api_credentials: {},
    },
    {
      channel_type: "email",
      is_active: true,
      provider: "sendgrid",
      api_credentials: {},
    },
  ];

  for (const config of channelConfigs) {
    await prisma.channelConfig.create({ data: config });
  }

  // Seed sample Workflow template
  const workflow = await prisma.workflow.create({
    data: {
      name: "New Lead Nurture Sequence",
      description: "Automatically send welcome email and schedule follow-up",
      status: "draft",
      is_template: true,
      template_category: "lead_nurture",
    },
  });

  await prisma.workflowTrigger.create({
    data: {
      workflow_id: workflow.id,
      trigger_type: "lead_created",
      trigger_config: { conditions: { source: ["website", "chat"] } },
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
