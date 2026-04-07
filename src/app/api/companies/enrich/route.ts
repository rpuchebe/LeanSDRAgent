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
Logistics/3PL: RXO, JB Hunt, R+L Carriers, D.B. Schenker, MNX, Flexport, Maersk, Arrive, CH Robinson, Knight-Swift Transportation, Werner Enterprises, GlobalTranz, Echo Logistics, Ryder, NTG
Insurance: Acrisure
Cold Chain: Lineage, US Cold Storage
Truck Leasing/Fleet: TEN, Axe Trailers, FleetPride
Packaging: Graphic Packaging International
Healthcare: First Stop Health, MTI America
Retail: City Furniture, Ashley Furniture, Amazon, Carvana, US Foods, Walmart
Tech/Financial: GitLab, Project44, Wex, Tradeweb, Priority Technology Holdings
Law: Friedland & Associates, Michael Sullivan & Associates
Canadian: Bison Transport, Trimac Transportation, ASL Distribution Services, DB Schenker Canada, Challenger`;

        const LOGO_SELECTION_RULES = `
LOGO SELECTION RULES — Pick the most relevant LSG clients to mention based on the prospect's sector:
- For freight/brokerage/3PL: D.B. Schenker, Maersk, CH Robinson, GlobalTranz, Echo Logistics, NTG, JB Hunt, R+L Carriers, Werner Enterprises, Knight-Swift Transportation, Ryder, ASL Distribution Services
- For cold chain/food logistics: US Foods, Lineage, US Cold Storage, Campbell's
- For retail/fulfillment: Walmart, Amazon, US Foods, Graphic Packaging International
- For fleet/truck/aftermarket: FleetPride, TEN, Axe Trailers, Ryder
- For healthcare/medical: MNX, First Stop Health, MTI America, D.B. Schenker
- For supply chain tech: Project44, D.B. Schenker, Maersk, Amazon, Walmart
- For furniture/white glove: Ashley Furniture, City Furniture, Ryder, ASL Distribution Services
- For packaging: Graphic Packaging International, Walmart, Amazon, US Foods
- For grocery/food distribution: US Foods, Campbell's, Walmart, Amazon, Lineage`;

        const LSG_VALUE_PROP = `
ABOUT LSG (Lean Solutions Group):
LSG is a nearshore staffing company providing dedicated bilingual professionals from Colombia and other LATAM countries to US/Canadian companies. Our staff work as embedded extensions of the client's team (not a call center). Key services include:

ROLES WE STAFF:
- Customer Service / Customer Reps
- AP/AR (Accounts Payable/Receivable)
- Billing / Invoicing
- Track & Trace
- Dispatch
- Quoting
- Collections
- Appointment scheduling
- Document management
- Back-office support
- AI-enabled workflow automation

VALUE PROPOSITION: 40-60% cost savings vs. US hires, bilingual talent, same timezone, dedicated full-time staff, cultural alignment, rapid scaling.`;

        const POC_TARGET_TITLES = `
TARGET POC TITLES (decision makers who buy our services):
- VP/SVP/Director of Operations
- VP/Director/Manager of Supply Chain
- VP/Director/CIO/CTO of IT, Systems, Integration, Platforms, Transformation
- COO/President/General Manager
- VP/Director of Logistics/Transportation/Customs/Fleet/Maintenance
- CFO/Financial leaders (cost savings angle)
- HR/Talent leaders (hiring support angle)`;

        const prompt = `You are an expert corporate researcher and sales intelligence analyst working for LSG (Lean Solutions Group).

${LSG_VALUE_PROP}

Perform a deep profiling for the following company:

Company Name: "${companyName}"
Website: "${website || "Unknown"}"

COMPLETE LSG CLIENT LIST (use for reference matching):
${LSG_CLIENTS}

${LOGO_SELECTION_RULES}

${POC_TARGET_TITLES}

INSTRUCTIONS:
1. Provide accurate information to build a comprehensive company profile.
2. For each data point, assign a confidence level: "high" (you are very sure), "medium" (reasonable estimate), "low" (educated guess).
3. If you genuinely do not know something, return "Unknown" or "N/A" — this is MUCH BETTER than fabricating data.
4. For POCs: provide 5-8 high-quality decision makers. Quality over quantity.

CRITICAL RULES FOR POCs:
- DO NOT generate direct LinkedIn profile URLs. You CANNOT know real LinkedIn URLs.
- Instead, for EACH POC, generate a LinkedIn Sales Navigator SEARCH URL in this exact format:
  https://www.linkedin.com/sales/search/people?query=(keywords:PERSON_NAME COMPANY_NAME)
  Example: https://www.linkedin.com/sales/search/people?query=(keywords:John Smith Acme Corp)
- This is a SEARCH URL, not a profile link. It always works because it searches for the person.
- Only include people you are reasonably confident actually work or recently worked at this company.
- If you cannot confidently name 5 real people, return fewer. Do NOT pad with fake names.

For the relevantCustomers field, use the LOGO SELECTION RULES above to pick 3-6 LSG clients that are most relevant based on the prospect's industry/sector. Explain why each is relevant.

For rolesMatch, analyze what operational roles this company likely has that LSG could staff. Include estimated US salary for the role.

For lsgFitScore (1-10), evaluate how well this company fits LSG's ideal customer profile. Consider: industry alignment, company size, likely need for back-office/ops support, potential cost savings.

For outreachAngle, suggest the single best sales angle to approach this company.

You MUST respond with a valid JSON object matching this structure EXACTLY:
{
  "industry": "string",
  "industryConfidence": "high|medium|low",
  "country": "string",
  "website": "string",
  "linkedinCompanyUrl": "string or Unknown",
  "description": "string - professional 2-sentence summary",
  "headquarters": "string - City, State",
  "foundedYear": "string or Unknown",
  "history": "string - concise 3-4 sentence historical summary",
  "totalEmployees": "string - number or estimate",
  "employeesConfidence": "high|medium|low",
  "employeeSegregation": {"Country/Region": "number"},
  "revenue": "string - estimated annual revenue in USD",
  "revenueConfidence": "high|medium|low",
  "tags": ["string - 5-8 operational/niche tags"],
  "lsgFitScore": "number 1-10",
  "lsgFitReasoning": "string - why this company is or isn't a good fit for LSG services",
  "relevantCustomers": [{"company": "Client Name", "reasoning": "Why relevant to this prospect", "sector": "Which sector match"}],
  "rolesMatch": [{"role": "string", "fitLevel": "High|Medium|Low", "reasoning": "Why this role fits their needs", "estUsSalary": "$XXk"}],
  "pocs": [{"name": "string", "title": "string", "department": "Operations|Supply Chain|IT|Finance|Executive|HR|Logistics", "seniorityLevel": "C-Suite|VP|Director|Manager", "searchUrl": "https://www.linkedin.com/sales/search/people?query=(keywords:NAME COMPANY)"}],
  "outreachAngle": "string - the best angle to approach this company"
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No valid response from OpenAI");
        }

        const parsed = JSON.parse(content);

        // Post-process: ensure all POC searchUrls are proper search URLs, not direct profile links
        if (parsed.pocs && Array.isArray(parsed.pocs)) {
            parsed.pocs = parsed.pocs.map((poc: any) => {
                const name = poc.name || "";
                const company = companyName || "";
                // If GPT somehow still returned a direct LinkedIn profile URL, replace it
                if (
                    poc.searchUrl &&
                    (poc.searchUrl.includes("linkedin.com/in/") ||
                        !poc.searchUrl.includes("sales/search/people"))
                ) {
                    poc.searchUrl = `https://www.linkedin.com/sales/search/people?query=(keywords:${encodeURIComponent(name + " " + company)})`;
                }
                // Also map to linkedin_url for backward compatibility with existing consumers
                poc.linkedin_url = poc.searchUrl;
                return poc;
            });
        }

        return NextResponse.json(parsed);
    } catch (error) {
        console.error("Error enriching company with OpenAI:", error);
        return NextResponse.json(
            { error: "Failed to enrich company" },
            { status: 500 }
        );
    }
}
