import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Seed default services
    const defaultServices = [
        {
            name: 'AI Agent Basic',
            description: 'Basic AI Chatbot for your website',
            tier: 'basic',
            price: 299,
            features: ['24/7 Availability', 'Basic FAQs', 'Lead Capture'],
            is_active: true
        },
        {
            name: 'AI Agent Growth',
            description: 'Advanced AI with custom training',
            tier: 'growth',
            price: 599,
            features: ['Everything in Basic', 'Custom Knowledge Base', 'CRM Integration'],
            is_active: true
        },
        {
            name: 'AI Agent Enterprise',
            description: 'Full automated workflow solution',
            tier: 'enterprise',
            price: 999,
            features: ['Everything in Growth', 'Custom Workflows', 'Dedicated Support', 'SLA'],
            is_active: true
        }
    ]

    for (const service of defaultServices) {
        await prisma.service.create({
            data: {
                ...service,
                features: JSON.stringify(service.features)
            }
        })
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
