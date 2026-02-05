import { useEffect } from "react";
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
} from "lucide-react";
import { useAuthStore } from "~/lib/auth-store";

interface SidebarProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: SidebarProps) {
  const location = useLocation();
  const { user, logout, checkAuth, isLoading, isAuthenticated } =
    useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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

  const studentMenuItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/dashboard/groups", icon: Users, label: "My Groups" },
    { href: "/dashboard/invitations", icon: UserPlus, label: "Invitations" },
    { href: "/dashboard/profile", icon: User, label: "Profile" },
  ];

  const wardenMenuItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/hostels", icon: Building2, label: "Hostels" },
    { href: "/dashboard/rooms", icon: BedDouble, label: "Rooms" },
    { href: "/dashboard/students", icon: Users, label: "Students" },
    { href: "/dashboard/allocation", icon: Settings, label: "Run Allocation" },
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
              <h1 className="font-bold text-gray-900">Hostel System</h1>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
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
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {isStudent ? user?.student?.fullName : user?.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
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
