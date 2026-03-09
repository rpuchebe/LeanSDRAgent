"use client";

import React, { useState } from "react";
import { ExternalLink, Copy, Check, Plus, Search, User, Building2, Sparkles } from "lucide-react";
import { CompanyData } from "./TargetCompanyDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface POCViewerProps {
    company: CompanyData | null;
    onClose: () => void;
}

interface POC {
    id: string;
    name: string;
    title: string;
    linkedinUrl: string;
    suggestedEmail?: string;
}

export default function POCViewer({ company, onClose }: POCViewerProps) {
    const [pocs, setPocs] = useState<POC[]>([]);
    const [newName, setNewName] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [newLinkedin, setNewLinkedin] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    if (!company) return null;

    const salesNavUrl = `https://www.linkedin.com/sales/search/people?query=(keywords%3A${encodeURIComponent(company.name)})`;

    const handleAddPoc = async () => {
        if (!newName.trim() || !newTitle.trim()) return;

        setIsGenerating(true);
        try {
            const res = await fetch("/api/emails/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName: company.name,
                    industry: company.industry,
                    pocName: newName,
                    pocTitle: newTitle,
                }),
            });

            if (!res.ok) throw new Error("Failed");
            const data = await res.json();

            const newPoc: POC = {
                id: Math.random().toString(),
                name: newName,
                title: newTitle,
                linkedinUrl: newLinkedin,
                suggestedEmail: data.email
            };

            setPocs([...pocs, newPoc]);
            setNewName("");
            setNewTitle("");
            setNewLinkedin("");
        } catch (error) {
            console.error(error);
            alert("Email generation failed. Make sure OpenAI API key is configured.");
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <Dialog open={!!company} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl overflow-hidden">
                <div className="bg-[#00A3FF] p-8 text-white relative">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black flex items-center gap-3">
                            <Building2 className="w-8 h-8 opacity-80" />
                            {company.name}
                        </DialogTitle>
                        <DialogDescription className="text-blue-100 text-lg opacity-90 font-medium">
                            Decision-maker discovery and personalized outreach generation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="absolute top-8 right-8">
                        <Button
                            variant="secondary"
                            className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md font-bold"
                            onClick={() => window.open(salesNavUrl, "_blank")}
                        >
                            <Search className="w-4 h-4 mr-2" />
                            Open SalesNav
                        </Button>
                    </div>
                </div>

                <div className="p-8 space-y-8 bg-slate-50/50">
                    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-sm text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-blue-500" /> Add New POC Record
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                                <Input
                                    placeholder="e.g. Jane Doe"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500 h-10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Job Title</label>
                                <Input
                                    placeholder="e.g. VP of Supply Chain"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500 h-10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">LinkedIn Link</label>
                                <Input
                                    placeholder="Paste URL..."
                                    value={newLinkedin}
                                    onChange={(e) => setNewLinkedin(e.target.value)}
                                    className="bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500 h-10"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleAddPoc}
                            disabled={!newName.trim() || !newTitle.trim() || isGenerating}
                            className="w-full bg-[#00A3FF] hover:bg-blue-600 font-bold h-11 text-base shadow-lg shadow-blue-500/20"
                        >
                            {isGenerating ? "Analyzing & Drafting..." : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Capture POC & Generate Personalized Email
                                </>
                            )}
                        </Button>
                    </section>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">Identified Stakeholders</h3>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{pocs.length} Found</span>
                        </div>

                        {pocs.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <User className="w-10 h-10 text-slate-300 dark:text-slate-600 shadow-inner" />
                                </div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">No POCs added for this account</p>
                                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Use the Sales Navigator search to find relevant people and add them using the form above.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {pocs.map((poc) => (
                                    <div key={poc.id} className="group border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300">
                                        <div className="bg-slate-50/50 dark:bg-slate-900 px-6 py-5 flex justify-between items-center group-hover:bg-blue-50/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-[#00A3FF] font-black text-xl shadow-sm">
                                                    {poc.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-lg text-slate-900 dark:text-slate-100 leading-tight">{poc.name}</h4>
                                                    <p className="text-slate-500 text-sm font-medium">{poc.title}</p>
                                                </div>
                                            </div>
                                            {poc.linkedinUrl && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="bg-white border text-blue-600 hover:bg-blue-50 font-bold shadow-sm"
                                                    onClick={() => window.open(poc.linkedinUrl, "_blank")}
                                                >
                                                    <ExternalLink className="w-4 h-4 mr-2" /> LinkedIn
                                                </Button>
                                            )}
                                        </div>
                                        {poc.suggestedEmail && (
                                            <div className="p-6 relative">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="font-bold text-xs text-slate-400 uppercase tracking-widest">Personalized Outreach Draft</p>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(poc.suggestedEmail!, poc.id)}
                                                        className="h-8 text-blue-600 hover:bg-blue-50 group-hover:opacity-100 transition-all font-bold"
                                                    >
                                                        {copiedId === poc.id ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                                        {copiedId === poc.id ? "Copied!" : "Copy Email"}
                                                    </Button>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed shadow-inner">
                                                    {poc.suggestedEmail}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t bg-white dark:bg-slate-900 flex justify-end">
                    <Button variant="outline" onClick={onClose} className="rounded-xl px-8 font-bold text-slate-500">Close Portal</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
