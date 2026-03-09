import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
    try {
        const { companyName, industry, pocName, pocTitle } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OpenAI API key not configured in .env.local" },
                { status: 500 }
            );
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const prompt = `Write a short, engaging, and professional cold outreach email to a prospect.
Context:
- Target Company: ${companyName}
- Target Industry: ${industry || "Unknown"}
- Prospect Name: ${pocName}
- Prospect Title: ${pocTitle}
- Our Value Proposition: We help companies streamline their operations and handle logistics/supply chain or related needs effectively.

Requirements:
- Keep it under 100 words.
- Do not use placeholders like [Your Name] (except at the very end sign-off).
- Tone: Professional but friendly, aiming to get a quick call.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("No valid response from OpenAI");

        return NextResponse.json({ email: content });
    } catch (error) {
        console.error("Error generating email with OpenAI:", error);
        return NextResponse.json(
            { error: "Failed to generate email" },
            { status: 500 }
        );
    }
}
