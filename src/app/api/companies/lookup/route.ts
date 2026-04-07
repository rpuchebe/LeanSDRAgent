import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/companies/lookup
 * Body: { input: "string" }
 *
 * The input can be:
 * - A company name (e.g., "JB Hunt")
 * - A website URL (e.g., "https://www.jbhunt.com")
 * - A LinkedIn company URL (e.g., "https://linkedin.com/company/jbhunt")
 *
 * Logic:
 * 1. Detect input type
 * 2. Extract company name from URL if possible
 * 3. Check Supabase cache
 * 4. If not cached, call enrichment endpoint
 * 5. Save to Supabase
 * 6. Return enriched data
 */

type InputType = "linkedin" | "website" | "name";

function detectInputType(input: string): InputType {
    const trimmed = input.trim();
    if (/linkedin\.com\/company\//i.test(trimmed)) {
        return "linkedin";
    }
    if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed) || /\.[a-z]{2,}$/i.test(trimmed)) {
        return "website";
    }
    return "name";
}

function extractCompanyNameFromLinkedIn(url: string): string {
    // Extract slug from linkedin.com/company/jbhunt or linkedin.com/company/jbhunt/
    const match = url.match(/linkedin\.com\/company\/([^/?#]+)/i);
    if (match) {
        // Convert slug to readable name: "jb-hunt-transport" -> "JB Hunt Transport"
        return match[1]
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return url;
}

function extractCompanyNameFromWebsite(url: string): string {
    try {
        let normalized = url.trim();
        if (!normalized.startsWith("http")) {
            normalized = "https://" + normalized;
        }
        const hostname = new URL(normalized).hostname;
        // Remove www. and TLD
        const parts = hostname.replace(/^www\./, "").split(".");
        if (parts.length > 0) {
            // Take the main domain part, e.g., "jbhunt" from "jbhunt.com"
            return parts[0]
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
        }
    } catch {
        // If URL parsing fails, just return the input
    }
    return url;
}

function normalizeWebsite(input: string): string {
    let url = input.trim();
    if (!url.startsWith("http")) {
        url = "https://" + url;
    }
    try {
        const parsed = new URL(url);
        return parsed.origin; // e.g., https://www.jbhunt.com
    } catch {
        return url;
    }
}

export async function POST(req: Request) {
    try {
        const { input } = await req.json();

        if (!input || typeof input !== "string" || input.trim().length === 0) {
            return NextResponse.json(
                { error: "Missing required field: input" },
                { status: 400 }
            );
        }

        const trimmedInput = input.trim();
        const inputType = detectInputType(trimmedInput);

        let companyName = "";
        let website = "";
        let linkedinUrl = "";

        switch (inputType) {
            case "linkedin":
                linkedinUrl = trimmedInput;
                companyName = extractCompanyNameFromLinkedIn(trimmedInput);
                break;
            case "website":
                website = normalizeWebsite(trimmedInput);
                companyName = extractCompanyNameFromWebsite(trimmedInput);
                break;
            case "name":
                companyName = trimmedInput;
                break;
        }

        // --- Step 1: Check Supabase cache ---
        let cachedCompany = null;

        if (website) {
            // Search by website first (most specific)
            const { data } = await supabase
                .from("verified_companies")
                .select("*, company_pocs(*)")
                .eq("website", website)
                .maybeSingle();
            if (data) cachedCompany = data;
        }

        if (!cachedCompany && companyName) {
            // Search by name (case-insensitive via ilike)
            const { data } = await supabase
                .from("verified_companies")
                .select("*, company_pocs(*)")
                .ilike("name", companyName)
                .maybeSingle();
            if (data) cachedCompany = data;
        }

        if (cachedCompany) {
            // Return cached data, mapping to the enrichment response format
            return NextResponse.json({
                source: "cache",
                company: mapDbToResponse(cachedCompany),
            });
        }

        // --- Step 2: Not cached — call enrichment endpoint ---
        const baseUrl = getBaseUrl(req);
        const enrichResponse = await fetch(`${baseUrl}/api/companies/enrich`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyName, website }),
        });

        if (!enrichResponse.ok) {
            const errBody = await enrichResponse.json().catch(() => ({}));
            return NextResponse.json(
                { error: "Enrichment failed", details: errBody },
                { status: 502 }
            );
        }

        const enrichedData = await enrichResponse.json();

        // --- Step 3: Save to Supabase ---
        const companyToSave = {
            name: companyName,
            website: enrichedData.website || website,
            industry: enrichedData.industry,
            country: enrichedData.country,
            linkedin_url: enrichedData.linkedinCompanyUrl,
            description: enrichedData.description,
            headquarters: enrichedData.headquarters,
            founded_year: enrichedData.foundedYear,
            history: enrichedData.history,
            total_employees: enrichedData.totalEmployees,
            employee_segregation: enrichedData.employeeSegregation,
            revenue: enrichedData.revenue,
            tags: enrichedData.tags,
            match_reasoning: enrichedData.lsgFitReasoning,
            roles_match: enrichedData.rolesMatch,
            relevant_customers: enrichedData.relevantCustomers,
            is_target: (enrichedData.lsgFitScore || 0) >= 5,
            last_verified_at: new Date().toISOString(),
        };

        const { data: savedCo, error: saveErr } = await supabase
            .from("verified_companies")
            .upsert(companyToSave, { onConflict: "name,website" })
            .select()
            .single();

        if (saveErr) {
            console.error("Supabase save error:", saveErr);
        }

        // Save POCs
        if (savedCo && enrichedData.pocs && enrichedData.pocs.length > 0) {
            // Clear old POCs
            await supabase
                .from("company_pocs")
                .delete()
                .eq("company_id", savedCo.id);

            const pocsToSave = enrichedData.pocs.map((p: any) => ({
                company_id: savedCo.id,
                name: p.name,
                title: p.title,
                linkedin_url: p.searchUrl || p.linkedin_url,
            }));

            await supabase.from("company_pocs").insert(pocsToSave);
        }

        // --- Step 4: Return enriched data ---
        return NextResponse.json({
            source: "enriched",
            company: {
                id: savedCo?.id || null,
                ...enrichedData,
            },
        });
    } catch (error) {
        console.error("Error in company lookup:", error);
        return NextResponse.json(
            { error: "Failed to lookup company" },
            { status: 500 }
        );
    }
}

function getBaseUrl(req: Request): string {
    const url = new URL(req.url);
    return `${url.protocol}//${url.host}`;
}

function mapDbToResponse(db: any) {
    return {
        id: db.id,
        industry: db.industry,
        country: db.country,
        website: db.website,
        linkedinCompanyUrl: db.linkedin_url,
        description: db.description,
        headquarters: db.headquarters,
        foundedYear: db.founded_year,
        history: db.history,
        totalEmployees: db.total_employees,
        employeeSegregation: db.employee_segregation,
        revenue: db.revenue,
        tags: db.tags,
        lsgFitScore: db.lsg_fit_score,
        lsgFitReasoning: db.match_reasoning,
        outreachAngle: db.outreach_angle,
        relevantCustomers: db.relevant_customers,
        rolesMatch: db.roles_match,
        pocs: (db.company_pocs || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            title: p.title,
            searchUrl: p.linkedin_url,
            linkedin_url: p.linkedin_url,
            isAccepted: p.is_accepted,
        })),
        isTarget: db.is_target,
        lastVerifiedAt: db.last_verified_at,
    };
}
