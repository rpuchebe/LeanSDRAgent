"use client";

import React, { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import {
  Bell,
  Search,
  User,
  FileUp,
  Loader2,
  CheckCircle2,
  Building2,
  LayoutDashboard,
  ChevronRight,
  Target,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TargetCompanyDashboard, { CompanyData, checkIsTarget } from "@/components/TargetCompanyDashboard";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(true); // Default to paused to avoid auto-starting
  const [manualCompany, setManualCompany] = useState("");
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

  const handleAddManualCompany = () => {
    if (!manualCompany.trim()) return;

    const newCo: CompanyData = {
      id: Math.random().toString(36).substr(2, 9),
      name: manualCompany.trim(),
      industry: "",
      country: "",
      website: "",
      linkedin: "",
      isTarget: undefined,
    };

    // Auto-start enrichment for the new company
    setCompanies(prev => [newCo, ...prev]);
    setIsPaused(false);
    isPausedRef.current = false;
    localStorage.setItem("sdr_is_paused", "false");
    setManualCompany("");
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
      const newLinkedin = (data.linkedin && typeof data.linkedin === "string" && data.linkedin.startsWith("http"))
        ? data.linkedin
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

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header matches SDLC style */}
      <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
            <LayoutDashboard className="size-3.5" />
            <span>Dashboard</span>
            <ChevronRight className="size-3" />
            <span className="text-slate-900">Prospecting</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {companies.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="size-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Clear all results"
            >
              <Trash2 className="size-4" />
            </Button>
          )}

          {/* New Input for adding manual company */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all h-9">
            <Input
              placeholder="Add company manually..."
              value={manualCompany}
              onChange={(e) => setManualCompany(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddManualCompany();
              }}
              className="border-none bg-transparent h-full placeholder:text-[10px] text-xs font-semibold text-slate-700 px-3 focus-visible:ring-0 focus-visible:ring-offset-0 w-48 shadow-none"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddManualCompany}
              className="h-full px-3 hover:bg-slate-200 rounded-none text-slate-500 hover:text-blue-600 font-bold uppercase text-[10px] tracking-widest border-l border-slate-200"
            >
              Add
            </Button>
          </div>

          {/* Move Upload here */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="h-9 px-4 bg-[#00A3FF] hover:bg-blue-600 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-blue-500/10 transition-all gap-2"
          >
            {isParsing ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
            Upload HubSpot Data
          </Button>

          <div className="h-8 w-px bg-slate-100 mx-2" />

          <Button variant="ghost" size="icon" className="relative text-slate-500 hover:bg-slate-50 rounded-xl">
            <Bell className="size-5" />
            <span className="absolute top-2 right-2 size-2 bg-blue-500 rounded-full border-2 border-white" />
          </Button>

          <div className="flex items-center gap-3 pl-2 group cursor-pointer">
            <div className="text-right flex flex-col">
              <span className="text-xs font-bold text-slate-900 leading-none">Raimundo LSG</span>
              <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-tight">Lead SDR</span>
            </div>
            <div className="size-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-[2px]">
              <div className="size-full rounded-[10px] bg-white flex items-center justify-center">
                <User className="size-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight uppercase">
              Intelligence <span className="text-[#00A3FF] italic font-bold uppercase">Portal</span>
            </h1>
            <p className="text-slate-500 font-medium">Identify and verify high-value logistics targets across the United States.</p>
          </div>

          <TargetCompanyDashboard
            companies={companies}
            enrichingIds={enrichingIds}
            onEnrich={handleEnrich}
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            onUpdateCompany={handleUpdateCompany}
          />
        </div>
      </main>
    </div >
  );
}
