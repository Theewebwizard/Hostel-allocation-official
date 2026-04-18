import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  Building2,
  Home,
  Users,
  Settings,
  LogOut,
  User,
  LayoutDashboard,
  BedDouble,
  UserPlus,
  ArrowLeftRight,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAuthStore } from "~/lib/auth-store";
import { adminApi, type AllocationPolicy } from "~/lib/api";

interface SidebarProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: SidebarProps) {
  const location = useLocation();
  const { user, logout, checkAuth, isLoading, isAuthenticated } =
    useAuthStore();
  const [allocationPolicy, setAllocationPolicy] =
    useState<AllocationPolicy>("group_based");

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Fetch allocation policy — public endpoint, no auth required
    adminApi
      .getAllocationPolicy()
      .then((res) => setAllocationPolicy(res.data.policy))
      .catch(() => setAllocationPolicy("group_based"));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login handled by route
    return null;
  }

  const isStudent = user?.role === "student";
  const isWarden = user?.role === "warden";
  const isFcfsMode = allocationPolicy === "fcfs";

  const allStudentMenuItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard", alwaysShow: true },
    { href: "/groups", icon: Users, label: "My Group", alwaysShow: false },
    {
      href: "/swaps",
      icon: ArrowLeftRight,
      label: "Room Swaps",
      alwaysShow: true,
    },
    {
      href: "/allocation-result",
      icon: CheckCircle,
      label: "Allocation Result",
      alwaysShow: true,
    },
    {
      href: "/dashboard/profile",
      icon: User,
      label: "Profile",
      alwaysShow: true,
    },
  ];

  const studentMenuItems = allStudentMenuItems.filter(
    (item) => item.alwaysShow || !isFcfsMode,
  );

  const wardenMenuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Admin Dashboard" },
    { href: "/dashboard", icon: Home, label: "Overview" },
  ];

  const menuItems = isWarden ? wardenMenuItems : studentMenuItems;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Hostel System</h1>
              <p className="text-xs text-slate-500 font-bold capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-bold border-r-4 border-indigo-500"
                    : "text-slate-600 hover:bg-slate-100 font-medium"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                <span className="font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* FCFS Policy Banner for students */}
        {isStudent && isFcfsMode && (
          <div className="mx-4 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">FCFS Mode Active</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Group allocation is disabled. Rooms are assigned by application
                order.
              </p>
            </div>
          </div>
        )}

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300">
              <User className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {isStudent ? user?.student?.fullName : user?.email}
              </p>
              <p className="text-xs text-slate-500 font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
