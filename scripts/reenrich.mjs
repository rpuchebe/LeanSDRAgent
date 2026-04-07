#!/usr/bin/env node
/**
 * Re-enrichment script: updates all companies missing lsg_fit_score
 * Calls the local enrichment API and updates Supabase directly.
 * Usage: node scripts/reenrich.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hgucfqabqjqzkrrkcxxl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhndWNmcWFicWpxemtycmtjeHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzM1MTUsImV4cCI6MjA4ODY0OTUxNX0.CCgUHgeMBFqmSeoa2e0AiKPu-to4G0t76Nuu5DaY_qw';
const API_BASE = 'http://localhost:4000';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CONCURRENCY = 3;
let completed = 0;
let failed = 0;
let total = 0;

async function enrichCompany(company) {
    const label = `[${completed + failed + 1}/${total}] ${company.name}`;
    try {
        const res = await fetch(`${API_BASE}/api/companies/enrich`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyName: company.name, website: company.website }),
        });

        if (!res.ok) {
            console.error(`${label} — API error ${res.status}`);
            failed++;
            return;
        }

        const data = await res.json();

        // Update company with new fields
        const { error: updateErr } = await supabase
            .from('verified_companies')
            .update({
                industry: data.industry || company.industry,
                country: data.country || company.country,
                linkedin_url: data.linkedinCompanyUrl || company.linkedin_url,
                description: data.description || company.description,
                headquarters: data.headquarters || company.headquarters,
                founded_year: data.foundedYear || company.founded_year,
                history: data.history || company.history,
                total_employees: data.totalEmployees || company.total_employees,
                employee_segregation: data.employeeSegregation || company.employee_segregation,
                revenue: data.revenue || company.revenue,
                tags: data.tags || company.tags,
                match_reasoning: data.lsgFitReasoning || data.matchAnalysis,
                roles_match: data.rolesMatch,
                relevant_customers: data.relevantCustomers,
                lsg_fit_score: data.lsgFitScore,
                lsg_fit_reasoning: data.lsgFitReasoning,
                outreach_angle: data.outreachAngle,
                is_target: (data.lsgFitScore || 0) >= 5,
                last_verified_at: new Date().toISOString(),
            })
            .eq('id', company.id);

        if (updateErr) {
            console.error(`${label} — DB update error:`, updateErr.message);
            failed++;
            return;
        }

        // Update POCs
        if (data.pocs && data.pocs.length > 0) {
            await supabase.from('company_pocs').delete().eq('company_id', company.id);
            const pocsToSave = data.pocs.map((p) => ({
                company_id: company.id,
                name: p.name,
                title: p.title,
                linkedin_url: p.linkedin_url || p.searchUrl,
                department: p.department,
                seniority_level: p.seniorityLevel,
            }));
            await supabase.from('company_pocs').insert(pocsToSave);
        }

        completed++;
        const score = data.lsgFitScore ?? '?';
        console.log(`${label} — Score: ${score}/10 ✓`);
    } catch (err) {
        console.error(`${label} — Error:`, err.message);
        failed++;
    }
}

async function runBatch(companies, concurrency) {
    const queue = [...companies];
    const workers = Array.from({ length: concurrency }, async () => {
        while (queue.length > 0) {
            const company = queue.shift();
            if (company) await enrichCompany(company);
        }
    });
    await Promise.all(workers);
}

async function main() {
    console.log('Fetching companies missing lsg_fit_score...');
    const { data: companies, error } = await supabase
        .from('verified_companies')
        .select('id, name, website, industry, country, linkedin_url, description, headquarters, founded_year, history, total_employees, employee_segregation, revenue, tags')
        .is('lsg_fit_score', null)
        .order('name');

    if (error) {
        console.error('Failed to fetch companies:', error.message);
        process.exit(1);
    }

    total = companies.length;
    console.log(`Found ${total} companies to re-enrich (${CONCURRENCY} concurrent)\n`);

    if (total === 0) {
        console.log('All companies already have fit scores!');
        return;
    }

    const start = Date.now();
    await runBatch(companies, CONCURRENCY);
    const elapsed = Math.round((Date.now() - start) / 1000);

    console.log(`\n========================================`);
    console.log(`Done in ${elapsed}s`);
    console.log(`Completed: ${completed} | Failed: ${failed} | Total: ${total}`);
    console.log(`========================================`);
}

main();
