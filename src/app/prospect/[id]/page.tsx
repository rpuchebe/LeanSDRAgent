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
    Loader2
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

export default function ProspectPage() {
    const params = useParams();
    const router = useRouter();
    const [company, setCompany] = useState<CompanyData | null>(null);
    const [comments, setComments] = useState<Record<string, POCComment[]>>({});
    const [newComment, setNewComment] = useState("");
    const [activeCommentPoc, setActiveCommentPoc] = useState<string | null>(null);
    const [isEnriching, setIsEnriching] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetchCompanyData();
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
                pocs: dbCompany.company_pocs?.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    title: p.title,
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

    const handlePocLinkedInClick = async (pocId: string, current: boolean) => {
        // Only set to true if not already accepted/opened
        if (!current) {
            await toggleAccepted(pocId, false);
        }
    };

    const handleUpdateData = async () => {
        if (!company) return;
        setIsEnriching(true);
        try {
            const res = await fetch("/api/companies/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyName: company.name, website: company.website }),
            });

            if (!res.ok) throw new Error("Failed to enrich");
            const data = await res.json();

            // Construct new data
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
                    linkedin_url: p.linkedin_url
                }));
                const { data: newPocs } = await supabase.from('company_pocs').insert(pocsToSave).select();

                if (newPocs) {
                    mappedPocs = newPocs.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        title: p.title,
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
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Intelligence...</p>
            </div>
        </div>
    );

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
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                        Export Profile
                    </Button>
                    <Button
                        onClick={handleUpdateData}
                        disabled={isEnriching}
                        className="h-9 px-4 bg-[#00A3FF] hover:bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 transition-all gap-2"
                    >
                        {isEnriching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                        Update Data
                    </Button>
                </div>
            </div>

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
                                        "{company.description}"
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

                    {/* Page Tabs */}
                    <div className="px-10 mt-10">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="bg-transparent border-b border-slate-100 w-full justify-start rounded-none h-auto p-0 gap-8">
                                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent px-2 pb-4 pt-0 font-bold text-[11px] uppercase tracking-[0.15em] text-slate-400 data-[state=active]:text-blue-600 transition-all">Overview</TabsTrigger>
                                <TabsTrigger value="jobs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent px-2 pb-4 pt-0 font-bold text-[11px] uppercase tracking-[0.15em] text-slate-400 data-[state=active]:text-blue-600 transition-all">Jobs & Talent</TabsTrigger>
                                <TabsTrigger value="matches" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent px-2 pb-4 pt-0 font-bold text-[11px] uppercase tracking-[0.15em] text-slate-400 data-[state=active]:text-blue-600 transition-all">Match Customers</TabsTrigger>
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
                                            {(company.rolesMatch && company.rolesMatch.length > 0 ? company.rolesMatch : [
                                                { role: "Dispatcher", fitLevel: "High", estSalary: "$45k - $65k" },
                                                { role: "Logistics Coordinator", fitLevel: "High", estSalary: "$50k - $70k" },
                                                { role: "Track & Trace", fitLevel: "Medium", estSalary: "$40k - $55k" },
                                                { role: "Carrier Sales", fitLevel: "High", estSalary: "$60k - $90k" }
                                            ]).map((item, idx) => {
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
                                            })}
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
                                                {(company.relevantCustomers && company.relevantCustomers.length > 0 ? company.relevantCustomers : [
                                                    { company: "JB Hunt", reasoning: "Large logistics portfolio match." },
                                                    { company: "CH Robinson", reasoning: "Market share similarities." }
                                                ]).map((customer: any, idx) => (
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
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
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

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {company.pocs?.map((poc) => (
                            <div key={poc.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-blue-300 transition-all group">
                                <div
                                    className="p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50/50"
                                    onClick={(e) => {
                                        const url = poc.linkedinUrl || (poc as any).linkedin_url;
                                        if (url) {
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                            handlePocLinkedInClick(poc.id, !!poc.isAccepted);
                                        } else {
                                            // Toggle comment section if no linkedin is found, 
                                            // or just toggle comment section if you want to keep that functionality
                                            setActiveCommentPoc(activeCommentPoc === poc.id ? null : poc.id);
                                        }
                                    }}
                                >
                                    {/* Avatar */}
                                    <div className="size-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                                        {poc.profilePicUrl ? (
                                            <img src={poc.profilePicUrl} className="size-full object-cover" />
                                        ) : (
                                            <User className="size-4 text-indigo-400" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 text-xs truncate pr-2 group-hover:text-blue-600 transition-colors">{poc.name}</span>
                                            <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                {(poc.linkedinUrl || (poc as any).linkedin_url) && (
                                                    <a
                                                        href={poc.linkedinUrl || (poc as any).linkedin_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="size-5 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-colors"
                                                        onClick={() => handlePocLinkedInClick(poc.id, !!poc.isAccepted)}
                                                    >
                                                        <Linkedin className="size-3" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleAccepted(poc.id, !!poc.isAccepted); }}
                                                    className={`size-5 rounded-md border flex items-center justify-center transition-colors ${poc.isAccepted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200 bg-white hover:border-blue-400'}`}
                                                >
                                                    {poc.isAccepted && <Check className="size-3 text-white stroke-[3px]" />}
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight truncate mt-0.5">{poc.title}</p>
                                    </div>
                                </div>

                                {/* Comment Section (Collapsible) */}
                                {activeCommentPoc === poc.id && (
                                    <div className="bg-slate-50 p-3 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Add comment..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                className="h-7 rounded-lg text-[10px] bg-white border-slate-200"
                                            />
                                            <Button size="sm" onClick={() => handleAddComment(poc.id)} className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-7 px-2">
                                                <Plus className="size-3" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2 max-h-32 overflow-y-auto">
                                            {comments[poc.id]?.map((comm) => (
                                                <div key={comm.id} className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[8px] font-bold text-blue-600 uppercase">You</span>
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase">{new Date(comm.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-[10px] font-medium text-slate-600">{comm.comment}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {(!company.pocs || company.pocs.length === 0) && (
                            <div className="py-8 text-center text-slate-400 space-y-2">
                                <Target className="size-6 mx-auto opacity-20" />
                                <p className="font-bold uppercase text-[9px] tracking-widest">No POCs</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                        <Button className="w-full h-10 bg-[#00A3FF] hover:bg-blue-600 rounded-xl text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/10">
                            Identify More Strategy
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

