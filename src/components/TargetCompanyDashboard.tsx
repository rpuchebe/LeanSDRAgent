"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import {
    CheckCircle2,
    XCircle,
    Search,
    Building2,
    ExternalLink,
    MapPin,
    Globe,
    Linkedin,
    Trash2,
    Loader2,
    User,
    Sparkles,
    FileUp,
    Target
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import POCViewer from "./POCViewer";

export interface CompanyData {
    id: string;
    name: string;
    industry: string;
    verifiedIndustry?: string;
    country: string;
    verifiedCountry?: string;
    website: string;
    verifiedWebsite?: string;
    linkedin?: string;
    isTarget?: boolean;
    enrichStatus?: "undefined" | "verified" | "error";
    description?: string;
    headquarters?: string;
    foundedYear?: string;
    history?: string;
    totalEmployees?: string;
    employeeSegregation?: Record<string, number>;
    revenue?: string;
    tags?: string[];
    matchAnalysis?: string;
    rolesMatch?: Array<{ role: string; fitLevel: string; estSalary?: string }>;
    relevantCustomers?: string[];
    pocs?: Array<{ id: string; name: string; title: string; linkedinUrl: string; isAccepted: boolean; profilePicUrl?: string }>;
    clickedPocIds?: string[];
}

const TARGET_INDUSTRIES = [
    "logistics",
    "transportation",
    "trucking",
    "supply chain",
    "retail/wholesale",
    "furniture",
    "food & beverages",
    "food manufacturing",
];

export const checkIsTarget = (country: string, industry: string) => {
    const cLower = country?.trim().toLowerCase() || "";
    // Allow partial matches like "United States" or "US"
    const isUS = cLower.includes("united states") ||
        cLower === "us" ||
        cLower === "usa" ||
        cLower.includes("us (") || // handle cases like "US (New York)" if they exist
        cLower === "united statess"; // Handle the typo caught in the CSV sample

    const indLower = industry?.trim().toLowerCase() || "";
    // Target industries from the requirement
    const targetKeywords = [
        "logistics",
        "transport",
        "trucking",
        "supply chain",
        "retail",
        "wholesale",
        "furniture",
        "food"
    ];

    const matchesIndustry = targetKeywords.some((target) => indLower.includes(target));

    return isUS && matchesIndustry;
};

interface DashboardProps {
    companies: CompanyData[];
    enrichingIds: Set<string>;
    onEnrich: (company: CompanyData) => void;
    isPaused: boolean;
    onTogglePause: () => void;
    onUpdateCompany: (company: CompanyData) => void;
}

