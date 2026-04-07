"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Building2,
    MapPin,
    Globe,
    Linkedin,
    ArrowLeft,
    Sparkles,
    CheckCircle2,
    ChevronRight,
    Search,
    User,
    Mail,
    Copy,
    Check,
    Plus,
    ExternalLink,
    Users,
    DollarSign,
    History,
    Briefcase,
    Target,
    MessageSquare,
    BadgeInfo,
    Building,
    TrendingUp,
    Globe2,
    ShieldCheck,
    Clock,
    Navigation,
    RefreshCw,
    Loader2,
    AlertTriangle,
    Lightbulb,
    Send,
    FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CompanyData } from "@/components/TargetCompanyDashboard";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface POCComment {
    id: string;
    poc_id: string;
    comment: string;
    author_name: string;
    created_at: string;
}

// Helper: determine LinkedIn link type and generate appropriate URL
function getLinkedInAction(poc: { name: string; linkedinUrl: string }, companyName: string) {
    const url = poc.linkedinUrl;
    if (url && url.includes("/sales/search/")) {
        return { type: "search" as const, url, label: "Search on LinkedIn" };
    }
    if (url && url.includes("/in/")) {
        return { type: "profile" as const, url, label: "View Profile" };
    }
    // Fallback: manual search
    const fallbackUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(poc.name + " " + companyName)}`;
    return { type: "manual" as const, url: fallbackUrl, label: "Search Manually" };
}

export default function ProspectPage() {
    const params = useParams();
    const router = useRouter();
    const [company, setCompany] = useState<CompanyData | null>(null);
    const [comments, setComments] = useState<Record<string, POCComment[]>>({});
    const [newComment, setNewComment] = useState("");
    const [activeCommentPoc, setActiveCommentPoc] = useState<string | null>(null);
    const [isEnriching, setIsEnriching] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);
    const [loadingTimeout, setLoadingTimeout] = useState(false);
    const [generatedOutreach, setGeneratedOutreach] = useState<Record<string, Record<string, any>>>({});
    const [generatingOutreach, setGeneratingOutreach] = useState<Record<string, boolean>>({});
    const [outreachCopied, setOutreachCopied] = useState<string | null>(null);

    useEffect(() => {
        fetchCompanyData();
        const timer = setTimeout(() => {
            setLoadingTimeout(true);
        }, 10000);
        return () => clearTimeout(timer);
    }, [params.id]);

    const fetchCompanyData = async () => {
        // Try fetching by ID first (if it's a UUID) or by name
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id as string);

        let query = supabase.from('verified_companies').select('*, company_pocs(*)');

        if (isUUID) {
            query = query.eq('id', params.id);
        } else {
            // If it's the index-name format from local state, extract name
            const namePart = (params.id as string).split('-').slice(1).join('-');
            const searchName = namePart || params.id;
            query = query.eq('name', searchName);
        }

        const { data: dbCompany, error } = await query.maybeSingle();

        if (dbCompany) {
            const formatted: CompanyData = {
                id: dbCompany.id,
                name: dbCompany.name,
                industry: dbCompany.industry,
                country: dbCompany.country,
                website: dbCompany.website,
                linkedin: dbCompany.linkedin_url,
                description: dbCompany.description,
                headquarters: dbCompany.headquarters,
                foundedYear: dbCompany.founded_year,
                history: dbCompany.history,
                totalEmployees: dbCompany.total_employees,
                employeeSegregation: dbCompany.employee_segregation,
                revenue: dbCompany.revenue,
                tags: dbCompany.tags,
                matchAnalysis: dbCompany.match_reasoning,
                rolesMatch: dbCompany.roles_match,
                relevantCustomers: dbCompany.relevant_customers,
                enrichStatus: "verified",
                lsgFitScore: dbCompany.lsg_fit_score,
                lsgFitReasoning: dbCompany.lsg_fit_reasoning,
                outreachAngle: dbCompany.outreach_angle,
                pocs: dbCompany.company_pocs?.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    title: p.title,
                    department: p.department,
                    seniorityLevel: p.seniority_level,
                    linkedinUrl: p.linkedin_url,
                    isAccepted: p.is_accepted,
                    profilePicUrl: p.profile_pic_url
                })) || []
            };
            setCompany(formatted);
            fetchComments(formatted.pocs?.map(p => p.id) || []);
        } else {
            // Fallback to localStorage if not in DB yet
            const saved = localStorage.getItem("sdr_companies");
            if (saved) {
                const found = JSON.parse(saved).find((c: any) => c.id === params.id || c.name === params.id);
                if (found) setCompany(found);
            }
        }
    };

    const fetchComments = async (pocIds: string[]) => {
        if (pocIds.length === 0) return;
        const { data } = await supabase
            .from('poc_comments')
            .select('*')
            .in('poc_id', pocIds)
            .order('created_at', { ascending: false });

        if (data) {
            const grouped = data.reduce((acc: any, comm: any) => {
                if (!acc[comm.poc_id]) acc[comm.poc_id] = [];
                acc[comm.poc_id].push(comm);
                return acc;
            }, {});
            setComments(grouped);
        }
    };

    const handleAddComment = async (pocId: string) => {
        if (!newComment.trim()) return;
        const { data, error } = await supabase
            .from('poc_comments')
            .insert({
                poc_id: pocId,
                comment: newComment,
                author_name: "LSG Agent"
            })
            .select()
            .single();

        if (data) {
            setComments(prev => ({
                ...prev,
                [pocId]: [data, ...(prev[pocId] || [])]
            }));
            setNewComment("");
        }
    };

    const toggleAccepted = async (pocId: string, current: boolean) => {
        const newVal = !current;
        await supabase.from('company_pocs').update({ is_accepted: newVal }).eq('id', pocId);
        setCompany(prev => {
            if (!prev) return null;
            return {
                ...prev,
                pocs: prev.pocs?.map(p => p.id === pocId ? { ...p, isAccepted: newVal } : p)
            };
        });
    };

    const handleGenerateOutreach = async (pocId: string, pocName: string, pocTitle: string, pocDepartment: string, channel: "email" | "linkedin" | "call_script") => {
        if (!company) return;
        const key = `${pocId}_${channel}`;
        setGeneratingOutreach(prev => ({ ...prev, [key]: true }));
        try {
            const res = await fetch("/api/emails/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName: company.name,
                    industry: company.industry,
                    pocName: pocName,
                    pocTitle: pocTitle,
                    pocDepartment: pocDepartment,
                    outreachAngle: company.outreachAngle,
                    relevantCustomers: company.relevantCustomers?.map((c: any) => typeof c === 'string' ? c : c.company),
                    channel
                }),
            });
            if (!res.ok) throw new Error("Failed to generate outreach");
            const data = await res.json();
            setGeneratedOutreach(prev => ({
                ...prev,
                [pocId]: { ...(prev[pocId] || {}), [channel]: data }
            }));
        } catch (error) {
            console.error("Failed to generate outreach", error);
        } finally {
            setGeneratingOutreach(prev => ({ ...prev, [key]: false }));
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setOutreachCopied(id);
        setTimeout(() => setOutreachCopied(null), 2000);
    };

    const handleUpdateData = async () => {
        if (!company) return;
        setIsEnriching(true);
        setShowReanalyzeConfirm(false);
        try {
            const res = await fetch("/api/companies/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyName: company.name, website: company.website }),
            });

            if (!res.ok) throw new Error("Failed to enrich");
            const data = await res.json();

            // Construct new data with exact DB column names
            const enrichedResult = {
                country: data.country || company.country,
                industry: data.industry || company.industry,
                website: data.website || company.website,
                linkedin_url: data.linkedin || company.linkedin,
                description: data.description || company.description,
                headquarters: data.headquarters || company.headquarters,
                founded_year: data.foundedYear,
                history: data.history,
                total_employees: data.totalEmployees,
                employee_segregation: data.employeeSegregation,
                revenue: data.revenue,
                tags: data.tags,
                match_reasoning: data.matchAnalysis,
                roles_match: data.rolesMatch,
                relevant_customers: data.relevantCustomers,
            };

            const { data: savedCo, error: saveErr } = await supabase
                .from('verified_companies')
                .update(enrichedResult)
                .eq('id', company.id)
                .select()
                .single();

            let mappedPocs = company.pocs || [];
            if (savedCo && data.pocs && data.pocs.length > 0) {
                await supabase.from('company_pocs').delete().eq('company_id', savedCo.id);

                const pocsToSave = data.pocs.map((p: any) => ({
                    company_id: savedCo.id,
                    name: p.name,
                    title: p.title,
                    department: p.department,
                    seniority_level: p.seniorityLevel,
                    linkedin_url: p.linkedin_url || p.searchUrl
                }));
                const { data: newPocs } = await supabase.from('company_pocs').insert(pocsToSave).select();

                if (newPocs) {
                    mappedPocs = newPocs.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        title: p.title,
                        department: p.department,
                        seniorityLevel: p.seniority_level,
                        linkedinUrl: p.linkedin_url,
                        isAccepted: p.is_accepted,
                        profilePicUrl: p.profile_pic_url
                    }));
                }
            }

            // Update local state regardless of POCs
            setCompany({
                ...company,
                ...enrichedResult,
                country: enrichedResult.country,
                industry: enrichedResult.industry,
                website: enrichedResult.website,
                linkedin: enrichedResult.linkedin_url,
                foundedYear: enrichedResult.founded_year,
                totalEmployees: enrichedResult.total_employees,
                employeeSegregation: enrichedResult.employee_segregation,
                matchAnalysis: enrichedResult.match_reasoning,
                rolesMatch: enrichedResult.roles_match,
                relevantCustomers: enrichedResult.relevant_customers,
                pocs: mappedPocs
            });
        } catch (error) {
            console.error("Failed to update data", error);
        } finally {
            setIsEnriching(false);
        }
    };

    if (!company) return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                {loadingTimeout ? (
                    <>
                        <AlertTriangle className="size-12 text-amber-400" />
                        <p className="text-slate-700 font-bold text-sm">Company not found.</p>
                        <p className="text-slate-400 text-xs">It may not have been enriched yet.</p>
                        <Button onClick={() => router.back()} className="mt-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest">
                            <ArrowLeft className="size-3 mr-2" />
                            Go Back
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Intelligence...</p>
                    </>
                )}
            </div>
        </div>
    );

    const fitScore = company.lsgFitScore;
    const fitScoreColor = fitScore != null
        ? fitScore >= 8 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
        : fitScore >= 5 ? "text-amber-600 bg-amber-50 border-amber-200"
        : "text-red-600 bg-red-50 border-red-200"
        : "";

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            {/* Top Navigation Bar */}
            <div className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-slate-900 rounded-xl px-2">
                        <ArrowLeft className="size-4 mr-2" />
                        <span className="uppercase tracking-widest text-[10px] font-bold">Back</span>
                    </Button>
                    <div className="h-4 w-px bg-slate-100" />
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Building2 className="size-4 text-white" />
                        </div>
                        <span className="font-bold text-slate-900 uppercase tracking-tight text-sm">{company.name}</span>
                        {fitScore != null && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold ${fitScoreColor}`}>
                                <Target className="size-3" />
                                {fitScore}/10
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Button
                            onClick={() => setShowReanalyzeConfirm(true)}
                            disabled={isEnriching}
                            className="h-9 px-4 bg-[#00A3FF] hover:bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 transition-all gap-2"
                        >
                            {isEnriching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                            Re-analyze
                        </Button>

                        {/* Confirmation Dialog */}
                        {showReanalyzeConfirm && (
                            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <p className="text-sm font-medium text-slate-700 mb-3">
                                    This will re-enrich the company data and refresh all POCs. Continue?
                                </p>
                                <div className="flex items-center gap-2 justify-end">
                                    <Button variant="outline" size="sm" onClick={() => setShowReanalyzeConfirm(false)} className="rounded-lg text-xs">
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleUpdateData} className="rounded-lg text-xs bg-blue-500 hover:bg-blue-600 text-white">
                                        Yes, Re-analyze
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Click-away for confirmation dialog */}
            {showReanalyzeConfirm && (
                <div className="fixed inset-0 z-40" onClick={() => setShowReanalyzeConfirm(false)} />
            )}

            <div className="flex-1 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-0 overflow-hidden h-[calc(100vh-64px)]">

                {/* MAIN CONTENT AREA (Scrollable) */}
                <div className="col-span-12 lg:col-span-8 overflow-y-auto custom-scrollbar bg-white lg:border-r border-slate-100">

                    {/* Compact Header Section */}
                    <div className="px-6 pt-6">
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                            <div className="flex flex-col md:flex-row gap-5 items-start">
                                <div className="size-16 rounded-[1.2rem] bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                    <Building2 className="size-8 text-blue-600" />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{company.name}</h1>
                                        <Badge className="bg-emerald-50 text-emerald-600 border-none px-2 py-0.5 font-bold text-[9px] uppercase tracking-widest">Qualified</Badge>
                                    </div>

                                    <div className="flex items-center gap-3 text-slate-400 mb-3">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="size-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{company.headquarters || company.country}</span>
                                        </div>
                                        <div className="size-1 rounded-full bg-slate-200" />
                                        <div className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                                            <Globe className="size-3" />
                                            <a href={company.website} target="_blank" className="text-[10px] font-bold uppercase tracking-widest">{company.website?.replace(/^https?:\/\//, '')}</a>
                                        </div>
                                    </div>

                                    <p className="text-slate-600 font-medium leading-relaxed max-w-4xl text-xs italic mb-4 line-clamp-2">
                                        &ldquo;{company.description}&rdquo;
                                    </p>

                                    <div className="flex flex-wrap gap-1.5">
                                        {company.tags?.map((tag, idx) => (
                                            <Badge key={idx} variant="outline" className="rounded-lg border-blue-100 bg-blue-50/50 text-blue-600 font-bold px-2 py-0.5 text-[9px] uppercase tracking-wide">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Outreach Strategy Card (if data available) */}
                    {(fitScore != null || company.outreachAngle) && (
                        <div className="px-6 mt-4">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                                <div className="flex items-start gap-4">
                                    {fitScore != null && (
                                        <div className={`shrink-0 size-16 rounded-2xl border-2 flex flex-col items-center justify-center ${fitScoreColor}`}>
                                            <span className="text-2xl font-black leading-none">{fitScore}</span>
                                            <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">/10</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Target className="size-4 text-blue-600" />
                                            <h3 className="font-bold text-slate-900 text-sm">LSG Fit Score</h3>
                                        </div>
                                        {company.lsgFitReasoning && (
                                            <p className="text-xs text-slate-600 leading-relaxed mb-3">{company.lsgFitReasoning}</p>
                                        )}
                                        {company.outreachAngle && (
                                            <div className="bg-white/70 rounded-xl p-3 border border-blue-100">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Lightbulb className="size-3.5 text-amber-500" />
                                                    <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Recommended Approach</span>
                                                </div>
                                                <p className="text-xs text-slate-700 font-medium leading-relaxed">{company.outreachAngle}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Page Tabs */}
                    <div className="px-10 mt-10">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="bg-transparent border-b border-slate-100 w-full justify-start rounded-none h-auto p-0 gap-8">
                                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent px-2 pb-4 pt-0 font-bold text-[11px] uppercase tracking-[0.15em] text-slate-400 data-[state=active]:text-blue-600 transition-all">Overview</TabsTrigger>
                                <TabsTrigger value="jobs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent px-2 pb-4 pt-0 font-bold text-[11px] uppercase tracking-[0.15em] text-slate-400 data-[state=active]:text-blue-600 transition-all">Jobs & Talent</TabsTrigger>
                                <TabsTrigger value="matches" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent px-2 pb-4 pt-0 font-bold text-[11px] uppercase tracking-[0.15em] text-slate-400 data-[state=active]:text-blue-600 transition-all">Match Customers</TabsTrigger>
                                <TabsTrigger value="outreach" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent px-2 pb-4 pt-0 font-bold text-[11px] uppercase tracking-[0.15em] text-slate-400 data-[state=active]:text-blue-600 transition-all">Outreach</TabsTrigger>
                            </TabsList>

                            {/* OVERVIEW TAB */}
                            <TabsContent value="overview" className="py-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Compact Numbers & Segregation Graph */}
                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                                    <div className="xl:col-span-5 grid grid-cols-2 gap-3">
                                        <Card className="rounded-xl border-slate-100 shadow-sm bg-white">
                                            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                                                <Users className="size-4 text-blue-500 mb-2" />
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employees</p>
                                                <p className="text-sm font-bold text-slate-900">{company.totalEmployees || '-'}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="rounded-xl border-slate-100 shadow-sm bg-white">
                                            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                                                <TrendingUp className="size-4 text-emerald-500 mb-2" />
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Revenue</p>
                                                <p className="text-sm font-bold text-slate-900">{company.revenue || '-'}</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Employee Segregation Horizontal Graph */}
                                    <div className="xl:col-span-7">
                                        <Card className="rounded-xl border-slate-100 shadow-sm bg-white h-full">
                                            <CardContent className="p-5 flex flex-col justify-center h-full">
                                                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-4">Employees by country</p>

                                                {(() => {
                                                    const segObj = company.employeeSegregation || {};
                                                    // Parse values safely to numbers
                                                    const entries = Object.entries(segObj)
                                                        .map(([k, v]) => [k, typeof v === 'number' ? v : parseInt(String(v)) || 0])
                                                        .filter(([k, v]) => (v as number) > 0);

                                                    const total = entries.reduce((acc, [_, count]) => acc + (count as number), 0);
                                                    const colors = ['bg-emerald-500', 'bg-amber-400', 'bg-blue-500', 'bg-rose-400', 'bg-violet-500'];

                                                    if (total === 0 || entries.length === 0) return <div className="text-xs text-slate-400 font-medium pb-2">No segregation data available.</div>;

                                                    return (
                                                        <div className="space-y-4">
                                                            <div className="w-full h-3.5 flex rounded-full overflow-hidden gap-1">
                                                                {entries.map(([country, count], i) => (
                                                                    <div
                                                                        key={country}
                                                                        className={`h-full ${colors[i % colors.length]}`}
                                                                        style={{ width: `${((count as number) / total) * 100}%` }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <div className="flex flex-wrap gap-4 items-center">
                                                                {entries.map(([country, count], i) => {
                                                                    const percentage = Math.round(((count as number) / total) * 100);
                                                                    return (
                                                                        <div key={country} className="flex items-center gap-1.5">
                                                                            <div className={`size-2.5 rounded-full ${colors[i % colors.length]}`} />
                                                                            <span className="text-[10px] font-medium text-slate-500">{country} <span className="font-bold text-slate-900 ml-1">{percentage}%</span></span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* History Section */}
                                <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <History className="size-4 text-blue-500" />
                                        <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs">Company Background</h3>
                                    </div>
                                    <p className="text-slate-600 font-medium text-xs leading-relaxed">
                                        {company.history || "No historical data available for this company. Our AI is currently monitoring for updates."}
                                    </p>
                                </div>
                            </TabsContent>

                            {/* JOBS TAB */}
                            <TabsContent value="jobs" className="py-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Position</th>
                                                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Pay</th>
                                                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Match</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {company.rolesMatch && company.rolesMatch.length > 0 ? company.rolesMatch.map((item, idx) => {
                                                const matchLower = item.fitLevel.toLowerCase();
                                                let matchColorClass = 'bg-slate-100 text-slate-500';

                                                if (matchLower === 'high') matchColorClass = 'bg-red-50 text-red-600';
                                                else if (matchLower === 'medium') matchColorClass = 'bg-yellow-50 text-yellow-600 border border-yellow-200';
                                                else if (matchLower === 'low') matchColorClass = 'bg-slate-50 text-slate-500 border border-slate-200';

                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-5 py-3 font-bold text-slate-900 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <Briefcase className={`size-3.5 ${matchLower === 'high' ? 'text-red-500' : matchLower === 'medium' ? 'text-yellow-500' : 'text-slate-400'}`} />
                                                                {item.role}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3 font-medium text-slate-600 text-xs">
                                                            {item.estSalary}
                                                        </td>
                                                        <td className="px-5 py-3 text-right">
                                                            <Badge className={`border-none font-bold text-[9px] uppercase tracking-widest ${matchColorClass}`}>
                                                                {item.fitLevel}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                )
                                            }) : (
                                                <tr>
                                                    <td colSpan={3} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                                                        No roles data available. Click Re-analyze to generate.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </TabsContent>

                            {/* MATCH CUSTOMERS TAB */}
                            <TabsContent value="matches" className="py-10 space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8">
                                    <div className="flex items-start gap-6">
                                        <div className="size-14 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0">
                                            <ShieldCheck className="size-8 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">Relatable Customer Analysis</h3>
                                            <p className="text-slate-500 font-medium leading-relaxed">
                                                {company.matchAnalysis || "Our AI is analyzing our client portfolio to identify the best social proof for this prospect."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="font-bold text-slate-900 uppercase tracking-tight text-xs px-2">Key Reference Companies</h4>
                                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-1/4">Company</th>
                                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Match Reasoning</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {company.relevantCustomers && company.relevantCustomers.length > 0 ? company.relevantCustomers.map((customer: any, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-5 py-4 align-top font-bold text-slate-900 text-xs">
                                                            <div className="flex items-center gap-2 select-text">
                                                                <Building className="size-3.5 text-blue-500 shrink-0" />
                                                                {typeof customer === 'string' ? customer : customer.company || customer.name}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 align-top font-medium text-slate-600 text-xs leading-relaxed select-text">
                                                            {typeof customer === 'string' ? 'Relevant target reference.' : customer.reasoning}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={2} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                                                            No customer match data available. Click Re-analyze to generate.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* OUTREACH TAB */}
                            <TabsContent value="outreach" className="py-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Outreach Angle */}
                                {company.outreachAngle ? (
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Lightbulb className="size-5 text-amber-500" />
                                            <h3 className="font-bold text-slate-900 text-sm">Outreach Angle</h3>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed">{company.outreachAngle}</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center">
                                        <Lightbulb className="size-6 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs text-slate-400 font-medium">No outreach angle available yet. Click Re-analyze to generate one.</p>
                                    </div>
                                )}

                                {/* LSG Fit Reasoning */}
                                {company.lsgFitReasoning && (
                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Target className="size-5 text-blue-500" />
                                            <h3 className="font-bold text-slate-900 text-sm">Why This Company Fits LSG</h3>
                                            {fitScore != null && (
                                                <Badge className={`ml-auto font-bold text-xs ${fitScoreColor} border`}>{fitScore}/10</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{company.lsgFitReasoning}</p>
                                    </div>
                                )}

                                {/* Multi-channel Suggestions */}
                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-900 uppercase tracking-widest text-[10px] px-1">Suggested Channels</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <Card className="rounded-xl border-slate-200 shadow-sm">
                                            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                                <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                                    <Mail className="size-5 text-blue-500" />
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Email</p>
                                                <p className="text-[10px] text-slate-500">Personalized cold email using outreach angle</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="rounded-xl border-slate-200 shadow-sm">
                                            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                                <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                                    <Linkedin className="size-5 text-blue-500" />
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">LinkedIn</p>
                                                <p className="text-[10px] text-slate-500">Connection request + InMail sequence</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="rounded-xl border-slate-200 shadow-sm">
                                            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                                <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                                    <Send className="size-5 text-emerald-500" />
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Direct</p>
                                                <p className="text-[10px] text-slate-500">Phone call to accepted POCs</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* Accepted POCs - Generate Outreach */}
                                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-900 uppercase tracking-widest text-[10px] mb-3">Generate Outreach for Accepted Contacts</h4>
                                    {company.pocs?.filter(p => p.isAccepted).length ? (
                                        <div className="space-y-4">
                                            {company.pocs?.filter(p => p.isAccepted).map(poc => (
                                                <div key={poc.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                                    <div className="flex items-center justify-between p-3 bg-emerald-50/50 border-b border-emerald-100">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900">{poc.name}</p>
                                                            <p className="text-[10px] text-slate-500">{poc.title}{poc.department ? ` - ${poc.department}` : ''}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {(["email", "linkedin", "call_script"] as const).map(channel => {
                                                                const key = `${poc.id}_${channel}`;
                                                                const isGenerating = generatingOutreach[key];
                                                                const hasGenerated = generatedOutreach[poc.id]?.[channel];
                                                                const labels = { email: "Email", linkedin: "LinkedIn", call_script: "Call Script" };
                                                                const icons = { email: <Mail className="size-3" />, linkedin: <Linkedin className="size-3" />, call_script: <Send className="size-3" /> };
                                                                return (
                                                                    <Button
                                                                        key={channel}
                                                                        size="sm"
                                                                        variant={hasGenerated ? "outline" : "default"}
                                                                        disabled={isGenerating}
                                                                        onClick={() => handleGenerateOutreach(poc.id, poc.name, poc.title || '', poc.department || '', channel)}
                                                                        className={`h-7 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider gap-1 ${hasGenerated ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                                                                    >
                                                                        {isGenerating ? <Loader2 className="size-3 animate-spin" /> : icons[channel]}
                                                                        {hasGenerated ? <Check className="size-3" /> : labels[channel]}
                                                                    </Button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Rendered outreach results */}
                                                    {generatedOutreach[poc.id] && Object.entries(generatedOutreach[poc.id]).map(([channel, data]) => (
                                                        <div key={channel} className="p-4 border-b border-slate-100 last:border-b-0">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <Badge className="bg-blue-50 text-blue-600 border-none font-bold text-[9px] uppercase tracking-widest">
                                                                    {channel === 'call_script' ? 'Call Script' : channel}
                                                                </Badge>
                                                            </div>
                                                            {data.subject && (
                                                                <div className="mb-2">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Subject</p>
                                                                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                                                                        <p className="text-xs font-semibold text-slate-800">{data.subject}</p>
                                                                        <button onClick={() => copyToClipboard(data.subject, `${poc.id}_${channel}_subject`)} className="text-slate-400 hover:text-blue-500 ml-2 shrink-0">
                                                                            {outreachCopied === `${poc.id}_${channel}_subject` ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {(data.body || data.message) && (
                                                                <div className="mb-2">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Message</p>
                                                                    <div className="relative bg-slate-50 rounded-lg px-3 py-2">
                                                                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pr-6">{data.body || data.message}</p>
                                                                        <button onClick={() => copyToClipboard(data.body || data.message, `${poc.id}_${channel}_body`)} className="absolute top-2 right-2 text-slate-400 hover:text-blue-500">
                                                                            {outreachCopied === `${poc.id}_${channel}_body` ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {data.followUp && (
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Follow-up</p>
                                                                    <div className="relative bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100">
                                                                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pr-6">{data.followUp}</p>
                                                                        <button onClick={() => copyToClipboard(data.followUp, `${poc.id}_${channel}_followup`)} className="absolute top-2 right-2 text-slate-400 hover:text-blue-500">
                                                                            {outreachCopied === `${poc.id}_${channel}_followup` ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 text-center py-4">No accepted POCs yet. Accept contacts in the sidebar to plan outreach.</p>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Footer margin */}
                    <div className="h-40" />
                </div>

                {/* RIGHT SIDEBAR: POCs & CRM */}
                <div className="col-span-12 lg:col-span-4 flex flex-col h-full bg-slate-50 border-l border-slate-200">
                    <div className="p-4 border-b border-slate-200 bg-white shrink-0">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 uppercase tracking-widest text-[10px]">Decision Makers</h3>
                            <Badge className="bg-blue-50 text-blue-600 border-none font-bold text-[10px]">{company.pocs?.length || 0}</Badge>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
                        {company.pocs?.map((poc) => {
                            const linkedInAction = getLinkedInAction(poc, company.name);

                            return (
                                <div key={poc.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
                                    <div className="p-4">
                                        {/* Top row: Avatar + Name + Accept toggle */}
                                        <div className="flex items-start gap-3 mb-2.5">
                                            <div className="size-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                {poc.profilePicUrl ? (
                                                    <img src={poc.profilePicUrl} className="size-full object-cover" />
                                                ) : (
                                                    <User className="size-5 text-indigo-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-900 text-sm truncate pr-2">{poc.name}</span>
                                                    <button
                                                        onClick={() => toggleAccepted(poc.id, !!poc.isAccepted)}
                                                        className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${poc.isAccepted ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/20' : 'border-slate-200 bg-white hover:border-blue-400'}`}
                                                        title={poc.isAccepted ? "Accepted - click to unaccept" : "Click to accept this contact"}
                                                    >
                                                        {poc.isAccepted && <Check className="size-3.5 text-white stroke-[3px]" />}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate mt-0.5">{poc.title}</p>
                                                <Badge className="mt-1 bg-purple-50 text-purple-400 border-purple-100 border font-medium px-1.5 py-0 text-[8px] uppercase tracking-wider w-fit">AI-suggested</Badge>
                                            </div>
                                        </div>

                                        {/* Department + Seniority badges */}
                                        {(poc.department || poc.seniorityLevel) && (
                                            <div className="flex items-center gap-1.5 mb-3">
                                                {poc.department && (
                                                    <Badge variant="outline" className="rounded-md border-slate-200 bg-slate-50 text-slate-500 font-semibold px-1.5 py-0 text-[9px] gap-1">
                                                        <FolderOpen className="size-2.5" />
                                                        {poc.department}
                                                    </Badge>
                                                )}
                                                {poc.seniorityLevel && (
                                                    <Badge variant="outline" className="rounded-md border-violet-200 bg-violet-50 text-violet-600 font-semibold px-1.5 py-0 text-[9px]">
                                                        {poc.seniorityLevel}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        {/* LinkedIn action button */}
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={linkedInAction.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                                                    linkedInAction.type === "search"
                                                        ? "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                                                        : linkedInAction.type === "profile"
                                                        ? "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                                                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                                }`}
                                            >
                                                {linkedInAction.type === "search" ? (
                                                    <Search className="size-3" />
                                                ) : linkedInAction.type === "profile" ? (
                                                    <ExternalLink className="size-3" />
                                                ) : (
                                                    <Search className="size-3" />
                                                )}
                                                {linkedInAction.label}
                                            </a>

                                            {/* Comment toggle */}
                                            <button
                                                onClick={() => setActiveCommentPoc(activeCommentPoc === poc.id ? null : poc.id)}
                                                className={`size-8 rounded-lg border flex items-center justify-center transition-colors ${
                                                    activeCommentPoc === poc.id
                                                        ? "bg-blue-50 border-blue-200 text-blue-500"
                                                        : "border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                                }`}
                                                title="Add note"
                                            >
                                                <MessageSquare className="size-3.5" />
                                            </button>
                                        </div>

                                        {/* Unverified link warning */}
                                        {linkedInAction.type === "profile" && (
                                            <div className="flex items-center gap-1 mt-2 px-1">
                                                <AlertTriangle className="size-3 text-amber-500" />
                                                <span className="text-[9px] text-amber-600 font-medium">Unverified link - may not work</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Comment Section (Collapsible) */}
                                    {activeCommentPoc === poc.id && (
                                        <div className="bg-slate-50 p-3 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Add a note..."
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(poc.id); }}
                                                    className="h-8 rounded-lg text-xs bg-white border-slate-200"
                                                />
                                                <Button size="sm" onClick={() => handleAddComment(poc.id)} className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-8 px-3">
                                                    <Plus className="size-3" />
                                                </Button>
                                            </div>

                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {comments[poc.id]?.map((comm) => (
                                                    <div key={comm.id} className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[9px] font-bold text-blue-600 uppercase">{comm.author_name}</span>
                                                            <span className="text-[9px] text-slate-400 font-medium">{new Date(comm.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-[11px] font-medium text-slate-600">{comm.comment}</p>
                                                    </div>
                                                ))}
                                                {(!comments[poc.id] || comments[poc.id].length === 0) && (
                                                    <p className="text-[10px] text-slate-400 text-center py-2">No notes yet</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {(!company.pocs || company.pocs.length === 0) && (
                            <div className="py-8 text-center text-slate-400 space-y-2">
                                <Target className="size-6 mx-auto opacity-20" />
                                <p className="font-bold uppercase text-[9px] tracking-widest">No POCs</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
