import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  Building2,
  Mail,
  Lock,
  User,
  Hash,
  GraduationCap,
  BookOpen,
  Users,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui";
import { useAuthStore } from "~/lib/auth-store";

export function meta() {
  return [
    { title: "Register - Hostel Allocation System" },
    { name: "description", content: "Create a new account" },
  ];
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    isAuthenticated,
    checkAuth,
    isLoading: authLoading,
  } = useAuthStore();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "student" as "student" | "warden",
    rollNumber: "",
    fullName: "",
    year: 1,
    gender: "male" as "male" | "female",
    program: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "year" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        role: formData.role,
        ...(formData.role === "student" && {
          rollNumber: formData.rollNumber,
          fullName: formData.fullName,
          year: formData.year,
          gender: formData.gender,
          program: formData.program,
        }),
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-100 via-white to-purple-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-100 via-white to-purple-100 p-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Hostel Allocation
          </h1>
          <p className="text-slate-600 mt-2 font-medium">Create your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900 text-2xl">Register</CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Fill in your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  I am a
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center text-slate-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={formData.role === "student"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Student
                  </label>
                  <label className="flex items-center text-slate-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="warden"
                      checked={formData.role === "warden"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Warden
                  </label>
                </div>
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  name="password"
                  placeholder="Password (min 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>

              {formData.role === "student" && (
                <>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      name="fullName"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900 font-medium"
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      name="rollNumber"
                      placeholder="Roll Number (e.g., 20BCE1234)"
                      value={formData.rollNumber}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900 font-medium"
                        required
                      >
                        <option value={1}>1st Year</option>
                        <option value={2}>2nd Year</option>
                        <option value={3}>3rd Year</option>
                        <option value={4}>4th Year</option>
                      </select>
                    </div>

                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        name="program"
                        value={formData.program}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-900 font-medium"
                        required
                      >
                        <option value="">Select Program</option>
                        <option value="BTech ECE">BTech ECE</option>
                        <option value="BTech CSE">BTech CSE</option>
                        <option value="BTech CCE">BTech CCE</option>
                        <option value="BTech Mechanical">
                          BTech Mechanical
                        </option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Create Account
              </Button>

               <p className="text-center text-sm text-slate-600 font-medium">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-indigo-600 hover:text-indigo-800 underline font-bold"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