export default function TargetCompanyDashboard({ companies, enrichingIds, onEnrich, isPaused, onTogglePause, onUpdateCompany }: DashboardProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [industryFilter, setIndustryFilter] = useState<string>("all");

    // Extract unique industries for filter
    const uniqueIndustries = Array.from(new Set(companies.map(c => c.verifiedIndustry || c.industry || "Unknown"))).filter(Boolean).sort();

    const filteredCompanies = companies.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "target" && c.isTarget === true) ||
            (statusFilter === "not-target" && c.isTarget === false) ||
            (statusFilter === "undefined" && c.isTarget === undefined);
        const matchesIndustry = industryFilter === "all" || (c.verifiedIndustry || c.industry) === industryFilter;

        return matchesSearch && matchesStatus && matchesIndustry;
    });

    const targetCount = companies.filter(c => c.isTarget).length;
    const verifiedCount = companies.filter(c => c.enrichStatus === "verified").length;
    const progressPerc = companies.length > 0 ? (verifiedCount / companies.length) * 100 : 0;

    const getStatusBadge = (company: CompanyData) => {
        if (company.isTarget === undefined) {
            return (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 px-3 py-1">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Undefined
                </Badge>
            );
        }
        if (company.isTarget) {
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Overview */}
            {companies.length > 0 ? (
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Intelligence Progress</h3>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    {isPaused ? "Enrichment paused" : "Automatic verification in progress..."}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onTogglePause}
                                    className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900"
                                >
                                    {isPaused ? "Resume" : "Pause"}
                                </Button>
                                <span className="text-sm font-bold text-[#00A3FF]">{Math.round(progressPerc)}%</span>
                            </div>
                        </div>
                        <Progress value={progressPerc} className="h-2 bg-slate-100" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[11px] uppercase font-semibold text-slate-500 tracking-widest mb-1">Total Leads</p>
                                <p className="text-2xl font-bold text-slate-900">{companies.length}</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <p className="text-[11px] uppercase font-semibold text-emerald-600 tracking-widest mb-1">Qualified Targets</p>
                                <p className="text-2xl font-bold text-emerald-700">{targetCount}</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <p className="text-[11px] uppercase font-semibold text-blue-600 tracking-widest mb-1">Verified</p>
                                <p className="text-2xl font-bold text-blue-700">{verifiedCount}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[11px] uppercase font-semibold text-slate-500 tracking-widest mb-1">Target Ratio</p>
                                <p className="text-2xl font-bold text-slate-900">{companies.length > 0 ? Math.round((targetCount / companies.length) * 100) : 0}%</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h3 className="font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2 shrink-0">
                                <Target className="w-5 h-5 text-blue-500" />
                                Active Prospecting Queue
                            </h3>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                                    <Input
                                        placeholder="Search companies..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-8 h-9 text-xs rounded-xl border-slate-200 bg-slate-50/50"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <span className="text-sm">×</span>
                                        </button>
                                    )}
                                </div>

                                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                                    <SelectTrigger className="w-36 h-9 text-xs rounded-xl border-slate-200 bg-slate-50/50">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="target">Qualified</SelectItem>
                                        <SelectItem value="not-target">Not Target</SelectItem>
                                        <SelectItem value="undefined">Undefined</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={industryFilter} onValueChange={(val) => setIndustryFilter(val || "all")}>
                                    <SelectTrigger className="w-44 h-9 text-xs rounded-xl border-slate-200 bg-slate-50/50">
                                        <SelectValue placeholder="Industry" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Industries</SelectItem>
                                        {uniqueIndustries.map(ind => (
                                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent border-b border-slate-100">
                                        <TableHead className="w-[300px] pl-6 py-4 font-bold text-[11px] uppercase tracking-widest text-slate-500">Company Name</TableHead>
                                        <TableHead className="py-4 font-bold text-[11px] uppercase tracking-widest text-slate-500">LinkedIn</TableHead>
                                        <TableHead className="py-4 font-bold text-[11px] uppercase tracking-widest text-slate-500">Location</TableHead>
                                        <TableHead className="py-4 font-bold text-[11px] uppercase tracking-widest text-slate-500">Industry</TableHead>
                                        <TableHead className="py-4 font-bold text-[11px] uppercase tracking-widest text-slate-500">Status</TableHead>
                                        <TableHead className="text-right pr-6 py-4 font-bold text-[11px] uppercase tracking-widest text-slate-500">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCompanies.map((company) => {
                                        const hasPocs = company.pocs && company.pocs.length > 0;
                                        const clickedCount = company.clickedPocIds?.length || 0;
                                        const allClicked = hasPocs && clickedCount >= (company.pocs?.length || 0);
                                        const someClicked = clickedCount > 0;

                                        return (
                                            <TableRow
                                                key={company.id}
                                                className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer"
                                                onClick={() => window.location.href = `/prospect/${company.id}`}
                                            >
                                                <TableCell className="pl-6 py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-900 font-semibold text-sm">{company.name}</span>
                                                            {enrichingIds.has(company.id) && (
                                                                <Loader2 className="w-3 h-3 text-[#00A3FF] animate-spin" />
                                                            )}
                                                            {hasPocs && (
                                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                    {clickedCount > 0 && (
                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-500/5">
                                                                            <User className="w-2.5 h-2.5" />
                                                                            {clickedCount}
                                                                        </div>
                                                                    )}
                                                                    {((company.pocs?.length || 0) - clickedCount) > 0 && (
                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border bg-slate-50 text-slate-400 border-slate-100 italic">
                                                                            <User className="w-2.5 h-2.5" />
                                                                            {(company.pocs?.length || 0) - clickedCount}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <span className={`text-[11px] font-medium transition-colors ${company.verifiedWebsite ? 'text-[#00A3FF]' : 'text-slate-400 italic'}`}>
                                                                {company.verifiedWebsite || company.website || "No website"}
                                                            </span>
                                                            {company.verifiedWebsite && <CheckCircle2 className="w-2.5 h-2.5 text-[#00A3FF]" />}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {company.linkedin && company.linkedin.includes('linkedin.com') ? (
                                                        <a
                                                            href={company.linkedin}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="inline-flex items-center gap-1.5 bg-blue-50 text-[#00A3FF] px-2 py-1 rounded-md hover:bg-blue-100 font-bold text-[10px] uppercase transition-all border border-blue-100"
                                                        >
                                                            <Linkedin className="w-3 h-3" />
                                                            Profile
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400 text-[10px] italic opacity-50 uppercase font-semibold">Unknown</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 font-semibold text-slate-600 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-300" />
                                                        <span className={company.verifiedCountry ? "text-slate-900 font-bold" : ""}>
                                                            {company.verifiedCountry || company.country || "Unknown"}
                                                        </span>
                                                        {company.verifiedCountry && <CheckCircle2 className="w-3 h-3 text-[#00A3FF]" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 font-semibold text-slate-600 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={company.verifiedIndustry ? "text-slate-900 font-bold" : ""}>
                                                            {company.verifiedIndustry || company.industry || "N/A"}
                                                        </span>
                                                        {company.verifiedIndustry && <CheckCircle2 className="w-3 h-3 text-[#00A3FF]" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {getStatusBadge(company)}
                                                </TableCell>
                                                <TableCell className="text-right pr-6 py-4">
                                                    <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => window.location.href = `/prospect/${company.id}`}
                                                            className="h-9 px-4 bg-[#00A3FF] hover:bg-blue-600 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-sm shadow-blue-500/10 transition-all"
                                                        >
                                                            Prospect
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <FileUp className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Prospect?</h2>
                    <p className="text-slate-500 max-w-sm mb-8 font-medium">Upload your HubSpot export in the header to identify high-value targets in real-time.</p>
                </div>
            )}
        </div>
    );
}
