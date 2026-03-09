"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    Building2,
    Target,
    CheckCircle2,
    User,
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
    Filter
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
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchVerifiedCompanies();
    }, []);

    const fetchVerifiedCompanies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('verified_companies')
            .select('*, company_pocs(id, is_accepted)')
            .order('name', { ascending: true });

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
                    linkedin_url: data.linkedin,
                    description: data.description,
                    headquarters: data.headquarters,
                    founded_year: data.foundedYear,
                    history: data.history,
                    total_employees: data.totalEmployees,
                    employee_segregation: data.employeeSegregation,
                    revenue: data.revenue,
                    tags: data.tags,
                    match_reasoning: data.matchAnalysis,
                    roles_match: data.rolesMatch,
                    relevant_customers: data.relevantCustomers,
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
                    linkedin_url: p.linkedin_url
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

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Sticky Header Section */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-6 z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="size-8 bg-[#00A3FF] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Target className="size-4 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Prospecting Queue</h1>
                        </div>
                        <p className="text-slate-500 text-[13px] font-medium pl-10">
                            Verified companies in your intelligence database.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input
                                placeholder="Search companies..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-10 h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 transition-all shadow-inner"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                                >
                                    <XCircle className="size-4" />
                                </button>
                            )}
                        </div>

                        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                            <SelectTrigger className="h-11 w-44 rounded-xl bg-slate-50 border-transparent font-semibold text-xs text-slate-600 focus:ring-0 focus:border-blue-200 shadow-inner">
                                <div className="flex items-center gap-2">
                                    <Filter className="size-3.5 text-slate-400" />
                                    <SelectValue placeholder="Status Filter" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="target">Qualified Target</SelectItem>
                                <SelectItem value="not-target">Not a Target</SelectItem>
                                <SelectItem value="undefined">Undefined</SelectItem>
                            </SelectContent>
                        </Select>
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
                                            <TableHead className="w-[300px] pl-8 py-5 font-bold text-[11px] uppercase tracking-widest text-slate-500">Company Name</TableHead>
                                            <TableHead className="py-5 font-bold text-[11px] uppercase tracking-widest text-slate-500">LinkedIn</TableHead>
                                            <TableHead className="py-5 font-bold text-[11px] uppercase tracking-widest text-slate-500">Location</TableHead>
                                            <TableHead className="py-5 font-bold text-[11px] uppercase tracking-widest text-slate-500">Industry</TableHead>
                                            <TableHead className="py-5 font-bold text-[11px] uppercase tracking-widest text-slate-500">Status</TableHead>
                                            <TableHead className="text-right pr-8 py-5 font-bold text-[11px] uppercase tracking-widest text-slate-500">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((company) => {
                                            const pocs = company.company_pocs || [];
                                            const acceptedCount = pocs.filter((p: any) => p.is_accepted).length;

                                            return (
                                                <TableRow
                                                    key={company.id}
                                                    className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer"
                                                    onClick={() => router.push(`/prospect/${company.id}`)}
                                                >
                                                    <TableCell className="pl-8 py-5">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-slate-900 font-bold text-sm tracking-tight">{company.name}</span>
                                                                {updatingId === company.id && (
                                                                    <Loader2 className="size-3 text-[#00A3FF] animate-spin" />
                                                                )}
                                                                {pocs.length > 0 && (
                                                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border ${acceptedCount > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100 italic'}`}>
                                                                            <User className="size-2.5" />
                                                                            {acceptedCount > 0 ? `${acceptedCount}/${pocs.length}` : pocs.length}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[#00A3FF] text-[11px] font-bold uppercase tracking-tight opacity-80">
                                                                    {company.website?.replace(/^https?:\/\//, '')}
                                                                </span>
                                                                <CheckCircle className="size-3 text-[#00A3FF] opacity-50" />
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        {company.linkedin_url ? (
                                                            <a
                                                                href={company.linkedin_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="inline-flex items-center gap-2 bg-blue-50 text-[#00A3FF] px-2.5 py-1.5 rounded-lg hover:bg-blue-100 font-bold text-[10px] uppercase transition-all border border-blue-100"
                                                            >
                                                                <Linkedin className="size-3" />
                                                                Profile
                                                            </a>
                                                        ) : (
                                                            <span className="text-slate-300 text-[10px] italic uppercase font-bold tracking-widest pl-2">Unknown</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-5">
                                                        <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                                                            <MapPin className="size-3.5 text-slate-300" />
                                                            {company.country || "N/A"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5 font-bold text-slate-500 uppercase text-[10px] tracking-widest">
                                                        {company.industry || "N/A"}
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
                                                <TableCell colSpan={6} className="py-32 text-center">
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

