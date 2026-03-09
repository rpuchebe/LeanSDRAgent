"use client";

import React, { useState, useEffect } from "react";
import {
    Plus,
    Trash2,
    Edit2,
    Briefcase,
    DollarSign,
    Check,
    X,
    Loader2,
    LayoutGrid,
    Search,
    XCircle,
    Filter
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Position {
    id: string;
    role_name: string;
    fit_description: string;
    estimated_salary_range: string;
}

const SEED_POSITIONS = [
    { role_name: 'Customer Reps', fit_description: 'Main point of contact for clients, managing inquiries and orders.', estimated_salary_range: '$40k - $60k' },
    { role_name: 'Dispatchers', fit_description: 'Coordinating drivers and equipment to ensure timely deliveries.', estimated_salary_range: '$45k - $65k' },
    { role_name: 'Logistics Coordinators', fit_description: 'Overseeing complex movements and identifying optimization opportunities.', estimated_salary_range: '$50k - $75k' },
    { role_name: 'Track and Trace', fit_description: 'Real-time monitoring of shipments and exception management.', estimated_salary_range: '$35k - $50k' },
    { role_name: 'Carrier Sales', fit_description: 'Building and managing relationships with transportation partners.', estimated_salary_range: '$50k - $80k' },
    { role_name: 'Accounts Payable/Receivable', fit_description: 'Managing financial transactions and ensuring billing accuracy.', estimated_salary_range: '$45k - $65k' },
    { role_name: 'Billing Specialist', fit_description: 'Processing invoices and managing billing cycles.', estimated_salary_range: '$40k - $55k' },
    { role_name: 'Collections', fit_description: 'Managing outstanding receivables and ensuring timely payments.', estimated_salary_range: '$40k - $55k' },
    { role_name: 'Customs Compliance', fit_description: 'Ensuring all movements adhere to regulatory and legal requirements.', estimated_salary_range: '$60k - $90k' }
];

export default function PositionsPage() {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newPosition, setNewPosition] = useState({
        role_name: "",
        fit_description: "",
        estimated_salary_range: ""
    });
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchPositions();
    }, []);

    const fetchPositions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('lsg_positions')
                .select('*')
                .order('role_name', { ascending: true });

            if (data && data.length > 0) {
                setPositions(data);
            } else {
                // If DB is empty, use seed data and try to save it
                setPositions(SEED_POSITIONS.map((p, i) => ({ ...p, id: `temp-${i}` } as Position)));

                const { data: seededData } = await supabase
                    .from('lsg_positions')
                    .insert(SEED_POSITIONS)
                    .select();

                if (seededData) {
                    setPositions(seededData.sort((a, b) => a.role_name.localeCompare(b.role_name)));
                }
            }
        } catch (err) {
            console.error("Error fetching positions:", err);
            setPositions(SEED_POSITIONS.map((p, i) => ({ ...p, id: `temp-${i}` } as Position)));
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newPosition.role_name) return;
        const { data, error } = await supabase
            .from('lsg_positions')
            .insert([newPosition])
            .select()
            .single();

        if (data) {
            setPositions(prev => [...prev, data].sort((a, b) => a.role_name.localeCompare(b.role_name)));
            setNewPosition({ role_name: "", fit_description: "", estimated_salary_range: "" });
            setShowAddForm(false);
        }
    };

    const handleUpdate = async (id: string, updatedFields: Partial<Position>) => {
        const { error } = await supabase
            .from('lsg_positions')
            .update(updatedFields)
            .eq('id', id);

        if (!error) {
            setPositions(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
            setEditingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this position?")) return;
        const { error } = await supabase
            .from('lsg_positions')
            .delete()
            .eq('id', id);

        if (!error) {
            setPositions(prev => prev.filter(p => p.id !== id));
        }
    };

    const filteredPositions = positions.filter(pos =>
        pos.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pos.fit_description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Sticky Header Section */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-6 z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="size-8 bg-[#00A3FF] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Briefcase className="size-4 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Position Inventory</h1>
                        </div>
                        <p className="text-slate-500 text-[13px] font-medium pl-10">
                            Manage types of roles and expertise you provide.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                            <Input
                                placeholder="Search positions..."
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

                        <Button
                            onClick={() => setShowAddForm(true)}
                            className="bg-[#00A3FF] hover:bg-blue-600 text-white rounded-xl h-11 px-6 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/10 shrink-0"
                        >
                            <Plus className="size-4 mr-2" />
                            Add Position
                        </Button>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-6">

                    {showAddForm && (
                        <Card className="rounded-[2.5rem] border-blue-100 bg-blue-50/30 shadow-sm animate-in slide-in-from-top-4 duration-300">
                            <CardContent className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Role Name</label>
                                        <Input
                                            placeholder="e.g. Customs Compliance"
                                            value={newPosition.role_name}
                                            onChange={e => setNewPosition({ ...newPosition, role_name: e.target.value })}
                                            className="rounded-xl border-slate-200 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Salary Range</label>
                                        <Input
                                            placeholder="e.g. $60k - $85k"
                                            value={newPosition.estimated_salary_range}
                                            onChange={e => setNewPosition({ ...newPosition, estimated_salary_range: e.target.value })}
                                            className="rounded-xl border-slate-200 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Description</label>
                                        <Input
                                            placeholder="Brief fit analysis..."
                                            value={newPosition.fit_description}
                                            onChange={e => setNewPosition({ ...newPosition, fit_description: e.target.value })}
                                            className="rounded-xl border-slate-200 bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button variant="ghost" onClick={() => setShowAddForm(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
                                    <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest">Save Position</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center h-64 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <Loader2 className="size-8 text-blue-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredPositions.map((pos) => (
                                <div key={pos.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                                    {editingId === pos.id ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <Input defaultValue={pos.role_name} id={`name-${pos.id}`} className="rounded-xl" />
                                                <Input defaultValue={pos.estimated_salary_range} id={`sal-${pos.id}`} className="rounded-xl" />
                                                <Input defaultValue={pos.fit_description} id={`desc-${pos.id}`} className="rounded-xl" />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="rounded-lg h-8"><X className="size-4" /></Button>
                                                <Button size="sm" onClick={() => {
                                                    const role_name = (document.getElementById(`name-${pos.id}`) as HTMLInputElement).value;
                                                    const estimated_salary_range = (document.getElementById(`sal-${pos.id}`) as HTMLInputElement).value;
                                                    const fit_description = (document.getElementById(`desc-${pos.id}`) as HTMLInputElement).value;
                                                    handleUpdate(pos.id, { role_name, estimated_salary_range, fit_description });
                                                }} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8 px-4 font-bold uppercase text-[9px]">Save</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex items-center gap-5">
                                                <div className="size-12 rounded-[1.2rem] bg-slate-50 flex items-center justify-center shrink-0">
                                                    <LayoutGrid className="size-5 text-slate-400" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{pos.role_name}</h3>
                                                    <p className="text-sm text-slate-500 font-medium italic">{pos.fit_description}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">Est. US Rate</span>
                                                    <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                                                        <DollarSign className="size-3.5" />
                                                        <span className="text-sm">{pos.estimated_salary_range}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setEditingId(pos.id)}
                                                        className="size-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all p-0"
                                                    >
                                                        <Edit2 className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(pos.id)}
                                                        className="size-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all p-0"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="h-24" />
            </div>
        </div>
    );
}
