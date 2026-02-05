import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  Users,
  BedDouble,
  ClipboardCheck,
  TrendingUp,
  Clock,
  UserCheck,
} from "lucide-react";
import { DashboardLayout } from "~/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui";
import { useAuthStore } from "~/lib/auth-store";

export function meta() {
  return [
    { title: "Dashboard - Hostel Allocation System" },
    { name: "description", content: "Dashboard overview" },
  ];
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardContent className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentDashboard() {
  const { user } = useAuthStore();
  const student = user?.student;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {student?.fullName || "Student"}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Here's an overview of your hostel allocation status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Users}
          label="My Groups"
          value={0}
          color="bg-blue-500"
        />
        <StatCard
          icon={UserCheck}
          label="Pending Invitations"
          value={0}
          color="bg-amber-500"
        />
        <StatCard
          icon={BedDouble}
          label="Room Allocation"
          value="Pending"
          color="bg-purple-500"
        />
        <StatCard
          icon={Clock}
          label="Year"
          value={`${student?.year || 1}${getOrdinalSuffix(student?.year || 1)} Year`}
          color="bg-green-500"
        />
      </div>

      {/* Student Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Roll Number</span>
                <span className="font-medium">
                  {student?.rollNumber || "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Full Name</span>
                <span className="font-medium">
                  {student?.fullName || "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Year</span>
                <span className="font-medium">
                  {student?.year
                    ? `${student.year}${getOrdinalSuffix(student.year)} Year`
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Program</span>
                <span className="font-medium">{student?.program || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a
                href="/dashboard/groups"
                className="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Users className="w-6 h-6 text-indigo-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    Create or Join Groups
                  </p>
                  <p className="text-sm text-gray-500">
                    Form groups with your friends
                  </p>
                </div>
              </a>
              <a
                href="/dashboard/invitations"
                className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <ClipboardCheck className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-medium text-gray-900">Check Invitations</p>
                  <p className="text-sm text-gray-500">
                    View pending group invitations
                  </p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function WardenDashboard() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard 🏠</h1>
        <p className="text-gray-600 mt-1">
          Manage hostels, rooms, and allocations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Building2}
          label="Total Hostels"
          value={0}
          color="bg-indigo-500"
        />
        <StatCard
          icon={BedDouble}
          label="Total Rooms"
          value={0}
          color="bg-blue-500"
        />
        <StatCard
          icon={Users}
          label="Registered Students"
          value={0}
          color="bg-green-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Allocation Rate"
          value="0%"
          color="bg-purple-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a
                href="/dashboard/hostels"
                className="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Building2 className="w-6 h-6 text-indigo-600" />
                <div>
                  <p className="font-medium text-gray-900">Manage Hostels</p>
                  <p className="text-sm text-gray-500">
                    Add, edit, or remove hostels
                  </p>
                </div>
              </a>
              <a
                href="/dashboard/rooms"
                className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <BedDouble className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Manage Rooms</p>
                  <p className="text-sm text-gray-500">
                    Configure room details and availability
                  </p>
                </div>
              </a>
              <a
                href="/dashboard/allocation"
                className="flex items-center gap-3 p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
              >
                <ClipboardCheck className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Run Allocation</p>
                  <p className="text-sm text-gray-500">
                    Execute the allocation algorithm
                  </p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm">Activity log will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {user?.role === "warden" ? <WardenDashboard /> : <StudentDashboard />}
      </div>
    </DashboardLayout>
  );
}
