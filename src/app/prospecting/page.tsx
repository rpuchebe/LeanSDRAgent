"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    Building2,
    Target,
    CheckCircle2,
    User,
    Users,
    Linkedin,
    MapPin,
    ChevronRight,
    Loader2,
    MoreVertical,
    RefreshCw,
    Trash,
    UserX,
    UserCheck,
    XCircle,
    Sparkles,
    CheckCircle,
    Filter,
    TrendingUp,
    DollarSign,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Star,
    Flame,
    Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export default function ProspectingPage() {
    const router = useRouter();
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<string>("lsg_fit_score");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir(key === "name" ? "asc" : "desc");
        }
    };

    useEffect(() => {
        fetchVerifiedCompanies();
    }, []);

    const fetchVerifiedCompanies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('verified_companies')
            .select('*, company_pocs(id, is_accepted)')
            .order('lsg_fit_score', { ascending: false, nullsFirst: false });

        if (data) setCompanies(data);
        setLoading(false);
    };

    const handleUpdate = async (company: any) => {
        setUpdatingId(company.id);
        try {
            const res = await fetch("/api/companies/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyName: company.name, website: company.website }),
            });

            if (!res.ok) throw new Error("Failed to enrich");
            const data = await res.json();

            // Upsert result to Supabase
            const { data: savedCo, error: saveErr } = await supabase
                .from('verified_companies')
                .update({
                    industry: data.industry,
                    country: data.country,
                    linkedin_url: data.linkedinCompanyUrl || data.linkedin,
                    description: data.description,
                    headquarters: data.headquarters,
                    founded_year: data.foundedYear,
                    history: data.history,
                    total_employees: data.totalEmployees,
                    employee_segregation: data.employeeSegregation,
                    revenue: data.revenue,
                    tags: data.tags,
                    match_reasoning: data.lsgFitReasoning || data.matchAnalysis,
                    roles_match: data.rolesMatch,
                    relevant_customers: data.relevantCustomers,
                    lsg_fit_score: data.lsgFitScore,
                    outreach_angle: data.outreachAngle,
                    is_target: (data.lsgFitScore || 0) >= 5,
                    last_verified_at: new Date().toISOString()
                })
                .eq('id', company.id)
                .select()
                .single();

            if (savedCo && data.pocs && data.pocs.length > 0) {
                await supabase.from('company_pocs').delete().eq('company_id', company.id);
                const pocsToSave = data.pocs.map((p: any) => ({
                    company_id: company.id,
                    name: p.name,
                    title: p.title,
                    linkedin_url: p.linkedin_url || p.searchUrl,
                    department: p.department,
                    seniority_level: p.seniorityLevel
                }));
                await supabase.from('company_pocs').insert(pocsToSave);
            }

            await fetchVerifiedCompanies();
            alert(`${company.name} updated successfully!`);
        } catch (error) {
            console.error(error);
            alert("Error updating company info.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleNotTarget = async (company: any) => {
        const reason = prompt(`Why is ${company.name} not a target?`);
        if (reason === null) return;

        const { error } = await supabase
            .from('verified_companies')
            .update({
                is_target: false,
                not_target_reason: reason
            })
            .eq('id', company.id);

        if (!error) {
            await fetchVerifiedCompanies();
        } else {
            alert("Error updating status.");
        }
    };

    const handleDelete = async (company: any) => {
        if (!confirm(`Are you sure you want to delete ${company.name}?`)) return;

        const { error } = await supabase
            .from('verified_companies')
            .delete()
            .eq('id', company.id);

        if (!error) {
            setCompanies(prev => prev.filter(c => c.id !== company.id));
        } else {
            alert("Error deleting company.");
        }
    };

    const getStatusBadge = (company: any) => {
        if (company.is_target === null || company.is_target === undefined) {
            return (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 px-3 py-1">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Undefined
                </Badge>
            );
        }
        if (company.is_target) {
            return (
                <Badge variant="default" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 px-3 py-1 shadow-sm font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Qualified Target
                </Badge>
            );
        }
        return (
            <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-slate-200 px-3 py-1 opacity-60">
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Not Target
            </Badge>
        );
    };

    const filtered = companies.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.country?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "target" && c.is_target === true) ||
            (statusFilter === "not-target" && c.is_target === false) ||
            (statusFilter === "undefined" && (c.is_target === null || c.is_target === undefined));

        const matchesPriority = priorityFilter === "all" ||
            (priorityFilter === "hot" && (c.lsg_fit_score ?? 0) >= 8) ||
            (priorityFilter === "warm" && (c.lsg_fit_score ?? 0) >= 5 && (c.lsg_fit_score ?? 0) < 8) ||
            (priorityFilter === "cold" && (c.lsg_fit_score ?? 0) < 5);

        return matchesSearch && matchesStatus && matchesPriority;
    }).sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        switch (sortKey) {
            case "name":
                return dir * (a.name || "").localeCompare(b.name || "");
            case "lsg_fit_score":
                return dir * ((a.lsg_fit_score ?? -1) - (b.lsg_fit_score ?? -1));
            case "revenue": {
                const parseRev = (r: string) => {
                    if (!r) return 0;
                    const num = parseFloat(r.replace(/[^0-9.]/g, ""));
                    if (r.toLowerCase().includes("b")) return num * 1000;
                    return num || 0;
                };
                return dir * (parseRev(a.revenue) - parseRev(b.revenue));
            }
            case "total_employees": {
                const parseEmp = (e: string) => parseInt((e || "0").replace(/[^0-9]/g, "")) || 0;
                return dir * (parseEmp(a.total_employees) - parseEmp(b.total_employees));
            }
            case "contacts":
                return dir * ((a.company_pocs?.length || 0) - (b.company_pocs?.length || 0));
            case "industry":
                return dir * (a.industry || "").localeCompare(b.industry || "");
            case "location":
                return dir * ((a.headquarters || a.country || "").localeCompare(b.headquarters || b.country || ""));
            default:
                return 0;
        }
    });

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Sticky Header Section */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-5 z-20">
                <div className="max-w-7xl mx-auto space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <div className="size-8 bg-[#00A3FF] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Target className="size-4 text-white" />
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Prospecting Queue</h1>
                                <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-[10px] ml-1">{companies.length}</Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 w-full md:w-auto">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                                <Input
                                    placeholder="Search companies..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-8 h-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-200 transition-all"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <XCircle className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                                <SelectTrigger className="h-9 w-40 rounded-xl bg-slate-50 border-slate-200 font-semibold text-xs text-slate-600">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="target">Qualified</SelectItem>
                                    <SelectItem value="not-target">Not Target</SelectItem>
                                    <SelectItem value="undefined">Undefined</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Priority Filter Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            onClick={() => setPriorityFilter(priorityFilter === "hot" ? "all" : "hot")}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                                priorityFilter === "hot"
                                    ? "bg-orange-50 border-orange-200 ring-2 ring-orange-200"
                                    : "bg-white border-slate-200 hover:border-orange-200 hover:bg-orange-50/50"
                            }`}
                        >
                            <div className="size-9 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm">
                                <Flame className="size-4 text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-slate-900 leading-none">{companies.filter(c => (c.lsg_fit_score ?? 0) >= 8).length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mt-0.5">Hot Leads</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setPriorityFilter(priorityFilter === "warm" ? "all" : "warm")}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                                priorityFilter === "warm"
                                    ? "bg-amber-50 border-amber-200 ring-2 ring-amber-200"
                                    : "bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/50"
                            }`}
                        >
                            <div className="size-9 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm">
                                <Zap className="size-4 text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-slate-900 leading-none">{companies.filter(c => (c.lsg_fit_score ?? 0) >= 5 && (c.lsg_fit_score ?? 0) < 8).length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mt-0.5">Warm Leads</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setPriorityFilter(priorityFilter === "cold" ? "all" : "cold")}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                                priorityFilter === "cold"
                                    ? "bg-slate-100 border-slate-300 ring-2 ring-slate-300"
                                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                        >
                            <div className="size-9 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-sm">
                                <XCircle className="size-4 text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-slate-900 leading-none">{companies.filter(c => (c.lsg_fit_score ?? 0) < 5).length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Low Priority</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { setPriorityFilter("all"); setStatusFilter("all"); setSearchTerm(""); }}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                                priorityFilter === "all" && statusFilter === "all" && !searchTerm
                                    ? "bg-blue-50 border-blue-200 ring-2 ring-blue-200"
                                    : "bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/50"
                            }`}
                        >
                            <div className="size-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm">
                                <Building2 className="size-4 text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-slate-900 leading-none">{companies.length}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mt-0.5">All Companies</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-96 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="size-16 rounded-2xl bg-blue-50 flex items-center justify-center animate-pulse">
                                    <Loader2 className="size-8 text-[#00A3FF] animate-spin" />
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Syncing Intelligence...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden mb-20">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                                            {[
                                                { key: "name", label: "Company Name", className: "w-[260px] pl-8", align: "" },
                                                { key: "location", label: "Location", className: "", align: "" },
                                                { key: "industry", label: "Industry", className: "", align: "" },
                                                { key: "lsg_fit_score", label: "Fit Score", className: "", align: "text-center" },
                                                { key: "revenue", label: "Revenue", className: "", align: "" },
                                                { key: "total_employees", label: "Employees", className: "", align: "text-center" },
                                                { key: "contacts", label: "Contacts", className: "", align: "text-center" },
                                            ].map((col) => (
                                                <TableHead
                                                    key={col.key}
                                                    className={`${col.className} py-5 font-bold text-[11px] uppercase tracking-widest cursor-pointer select-none group/th ${col.align} ${sortKey === col.key ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                                    onClick={() => handleSort(col.key)}
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        {col.label}
                                                        {sortKey === col.key ? (
                                                            sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                                                        ) : (
                                                            <ArrowUpDown className="size-3 opacity-0 group-hover/th:opacity-40 transition-opacity" />
                                                        )}
                                                    </span>
                                                </TableHead>
                                            ))}
                                            <TableHead className="py-5 font-bold text-[11px] uppercase tracking-widest text-slate-500">Status</TableHead>
                                            <TableHead className="text-right pr-8 py-5 font-bold text-[11px] uppercase tracking-widest text-slate-500">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((company) => {
                                            const pocs = company.company_pocs || [];
                                            const acceptedCount = pocs.filter((p: any) => p.is_accepted).length;
                                            const score = company.lsg_fit_score ?? 0;
                                            const isHot = score >= 8;
                                            const isWarm = score >= 5 && score < 8;

                                            return (
                                                <TableRow
                                                    key={company.id}
                                                    className={`group transition-colors border-b last:border-0 cursor-pointer ${
                                                        isHot
                                                            ? "bg-orange-50/40 hover:bg-orange-50/70 border-orange-100"
                                                            : "hover:bg-slate-50 border-slate-50"
                                                    }`}
                                                    onClick={() => router.push(`/prospect/${company.id}`)}
                                                >
                                                    <TableCell className="pl-8 py-5">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                {isHot && <Flame className="size-3.5 text-orange-500 shrink-0" />}
                                                                {isWarm && !isHot && <Star className="size-3.5 text-amber-400 shrink-0" />}
                                                                <span className={`font-bold text-sm tracking-tight ${isHot ? "text-slate-900" : "text-slate-900"}`}>{company.name}</span>
                                                                {updatingId === company.id && (
                                                                    <Loader2 className="size-3 text-[#00A3FF] animate-spin" />
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                {company.linkedin_url ? (
                                                                    <a
                                                                        href={company.linkedin_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="text-[#00A3FF] text-[11px] font-semibold hover:underline"
                                                                    >
                                                                        <span className="flex items-center gap-1">
                                                                            <Linkedin className="size-2.5" />
                                                                            {company.website?.replace(/^https?:\/\//, '') || 'LinkedIn'}
                                                                        </span>
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-slate-400 text-[11px] font-medium italic">
                                                                        {company.website?.replace(/^https?:\/\//, '') || 'No website'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
                                                            <MapPin className="size-3 text-slate-300 shrink-0" />
                                                            <span className="truncate max-w-[120px]">{company.headquarters || company.country || "N/A"}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <span className="font-semibold text-slate-600 text-[11px]">
                                                            {company.industry || "N/A"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-5 text-center">
                                                        {company.lsg_fit_score != null ? (
                                                            <Badge className={`px-2 py-0.5 text-[10px] font-bold border shadow-sm ${
                                                                company.lsg_fit_score >= 8
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : company.lsg_fit_score >= 5
                                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    : 'bg-red-50 text-red-600 border-red-200'
                                                            }`}>
                                                                {company.lsg_fit_score}/10
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-300 text-[10px] italic">--</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <span className="text-xs font-semibold text-slate-700">
                                                            {company.revenue || <span className="text-slate-300 italic">--</span>}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-5 text-center">
                                                        <span className="text-xs font-semibold text-slate-700">
                                                            {company.total_employees || <span className="text-slate-300 italic">--</span>}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-5 text-center">
                                                        {pocs.length > 0 ? (
                                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                                acceptedCount > 0
                                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                    : 'bg-slate-50 text-slate-500 border-slate-100'
                                                            }`}>
                                                                <Users className="size-3" />
                                                                {acceptedCount > 0 ? `${acceptedCount}/${pocs.length}` : pocs.length}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 text-[10px] italic">0</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        {getStatusBadge(company)}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8 py-5">
                                                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>


                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0 border-transparent hover:bg-slate-100 rounded-lg">
                                                                        <MoreVertical className="size-4 text-slate-400" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl border-slate-200">
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleUpdate(company)}
                                                                        className="gap-2.5 py-2 px-3 rounded-lg font-semibold text-xs text-slate-700 focus:bg-blue-50 focus:text-blue-600 cursor-pointer"
                                                                    >
                                                                        <RefreshCw className={`size-3.5 ${updatingId === company.id ? 'animate-spin' : ''}`} />
                                                                        Update Info
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleNotTarget(company)}
                                                                        className="gap-2.5 py-2 px-3 rounded-lg font-semibold text-xs text-slate-700 focus:bg-orange-50 focus:text-orange-600 cursor-pointer"
                                                                    >
                                                                        <UserX className="size-3.5" />
                                                                        Not a Target
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="my-1.5" />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDelete(company)}
                                                                        className="gap-2.5 py-2 px-3 rounded-lg font-semibold text-xs text-red-500 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                                                                    >
                                                                        <Trash className="size-3.5" />
                                                                        Delete Record
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {filtered.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={9} className="py-32 text-center">
                                                    <div className="flex flex-col items-center gap-4 text-slate-300">
                                                        <div className="size-20 rounded-full bg-slate-50 flex items-center justify-center border-4 border-white shadow-sm">
                                                            <Target className="size-10 opacity-20" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="font-bold uppercase text-[11px] tracking-[0.2em]">No Intelligence Found</p>
                                                            <p className="text-xs font-medium text-slate-400">Try searching for a different company or verify new ones.</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

