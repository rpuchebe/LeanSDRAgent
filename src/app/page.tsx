"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  Search,
  User,
  FileUp,
  Loader2,
  LayoutDashboard,
  ChevronRight,
  Trash2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TargetCompanyDashboard, { CompanyData, checkIsTarget } from "@/components/TargetCompanyDashboard";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(true); // Default to paused to avoid auto-starting
  const [lookupInput, setLookupInput] = useState("");
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const isPausedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTogglePause = () => {
    const newVal = !isPaused;
    setIsPaused(newVal);
    isPausedRef.current = newVal;
    localStorage.setItem("sdr_is_paused", JSON.stringify(newVal));
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all current results?")) {
      setCompanies([]);
      localStorage.removeItem("sdr_companies");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSmartLookup = async (inputValue?: string) => {
    const value = (inputValue ?? lookupInput).trim();
    if (!value) return;

    setIsLookupLoading(true);
    try {
      const res = await fetch("/api/companies/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.company?.id) {
          setLookupInput("");
          router.push(`/prospect/${data.company.id}`);
          return;
        }
      }

      // Fallback: add as manual company and enrich
      const newCo: CompanyData = {
        id: Math.random().toString(36).substr(2, 9),
        name: value,
        industry: "",
        country: "",
        website: "",
        linkedin: "",
        isTarget: undefined,
      };

      setCompanies(prev => [newCo, ...prev]);
      setIsPaused(false);
      isPausedRef.current = false;
      localStorage.setItem("sdr_is_paused", "false");
      setLookupInput("");
    } catch (error) {
      console.error("Lookup failed, falling back to manual add:", error);
      const newCo: CompanyData = {
        id: Math.random().toString(36).substr(2, 9),
        name: value,
        industry: "",
        country: "",
        website: "",
        linkedin: "",
        isTarget: undefined,
      };

      setCompanies(prev => [newCo, ...prev]);
      setIsPaused(false);
      isPausedRef.current = false;
      localStorage.setItem("sdr_is_paused", "false");
      setLookupInput("");
    } finally {
      setIsLookupLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = (results.data as any[]).map((row: any) => {
          const id = row["Record ID"] || Math.random().toString(36).substr(2, 9);
          const name = row["Company name"] || row["Name"] || "Unknown";
          const industry = row["Industry"] || "";
          const country = row["Country"] || "";
          const website = row["Website URL"] || row["Website"] || "";
          const linkedin = row["LinkedIn Company Page"] || "";

          return {
            id,
            name,
            industry,
            country,
            website,
            linkedin,
            isTarget: checkIsTarget(country, industry),
          } as CompanyData;
        });

        setCompanies(parsedData);
        setIsParsing(false);
        setIsPaused(false); // Auto-start on NEW upload
        isPausedRef.current = false;
        localStorage.setItem("sdr_companies", JSON.stringify(parsedData));
        localStorage.setItem("sdr_is_paused", "false");
      },
    });
  };

  // Automatic enrichment effect
  useEffect(() => {
    if (isPaused || isParsing || companies.length === 0) return;

    const autoEnrich = async () => {
      // Find the next company that needs enrichment and isn't currently being enriched
      const nextToEnrich = companies.find(c =>
        c.enrichStatus !== "verified" &&
        c.enrichStatus !== "error" &&
        !enrichingIds.has(c.id)
      );

      if (nextToEnrich) {
        await handleEnrich(nextToEnrich);
      }
    };

    const timer = setTimeout(autoEnrich, 500); // Small delay to prevent tight loops
    return () => clearTimeout(timer);
  }, [companies, isPaused, isParsing, enrichingIds]);

  // Initial load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sdr_companies");
    if (saved) {
      setCompanies(JSON.parse(saved));
    }

    const savedPaused = localStorage.getItem("sdr_is_paused");
    if (savedPaused !== null) {
      const parsedPaused = JSON.parse(savedPaused);
      setIsPaused(parsedPaused);
      isPausedRef.current = parsedPaused;
    }
  }, []);

  const handleEnrich = async (company: CompanyData) => {
    if (company.enrichStatus === "verified") return;

    setEnrichingIds(prev => new Set(prev).add(company.id));
    try {
      // 1. Check Supabase first to save credits
      const cleanedName = company.name.replace(/"/g, '""');
      const cleanedWebsite = company.website ? company.website.replace(/"/g, '""') : '';

      let query = supabase
        .from('verified_companies')
        .select('*, company_pocs(*)');

      if (cleanedWebsite) {
        query = query.or(`name.eq."${cleanedName}",website.eq."${cleanedWebsite}"`);
      } else {
        query = query.eq('name', company.name); // Exact match if we have no website
      }

      const { data: existingCompany, error: fetchError } = await query.limit(1).maybeSingle();

      if (existingCompany && !fetchError) {
        setCompanies(prev => prev.map(c => {
          if (c.id === company.id) {
            return {
              ...c,
              verifiedCountry: existingCompany.country,
              verifiedIndustry: existingCompany.industry,
              verifiedWebsite: existingCompany.website,
              linkedin: existingCompany.linkedin_url,
              description: existingCompany.description,
              headquarters: existingCompany.headquarters,
              isTarget: existingCompany.is_target,
              enrichStatus: "verified" as const,
              pocs: existingCompany.company_pocs || []
            };
          }
          return c;
        }));
        return;
      }

      // 2. If not in DB, call OpenAI
      const res = await fetch("/api/companies/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: company.name, website: company.website }),
      });

      if (!res.ok) throw new Error("Failed to enrich");
      const data = await res.json();

      const aiCountry = data.country && data.country !== "Unknown" ? data.country : null;
      const aiIndustry = data.industry && data.industry !== "Unknown" ? data.industry : null;
      const newCountry = aiCountry || company.country;
      const newIndustry = aiIndustry || company.industry;
      const rawLinkedin = data.linkedinCompanyUrl || data.linkedin;
      const newLinkedin = (rawLinkedin && typeof rawLinkedin === "string" && rawLinkedin.startsWith("http"))
        ? rawLinkedin
        : company.linkedin;

      const enrichedResult = {
        verifiedCountry: newCountry,
        verifiedIndustry: newIndustry,
        verifiedWebsite: (data.website && data.website !== "Unknown") ? data.website : company.website,
        linkedin: newLinkedin,
        description: (data.description && data.description !== "Unknown") ? data.description : company.description,
        headquarters: (data.headquarters && data.headquarters !== "Unknown") ? data.headquarters : (company as any).headquarters,
        foundedYear: data.foundedYear,
        history: data.history,
        totalEmployees: data.totalEmployees,
        employeeSegregation: data.employeeSegregation,
        revenue: data.revenue,
        tags: data.tags,
        matchAnalysis: data.matchAnalysis,
        relevantCustomers: data.relevantCustomers,
        rolesMatch: data.rolesMatch,
        lsgFitScore: data.lsgFitScore,
        lsgFitReasoning: data.lsgFitReasoning,
        outreachAngle: data.outreachAngle,
        isTarget: checkIsTarget(newCountry, newIndustry),
        enrichStatus: "verified" as const,
        pocs: data.pocs || []
      };

      // 3. Save to Supabase for future use
      const { data: savedCo, error: saveErr } = await supabase
        .from('verified_companies')
        .upsert({
          name: company.name,
          website: enrichedResult.verifiedWebsite,
          industry: enrichedResult.verifiedIndustry,
          country: enrichedResult.verifiedCountry,
          linkedin_url: enrichedResult.linkedin,
          description: enrichedResult.description,
          headquarters: enrichedResult.headquarters,
          founded_year: enrichedResult.foundedYear,
          history: enrichedResult.history,
          total_employees: enrichedResult.totalEmployees,
          employee_segregation: enrichedResult.employeeSegregation,
          revenue: enrichedResult.revenue,
          tags: enrichedResult.tags,
          match_reasoning: enrichedResult.matchAnalysis,
          roles_match: enrichedResult.rolesMatch,
          relevant_customers: enrichedResult.relevantCustomers,
          is_target: enrichedResult.isTarget,
          lsg_fit_score: data.lsgFitScore,
          outreach_angle: data.outreachAngle,
          last_verified_at: new Date().toISOString()
        }, { onConflict: 'name,website' })
        .select()
        .single();

      if (saveErr) console.error("Supabase Save Error:", saveErr);

      if (savedCo && data.pocs && data.pocs.length > 0) {
        // Clear old POCs for this company to avoid duplicates on refresh
        await supabase.from('company_pocs').delete().eq('company_id', savedCo.id);

        const pocsToSave = data.pocs.map((p: any) => ({
          company_id: savedCo.id,
          name: p.name,
          title: p.title,
          linkedin_url: p.linkedin_url
        }));
        await supabase.from('company_pocs').insert(pocsToSave);
      }

      setCompanies(prev => prev.map(c => {
        if (c.id === company.id) {
          return { ...c, ...enrichedResult, id: savedCo?.id || c.id };
        }
        return c;
      }));
    } catch (error) {
      console.error(error);
      setCompanies(prev => prev.map(c =>
        c.id === company.id ? { ...c, enrichStatus: "error" as const } : c
      ));
    } finally {
      setEnrichingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(company.id);
        return newSet;
      });
    }
  };

  // Keep localStorage in sync with every company change
  useEffect(() => {
    if (companies.length > 0) {
      localStorage.setItem("sdr_companies", JSON.stringify(companies));
    }
  }, [companies]);

  const handleUpdateCompany = (updatedCompany: CompanyData) => {
    setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
  };

  const exampleChips = [
    { label: "JB Hunt", type: "Company" },
    { label: "www.ryder.com", type: "Website" },
    { label: "linkedin.com/company/maersk", type: "LinkedIn" },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
            <LayoutDashboard className="size-3.5" />
            <span>Dashboard</span>
            <ChevronRight className="size-3" />
            <span className="text-slate-900">Prospecting</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {companies.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="size-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Clear all results"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="h-8 px-3 rounded-xl font-bold uppercase text-[10px] tracking-widest border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#00A3FF] hover:border-blue-200 transition-all gap-1.5"
          >
            {isParsing ? <Loader2 className="size-3 animate-spin" /> : <FileUp className="size-3" />}
            Upload HubSpot
          </Button>

          <div className="h-6 w-px bg-slate-100" />

          <div className="flex items-center gap-2 pl-1">
            <div className="size-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-[1.5px]">
              <div className="size-full rounded-[9px] bg-white flex items-center justify-center">
                <User className="size-4 text-blue-600" />
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SDR</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
          {/* Title + Smart Lookup Area */}
          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Lean SDR <span className="text-[#00A3FF]">Intelligence</span>
              </h1>
              <p className="text-slate-500 font-medium text-sm">Your AI-powered prospecting copilot. Look up any company or upload your HubSpot list.</p>
            </div>

            {/* Smart Lookup Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-4 text-[#00A3FF]" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Smart Company Lookup</span>
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-300" />
                  <Input
                    placeholder="Enter company name, website URL, or LinkedIn URL..."
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSmartLookup();
                    }}
                    disabled={isLookupLoading}
                    className="h-12 pl-12 pr-4 text-sm rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:border-[#00A3FF] transition-all shadow-none"
                  />
                </div>
                <Button
                  onClick={() => handleSmartLookup()}
                  disabled={!lookupInput.trim() || isLookupLoading}
                  className="h-12 px-6 bg-[#00A3FF] hover:bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-blue-500/15 transition-all gap-2 whitespace-nowrap"
                >
                  {isLookupLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Analyze
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Example chips */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Try:</span>
                {exampleChips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => {
                      setLookupInput(chip.label);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-500 hover:bg-blue-50 hover:text-[#00A3FF] hover:border-blue-200 transition-all cursor-pointer"
                  >
                    <span className="text-[9px] font-bold text-slate-300 uppercase">{chip.type}:</span>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <TargetCompanyDashboard
            companies={companies}
            enrichingIds={enrichingIds}
            onEnrich={handleEnrich}
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            onUpdateCompany={handleUpdateCompany}
            onSmartLookup={handleSmartLookup}
            onUploadClick={() => fileInputRef.current?.click()}
            isLookupLoading={isLookupLoading}
          />
        </div>
      </main>
    </div>
  );
}
