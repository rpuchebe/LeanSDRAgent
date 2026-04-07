import { NextResponse } from "next/server";
import OpenAI from "openai";

const LSG_SYSTEM_PROMPT = `You are a Senior SDR writing outreach for Lean Solutions Group (LSG).

About LSG:
- NOT generic staffing. NOT a headhunter.
- A nearshore/offshore partner focused on operations, back office, and workflows.
- Combines nearshore talent + AI-enabled workflow automation.
- Especially strong for supply chain, logistics, and transportation.
- Helps companies scale operations with dedicated nearshore talent.
- Teams function as a real extension of the business.
- Saves 40%+ on payroll/labor costs.
- AI capabilities for repetitive workflows and back-office functions.
- Frees internal teams to focus on strategic, higher-value tasks.

Roles LSG provides:
- Customer Service / Customer Reps
- AP/AR
- Billing / Invoicing
- Track & Trace
- Dispatch
- Quoting
- Collections
- Appointment scheduling
- Document management
- Back-office support
- AI-enabled workflow automation

Tone & Style:
- Warm, human, close but professional
- Direct but not cold
- Highly personalized — never sound like generic staffing
- Use social proof with similar clients
- Clear CTA: 15-20 minute intro call
- Keep emails under 100 words
- LinkedIn messages under 60 words
- Call scripts: brief, conversational, 30-second opening

Phrases the SDR likes:
- "I'd love to connect"
- "Would you be open to a brief intro?"
- "Would you have 15 minutes next week?"
- "Worst-case scenario, networking is always a win"
- "Would love to compare notes"
- "No strings attached"

DO NOT:
- Use generic staffing language
- Use placeholders like [Your Name] (sign as "the Lean team" or leave unsigned)
- Sound robotic or template-based
- Mention pricing specifics
- Over-explain in the first message — generate interest for a meeting, don't sell everything upfront`;

function buildUserPrompt(params: {
    companyName: string;
    industry: string;
    pocName: string;
    pocTitle: string;
    pocDepartment?: string;
    outreachAngle?: string;
    relevantCustomers?: string[];
    channel: "email" | "linkedin" | "call_script";
}): string {
    const {
        companyName,
        industry,
        pocName,
        pocTitle,
        pocDepartment,
        outreachAngle,
        relevantCustomers,
        channel,
    } = params;

    const context = [
        `Target Company: ${companyName}`,
        `Industry: ${industry || "Unknown"}`,
        `Prospect Name: ${pocName}`,
        `Prospect Title: ${pocTitle}`,
        pocDepartment ? `Department: ${pocDepartment}` : null,
        outreachAngle ? `Outreach Angle / Pain Point: ${outreachAngle}` : null,
        relevantCustomers?.length
            ? `Similar Clients to Reference: ${relevantCustomers.join(", ")}`
            : null,
    ]
        .filter(Boolean)
        .join("\n- ");

    if (channel === "email") {
        return `Write a cold outreach email for this prospect.

Context:
- ${context}

Return your response in this EXACT JSON format (no markdown, no code fences):
{
  "subject": "the email subject line",
  "message": "the email body under 100 words",
  "followUp": "a follow-up email for 3-5 days later, under 80 words"
}`;
    }

    if (channel === "linkedin") {
        return `Write a LinkedIn connection request message for this prospect.

Context:
- ${context}

Return your response in this EXACT JSON format (no markdown, no code fences):
{
  "message": "LinkedIn connection request under 60 words",
  "followUp": "a follow-up InMail for 3-5 days later if no response, under 80 words"
}`;
    }

    // call_script
    return `Write a cold call opening script for this prospect.

Context:
- ${context}

Return your response in this EXACT JSON format (no markdown, no code fences):
{
  "message": "30-second phone opening script, conversational and brief",
  "followUp": "Key talking points (3-4 bullets) and 2-3 common objection responses, formatted as a readable block"
}`;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            companyName,
            industry,
            pocName,
            pocTitle,
            pocDepartment,
            outreachAngle,
            relevantCustomers,
            channel = "email",
        } = body;

        if (!companyName || !pocName || !pocTitle) {
            return NextResponse.json(
                { error: "companyName, pocName, and pocTitle are required" },
                { status: 400 }
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OpenAI API key not configured in .env.local" },
                { status: 500 }
            );
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const userPrompt = buildUserPrompt({
            companyName,
            industry,
            pocName,
            pocTitle,
            pocDepartment,
            outreachAngle,
            relevantCustomers,
            channel,
        });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: LSG_SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("No valid response from OpenAI");

        // Parse the JSON response from the model
        const cleaned = content
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "")
            .trim();

        const parsed = JSON.parse(cleaned);

        return NextResponse.json({
            subject: parsed.subject || undefined,
            message: parsed.message,
            followUp: parsed.followUp || undefined,
        });
    } catch (error) {
        console.error("Error generating outreach with OpenAI:", error);
        return NextResponse.json(
            { error: "Failed to generate outreach" },
            { status: 500 }
        );
    }
}
