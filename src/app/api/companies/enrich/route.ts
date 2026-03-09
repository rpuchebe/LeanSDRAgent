import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
    try {
        const { companyName, website } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OpenAI API key not configured in .env.local" },
                { status: 500 }
            );
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const LSG_CLIENTS = `
    Food & Beverages: US Foods, Campbell's, Amazon, Walmart
    Logistics/3PL: RXO, JB Hunt, R+L Carriers, D.B. Schenker, MNX, FlexPort, Maersk, Arrive, CH Robinson, Knight-Swift, Werner, GlobalTranz, Echo, Ryder, NTG
    Insurance: Acrisure
    Cold Chain: Lineage, US Cold Storage
    Trucking/Leasing: TEN, Axe Trailers, FleetPride
    Retail: City Furniture, Ashley Furniture, Carvana
    Tech: Project44, Wex, Priority Technology
    Law: Friedland & Associates
    Canada: Bison Transport, Trimac, Challenger
    `;

        const prompt = `You are an expert corporate researcher and sales intelligence analyst. Perform a deep profiling for the following company using your vast knowledge base.

Company Name: "${companyName}"
Website: "${website}"

Your task is to provide accurate information to build a comprehensive company profile. For general company data (industry, location, stats, history), provide your best and most accurate assessment based on your knowledge. DO NOT use "N/A" for basic company info if it can be reasonably deduced or found.

Return the following detailed information:
1. Industry: (Which one of these most closely matches? Logistics, Transportation, Trucking, Supply Chain, Retail/Wholesale, Furniture, Healthcare, Insurance, Technology, Law, or Other).
2. Country: (Official headquarters country)
3. Website: (Verified URL)
4. LinkedIn: (Official company LinkedIn page URL)
5. Description: (A highly professional and precise 2-sentence summary of the company's core business)
6. Headquarters: (City, State)
7. Founded Year: (Year only)
8. History: (A concise 3-4 sentence historical summary, focusing on origin, milestones, and growth)
9. Stats:
   - Total Employees: (Provide a realistic estimation or exact number based on real data)
   - Employee Segregation: (An object mapping country/region to approximate employee count, e.g., {"USA": 200, "Colombia": 50})
   - Revenue: (Estimated annual revenue in USD, e.g., "$500M")
10. Profile Tags: (List 5-8 highly accurate tags that describe their specific operations and niche, e.g., "Asset-Based", "Freight-Tech", "Last-Mile", "Brokerage", "LTL", "Cross-Border")
11. LSG Match Analysis: (Based on our clients: ${LSG_CLIENTS}, select 5-8 clients that are most relevant as case studies/references. For each client, provide a reasoning explaining why they demonstrate our capability to serve this new prospect).
12. Jobs/Roles Match: (Provide a list of 5-8 roles we offer that fit their operational needs. Available Roles: Customer Reps, Dispatchers, Logistics Coordinators, Track and Trace, Carrier Sales, Accounts Payable/Receivable, Billing Specialist, Collections, Customs Compliance. For each, explain the exact fit and provide an estimated US annual salary).
13. Top POCs (Points of Contact): This is the ONLY section that MUST BE 100% STRICT. Find AT LEAST 15 real, accurate decision-makers in roles like Operations, Logistics, Supply Chain, Executive leadership, Finance, or IT. 
    - CRITICAL RULE FOR POCs: YOU MUST NOT HALLUCINATE NAMES OR URLS. Every name must be a real person who works or worked at this company in a relevant leadership or operational role. DO NOT STOP AT 5 POCs, YOU MUST TRY TO FIND AT LEAST 15.
    - If you are not 100% sure about a real person, DO NOT include them.
    - Include their full Name, exact Title, and a highly probable or confirmed LinkedIn URL.

You MUST respond strictly with a valid JSON object matching the following structure exactly:
{
  "industry": "string",
  "country": "string",
  "website": "string",
  "linkedin": "string",
  "description": "string",
  "headquarters": "string",
  "foundedYear": "string",
  "history": "string",
  "totalEmployees": "string",
  "employeeSegregation": {"Country/Region": number},
  "revenue": "string",
  "tags": ["string", "string"],
  "matchAnalysis": "string",
  "relevantCustomers": [{"company": "Client Name 1", "reasoning": "Why it's a match"}],
  "rolesMatch": [{"role": "Dispatcher", "fitLevel": "High", "estSalary": "$55k"}],
  "pocs": [{"name": "John Doe", "title": "VP of Supply Chain", "linkedin_url": "https://linkedin.com/in/..."}]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.3, // Allow some flexibility for general info, but keep it low enough for accuracy
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No valid response from OpenAI");
        }

        const parsed = JSON.parse(content);
        return NextResponse.json(parsed);
    } catch (error) {
        console.error("Error enriching company with OpenAI:", error);
        return NextResponse.json(
            { error: "Failed to enrich company" },
            { status: 500 }
        );
    }
}
