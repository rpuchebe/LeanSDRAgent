"use client";

import * as React from "react";
import {
    Home,
    Search,
    ShieldCheck,
    Briefcase,
    Target,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";

const data = {
    navMain: [
        {
            title: "Navigation",
            items: [
                { name: "Home", href: "/", icon: Home },
                { name: "Prospecting", href: "/prospecting", icon: Search },
                { name: "Formal Customers", href: "/customers", icon: ShieldCheck },
                { name: "Position List", href: "/positions", icon: Briefcase },
            ]
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" className="border-r border-slate-200" {...props}>
            <SidebarHeader className="h-16 border-b border-slate-200 flex items-center px-6">
                <div className="flex items-center gap-3">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                        <Target className="size-5" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-bold text-slate-900 uppercase tracking-tight">LEAN SDR</span>
                        <span className="truncate text-[10px] font-semibold text-blue-500 uppercase tracking-widest leading-none">Intelligence</span>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent className="px-3 py-6">
                {data.navMain.map((group) => (
                    <SidebarGroup key={group.title} className="mb-6 last:mb-0">
                        <SidebarGroupLabel className="px-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarMenu className="gap-0.5">
                            {group.items.map((item) => (
                                <SidebarMenuItem key={item.name}>
                                    <SidebarMenuButton
                                        className="h-10 px-4 rounded-xl font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                                    >
                                        <a href={item.href} className="flex items-center gap-3 w-full">
                                            <item.icon className="size-4 shrink-0" />
                                            <span className="text-sm tracking-tight">{item.name}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-slate-100">
                <div className="flex items-center justify-center gap-2 text-slate-400">
                    <span className="text-[10px] font-medium">Powered by</span>
                    <span className="text-[11px] font-bold text-slate-900 tracking-tighter">LEAN SOLUTIONS</span>
                </div>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
