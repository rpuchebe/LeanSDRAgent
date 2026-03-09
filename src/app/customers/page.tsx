"use client";

import React, { useState, useMemo } from "react";
import {
    Users,
    Search,
    CheckCircle2,
    Building,
    ExternalLink,
    Filter,
    ShieldCheck,
    ChevronDown,
    ChevronRight,
    XCircle,
    Plus,
    Check,
    X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const REPRESENTATIVE_CUSTOMERS = [
    { name: "US Foods", category: "Food & Beverages" },
    { name: "Campbell's", category: "Food & Beverages" },
    { name: "Amazon", category: "Food & Beverages / Retail" },
    { name: "Walmart", category: "Food & Beverages" },
    { name: "RXO", category: "Logistics/3PL" },
    { name: "JB Hunt", category: "Logistics/3PL" },
    { name: "R+L Carriers", category: "Logistics/3PL" },
    { name: "D.B. Schenker", category: "Logistics/3PL" },
    { name: "MNX", category: "Logistics/3PL" },
    { name: "FlexPort", category: "Logistics/3PL" },
    { name: "Maersk", category: "Logistics/3PL" },
    { name: "Arrive", category: "Logistics/3PL" },
    { name: "CH Robinson", category: "Logistics/3PL" },
    { name: "Knight-Swift", category: "Logistics/3PL" },
    { name: "Werner", category: "Logistics/3PL" },
    { name: "GlobalTranz", category: "Logistics/3PL" },
    { name: "Echo", category: "Logistics/3PL" },
    { name: "Ryder", category: "Logistics/3PL" },
    { name: "NTG", category: "Logistics/3PL" },
    { name: "Acrisure", category: "Insurance" },
    { name: "Lineage", category: "Cold Chain" },
    { name: "US Cold Storage", category: "Cold Chain" },
    { name: "TEN", category: "Trucking/Leasing" },
    { name: "Axe Trailers", category: "Trucking/Leasing" },
    { name: "FleetPride", category: "Trucking/Leasing" },
    { name: "City Furniture", category: "Retail" },
    { name: "Ashley Furniture", category: "Retail" },
    { name: "Carvana", category: "Retail" },
    { name: "Project44", category: "Tech" },
    { name: "Wex", category: "Tech" },
    { name: "Priority Technology", category: "Tech" },
    { name: "Friedland & Associates", category: "Law" },
    { name: "Bison Transport", category: "Canada Logistics" },
    { name: "Trimac", category: "Canada Logistics" },
    { name: "Challenger", category: "Canada Logistics" }
];

export default function CustomersPage() {
    const [customers, setCustomers] = useState(REPRESENTATIVE_CUSTOMERS);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
    const [newCustomerName, setNewCustomerName] = useState("");

    const filtered = useMemo(() => {
        return customers.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, customers]);

    const grouped = useMemo(() => {
        const groups: Record<string, typeof REPRESENTATIVE_CUSTOMERS> = {};
        filtered.forEach(c => {
            if (!groups[c.category]) groups[c.category] = [];
            groups[c.category].push(c);
        });
        return groups;
    }, [filtered]);

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleAddCustomer = (category: string) => {
        if (!newCustomerName.trim()) return;

        setCustomers(prev => [
            { name: newCustomerName.trim(), category },
            ...prev
        ]);
        setNewCustomerName("");
        setAddingToCategory(null);
    };

    const categories = Object.keys(grouped).sort();

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Sticky Header Section */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-6 z-20">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="size-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <ShieldCheck className="size-4 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Formal Customers</h1>
                        </div>
                        <p className="text-slate-500 text-[13px] font-medium pl-10">
                            Active portfolio for social proof and niche-specific matching.
                        </p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                            placeholder="Search by company or category..."
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
                </div>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-4">
                    {categories.map((category) => {
                        const isExpanded = expandedCategories.includes(category) || searchTerm !== "";
                        const count = grouped[category].length;

                        return (
                            <div key={category} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-emerald-50 transition-colors">
                                            <Building className="size-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 tracking-tight">{category}</h3>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{count} {count === 1 ? 'Company' : 'Companies'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 ml-auto pr-4" onClick={(e) => e.stopPropagation()}>
                                        {addingToCategory === category ? (
                                            <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-blue-200 shadow-sm animate-in fade-in zoom-in duration-200 w-64">
                                                <Input
                                                    autoFocus
                                                    placeholder="Company name..."
                                                    value={newCustomerName}
                                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleAddCustomer(category);
                                                        if (e.key === 'Escape') setAddingToCategory(null);
                                                    }}
                                                    className="h-8 border-none bg-transparent focus-visible:ring-0 text-sm font-bold placeholder:text-slate-300"
                                                />
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleAddCustomer(category)}
                                                        className="size-7 rounded-lg hover:bg-emerald-50 text-emerald-600"
                                                    >
                                                        <Check className="size-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => setAddingToCategory(null)}
                                                        className="size-7 rounded-lg hover:bg-red-50 text-red-500"
                                                    >
                                                        <X className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setAddingToCategory(category);
                                                    setNewCustomerName("");
                                                }}
                                                className="h-9 px-3 gap-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 font-bold text-[10px] uppercase tracking-wider transition-all"
                                            >
                                                <Plus className="size-3.5" />
                                                Add Company
                                            </Button>
                                        )}
                                    </div>

                                    <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                                        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-2 bg-slate-50/30">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {grouped[category].map((customer, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                                                            <Building className="size-4" />
                                                        </div>
                                                        <span className="font-bold text-sm text-slate-700">{customer.name}</span>
                                                    </div>
                                                    <CheckCircle2 className="size-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {categories.length === 0 && (
                        <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 text-slate-400">
                            <div className="size-20 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200">
                                <Search className="size-10 opacity-30" />
                            </div>
                            <div>
                                <p className="font-bold uppercase text-xs tracking-[0.2em] text-slate-900">No results found</p>
                                <p className="text-sm mt-1">Try adjusting your search terms</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="h-24" />
            </div>
        </div>
    );
}
