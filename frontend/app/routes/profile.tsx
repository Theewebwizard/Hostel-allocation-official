import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { User, Mail, BookOpen, Building2, Calendar } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "~/components/ui";
import { DashboardLayout } from "~/components/layout/DashboardLayout";
import { useAuthStore } from "~/lib/auth-store";

export function meta() {
  return [
    { title: "Profile - Hostel Allocation System" },
    { name: "description", content: "View and manage your profile" },
  ];
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    } else if (!isLoading && user?.role !== "student") {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const student = user?.student;

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">
            View and manage your personal information
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>Your basic profile details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-3xl font-bold text-indigo-600">
                  {student?.fullName?.charAt(0) || "S"}
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {student?.fullName || "N/A"}
                </p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Roll Number */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <BookOpen className="w-4 h-4" />
                  Roll Number
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 font-medium">
                    {student?.rollNumber || "N/A"}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 font-medium">{user?.email}</p>
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4" />
                  Year of Study
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 font-medium">
                    {student?.year
                      ? `${student.year}${getOrdinalSuffix(student.year)} Year`
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Program */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="w-4 h-4" />
                  Program
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 font-medium">
                    {student?.program || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              How we can reach you regarding your allocation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Primary Email</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <Mail className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Account Status</p>
                <p className="text-sm text-gray-500">Your account is active</p>
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Active
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
