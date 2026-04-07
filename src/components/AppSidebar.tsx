"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Target,
    Building2,
    Briefcase,
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
            title: "Prospecting",
            items: [
                { name: "Dashboard", href: "/", icon: LayoutDashboard },
                { name: "Prospecting Queue", href: "/prospecting", icon: Target },
            ]
        },
        {
            title: "Management",
            items: [
                { name: "Customers", href: "/customers", icon: Building2 },
                { name: "Positions", href: "/positions", icon: Briefcase },
            ]
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
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
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <SidebarMenuItem key={item.name}>
                                        <SidebarMenuButton
                                            className={`h-10 px-4 rounded-xl transition-all duration-200 ${
                                                isActive
                                                    ? "bg-blue-50 text-blue-600 font-semibold"
                                                    : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            }`}
                                        >
                                            <Link href={item.href} className="flex items-center gap-3 w-full">
                                                <item.icon className="size-4 shrink-0" />
                                                <span className="text-sm tracking-tight">{item.name}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
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
